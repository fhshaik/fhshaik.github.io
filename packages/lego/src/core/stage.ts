import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { STUDIO_THEME, type LegoTheme } from "../tokens/theme";
import { partGeometry } from "./geometry";
import { ghostMaterial, partMaterial } from "./materials";
import { placementMatrix, resolveBrick, type BrickPlacement, type ResolvedBrick } from "./brick";

/** Camera placement in orbit terms, used by {@link LegoStage.setView}. */
export interface OrbitView {
  /** Radians around the vertical axis. */
  azimuth: number;
  /** Radians above the horizon. */
  elevation: number;
  distance: number;
  target: THREE.Vector3;
}

export interface BuildInOptions {
  /** Fall time per brick, in ms. Defaults to 520. */
  duration?: number;
  /** Delay between consecutive bricks, in ms. Defaults to 9. */
  stagger?: number;
  /** Drop height in stud units. Defaults to 7. */
  drop?: number;
  /** Skip the animation under `prefers-reduced-motion`. Defaults to true. */
  respectReducedMotion?: boolean;
}

interface BuildInState extends Required<Omit<BuildInOptions, "respectReducedMotion">> {
  order: string[];
  startedAt: number;
  lastTime: number;
}

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Overshoot easing — the small bounce as a brick seats onto a stud. */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function radialDistance(brick: { position: [number, number, number] }): number {
  return Math.hypot(brick.position[0], brick.position[2]);
}

/** Bricks sharing a batch key are drawn as one InstancedMesh above this count. */
const INSTANCE_THRESHOLD = 4;
/** How far a highlighted brick lifts, in stud units. */
const HIGHLIGHT_LIFT = 0.18;

export interface LegoStageOptions {
  theme?: LegoTheme;
  /** Scene background. Defaults to the theme's `scene` colour. */
  background?: string | null;
  /** Image-based lighting for plastic highlights. Defaults to true. */
  environment?: boolean;
  shadows?: boolean;
  /** Ground shadow-catcher plane. Defaults to true. */
  ground?: boolean;
  orbit?: boolean;
  /**
   * Near-orthographic framing: a narrow lens from a fixed high angle, the
   * classic city-builder look. Locks the vertical orbit range.
   */
  isometric?: boolean;
  /**
   * `"studio"` is crisp and neutral; `"cosy"` is warmer and softer, with a
   * gentler key-to-fill ratio.
   */
  lighting?: "studio" | "cosy";
  /**
   * Atmospheric depth — distant parts fade into the background colour. Range is
   * derived from the framed distance, so it works at any scene scale.
   */
  fog?: boolean;
  /** Slow turntable spin, in degrees per second. 0 disables it. */
  autoRotate?: number;
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  fov?: number;
  maxPixelRatio?: number;
}

export interface LegoPickEvent {
  id: string;
  placement: BrickPlacement;
  data: unknown;
  point: THREE.Vector3;
}

interface Batch {
  key: string;
  object: THREE.InstancedMesh | THREE.Mesh;
  ids: string[];
}

type Listener<T> = (event: T) => void;

/**
 * Owns the renderer, camera, lights and brick batches for one canvas.
 *
 * Framework-agnostic on purpose — the React layer in `@fhshaik/lego/react` is a
 * thin wrapper, and this class can be driven directly from vanilla JS.
 */
export class LegoStage {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls?: OrbitControls;
  /** Rotated by `autoRotate`. Its origin is the turntable axis. */
  readonly root = new THREE.Group();
  /**
   * Holds the actual bricks. Offsetting this — rather than `root` — is what
   * lets a build whose grid starts at (0,0) still rotate about its own centre
   * instead of orbiting the origin.
   */
  private readonly content = new THREE.Group();

  private readonly container: HTMLElement;
  private readonly options: Required<Omit<LegoStageOptions, "theme" | "background">> & {
    theme: LegoTheme;
    background: string | null;
  };
  private readonly placements = new Map<string, ResolvedBrick>();
  private readonly batches = new Map<string, Batch>();
  /** id -> where that brick lives in a batch, so motion can target it. */
  private readonly index = new Map<string, { batch: Batch; instance: number }>();
  private animation: BuildInState | null = null;
  /** Where the camera is now, and where it is easing toward. */
  private view: OrbitView | null = null;
  private viewTarget: OrbitView | null = null;
  private viewSmoothing = 0.085;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly pickListeners = new Set<Listener<LegoPickEvent | null>>();
  private readonly hoverListeners = new Set<Listener<LegoPickEvent | null>>();

  private environmentTexture?: THREE.Texture;
  private ground?: THREE.Mesh;
  private frame = 0;
  private dirty = true;
  private disposed = false;
  private highlighted: string | null = null;
  private hovered: string | null = null;
  private resizeObserver?: ResizeObserver;
  /** Screen-space frustum shift, as a fraction of the viewport. */
  private frameShift = { x: 0, y: 0 };
  private clock = new THREE.Clock();

  constructor(container: HTMLElement, options: LegoStageOptions = {}) {
    this.container = container;
    const theme = options.theme ?? STUDIO_THEME;
    this.options = {
      theme,
      background: options.background === undefined ? theme.scene : options.background,
      environment: options.environment ?? true,
      shadows: options.shadows ?? true,
      ground: options.ground ?? true,
      orbit: options.orbit ?? true,
      isometric: options.isometric ?? false,
      lighting: options.lighting ?? "studio",
      fog: options.fog ?? false,
      autoRotate: options.autoRotate ?? 0,
      cameraPosition:
        options.cameraPosition ?? (options.isometric ? [40, 34, 40] : [14, 11, 16]),
      cameraTarget: options.cameraTarget ?? [0, 1.5, 0],
      fov: options.fov ?? (options.isometric ? 15 : 32),
      maxPixelRatio: options.maxPixelRatio ?? 1.75,
    };

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !this.options.background });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, this.options.maxPixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = this.options.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.touchAction = "none";
    container.appendChild(this.renderer.domElement);

    if (this.options.background) {
      this.scene.background = new THREE.Color(this.options.background);
    }

    this.camera = new THREE.PerspectiveCamera(this.options.fov, 1, 0.1, 400);
    this.camera.position.set(...this.options.cameraPosition);

    this.root.add(this.content);
    this.scene.add(this.root);
    this.setupLighting();

    if (this.options.orbit) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enablePan = false;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      if (this.options.isometric) {
        // Hold the camera at the city-builder elevation; orbiting stays
        // horizontal so the skyline never tips over.
        const angle = Math.PI * 0.28;
        this.controls.minPolarAngle = angle;
        this.controls.maxPolarAngle = angle;
      } else {
        this.controls.minPolarAngle = Math.PI * 0.08;
        this.controls.maxPolarAngle = Math.PI * 0.49;
      }
      this.controls.target.set(...this.options.cameraTarget);
      this.controls.addEventListener("change", this.markDirty);
    } else {
      this.camera.lookAt(new THREE.Vector3(...this.options.cameraTarget));
    }

    this.observeResize();
    this.bindPointer();
    this.resize();
    this.start();
  }

  // --- lighting -----------------------------------------------------------

  private setupLighting(): void {
    const cosy = this.options.lighting === "cosy";

    this.scene.add(
      new THREE.HemisphereLight(
        cosy ? 0xfff2e0 : 0xffffff,
        cosy ? 0x8a7563 : 0x6f6357,
        cosy ? 2.1 : 1.6,
      ),
    );

    const key = new THREE.DirectionalLight(cosy ? 0xffe6bd : 0xfff3dd, cosy ? 2.1 : 2.6);
    key.position.set(-9, 15, 9);
    key.castShadow = this.options.shadows;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0009;
    key.shadow.normalBias = 0.02;
    const shadowCamera = key.shadow.camera;
    shadowCamera.left = -18;
    shadowCamera.right = 18;
    shadowCamera.top = 18;
    shadowCamera.bottom = -18;
    shadowCamera.near = 0.5;
    shadowCamera.far = 60;
    shadowCamera.updateProjectionMatrix();
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(cosy ? 0xffd9e8 : 0xdfe9ff, cosy ? 1.0 : 0.7);
    fill.position.set(8, 6, -10);
    this.scene.add(fill);

    if (cosy) this.renderer.toneMappingExposure = 1.2;

    if (this.options.environment) {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.environmentTexture = pmrem.fromScene(room, 0.05).texture;
      this.scene.environment = this.environmentTexture;
      this.scene.environmentIntensity = 0.45;
      room.dispose?.();
      pmrem.dispose();
    }

    if (this.options.ground && this.options.shadows) {
      this.ground = new THREE.Mesh(
        new THREE.PlaneGeometry(160, 160),
        new THREE.ShadowMaterial({
          color: 0x2f2a24,
          opacity: this.options.lighting === "cosy" ? 0.13 : 0.2,
        }),
      );
      this.ground.rotation.x = -Math.PI / 2;
      this.ground.position.y = -0.002;
      this.ground.receiveShadow = true;
      this.scene.add(this.ground);
    }
  }

  // --- brick graph --------------------------------------------------------

  /** Adds or replaces a placement. Batches rebuild on the next frame. */
  set(placement: BrickPlacement): void {
    this.placements.set(placement.id, resolveBrick(placement));
    this.invalidate();
  }

  /** Adds many placements in one go. */
  setAll(placements: readonly BrickPlacement[]): void {
    for (const placement of placements) {
      this.placements.set(placement.id, resolveBrick(placement));
    }
    this.invalidate();
  }

  /**
   * Updates only the payload handed back on pick/hover. Deliberately does not
   * trigger a rebuild, so an inline `data={{...}}` prop is cheap.
   */
  setData(id: string, data: unknown): void {
    const brick = this.placements.get(id);
    if (brick) brick.data = data;
  }

  remove(id: string): void {
    if (this.placements.delete(id)) this.invalidate();
  }

  clear(): void {
    this.placements.clear();
    this.invalidate();
  }

  get bricks(): readonly ResolvedBrick[] {
    return [...this.placements.values()];
  }

  /** Adds an arbitrary object (e.g. a loaded LDraw model) alongside the bricks. */
  addObject(object: THREE.Object3D): void {
    this.content.add(object);
    this.markDirty();
  }

  removeObject(object: THREE.Object3D): void {
    this.content.remove(object);
    this.markDirty();
  }

  /**
   * Shifts the bricks within the turntable. Pass half the build's extent
   * negated to centre a build authored from the grid origin:
   * `setContentOffset(-width / 2, 0, -depth / 2)`.
   */
  setContentOffset(x: number, y: number, z: number): void {
    this.content.position.set(x, y, z);
    this.content.updateMatrixWorld(true);
    this.markDirty();
  }

  private readonly updaters = new Set<(delta: number) => void>();

  /**
   * Registers a per-frame callback, receiving seconds since the last frame.
   *
   * While any updater is registered the stage renders continuously rather than
   * on demand — that is the point, but do not leave one attached for a static
   * scene. Returns an unsubscribe function.
   */
  addUpdater(update: (delta: number) => void): () => void {
    this.updaters.add(update);
    this.markDirty();
    return () => {
      this.updaters.delete(update);
    };
  }

  private rebuildScheduled = false;

  private invalidate(): void {
    if (this.rebuildScheduled || this.disposed) return;
    this.rebuildScheduled = true;
    queueMicrotask(() => {
      this.rebuildScheduled = false;
      if (!this.disposed) this.rebuild();
    });
  }

  /**
   * Groups placements by geometry+material and rebuilds draw batches. Groups of
   * four or more become a single InstancedMesh; smaller ones stay plain meshes
   * so picking stays cheap.
   */
  private rebuild(): void {
    for (const batch of this.batches.values()) {
      this.content.remove(batch.object);
      if (batch.object instanceof THREE.InstancedMesh) batch.object.dispose();
    }
    this.batches.clear();
    this.index.clear();

    const groups = new Map<string, ResolvedBrick[]>();
    for (const brick of this.placements.values()) {
      if (brick.visible === false) continue;
      const group = groups.get(brick.batchKey);
      if (group) group.push(brick);
      else groups.set(brick.batchKey, [brick]);
    }

    for (const [key, group] of groups) {
      const geometry = partGeometry(group[0].resolvedPart);
      const material = group[0].ghost ? ghostMaterial() : partMaterial(group[0].color);
      const casts = this.options.shadows && !group[0].ghost;
      const ids = group.map((brick) => brick.id);

      if (group.length >= INSTANCE_THRESHOLD) {
        const mesh = new THREE.InstancedMesh(geometry, material, group.length);
        mesh.castShadow = casts;
        mesh.receiveShadow = casts;
        mesh.frustumCulled = false;
        group.forEach((brick, index) => {
          mesh.setMatrixAt(index, this.displayMatrix(brick));
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.userData.legoBatch = key;
        this.content.add(mesh);
        const batch: Batch = { key, object: mesh, ids };
        this.batches.set(key, batch);
        ids.forEach((id, instance) => this.index.set(id, { batch, instance }));
      } else {
        group.forEach((brick, index) => {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = casts;
          mesh.receiveShadow = casts;
          mesh.applyMatrix4(this.displayMatrix(brick));
          mesh.userData.legoId = brick.id;
          this.content.add(mesh);
          const batch: Batch = { key, object: mesh, ids: [brick.id] };
          this.batches.set(`${key}#${index}`, batch);
          this.index.set(brick.id, { batch, instance: 0 });
        });
      }
    }

    if (this.animation) this.applyBuildIn(this.animation.lastTime);
    this.markDirty();
  }

  private displayMatrix(brick: ResolvedBrick): THREE.Matrix4 {
    if (brick.id !== this.highlighted) return brick.matrix;
    const lifted = placementMatrix(brick, brick.resolvedPart, new THREE.Matrix4());
    lifted.elements[13] += HIGHLIGHT_LIFT;
    return lifted;
  }

  /**
   * Drops every brick into place, lowest course first — the assembly beat from
   * a LEGO build sequence.
   *
   * Bricks land in build order (by level, then by distance from the centre), so
   * the city grows outward and upward rather than appearing all at once.
   * Respects `prefers-reduced-motion` and becomes a no-op there.
   */
  playBuildIn(options: BuildInOptions = {}): void {
    const {
      duration = 520,
      stagger = 9,
      drop = 7,
      respectReducedMotion = true,
    } = options;

    if (respectReducedMotion && prefersReducedMotion()) {
      this.animation = null;
      this.invalidate();
      return;
    }

    const order = [...this.placements.values()]
      .sort((a, b) => {
        const levelDelta = a.position[1] - b.position[1];
        if (levelDelta !== 0) return levelDelta;
        return radialDistance(a) - radialDistance(b);
      })
      .map((brick) => brick.id);

    this.animation = {
      order,
      startedAt: now(),
      duration,
      stagger,
      drop,
      lastTime: now(),
    };
    this.markDirty();
  }

  /** True while a build-in animation is still running. */
  get isAnimating(): boolean {
    return this.animation !== null;
  }

  /**
   * Writes one frame of the build-in animation into the batches.
   * Returns false once every brick has landed.
   */
  private applyBuildIn(time: number): boolean {
    const state = this.animation;
    if (!state) return false;
    state.lastTime = time;

    const matrix = new THREE.Matrix4();
    let settled = true;

    state.order.forEach((id, position) => {
      const entry = this.index.get(id);
      const brick = this.placements.get(id);
      if (!entry || !brick) return;

      const elapsed = time - state.startedAt - position * state.stagger;
      const t = Math.min(1, Math.max(0, elapsed / state.duration));
      if (t < 1) settled = false;

      matrix.copy(this.displayMatrix(brick));
      if (t < 1) {
        // Ease-out-back: overshoots slightly, then settles — the small bounce a
        // brick makes when it clicks onto the stud below.
        matrix.elements[13] += (1 - easeOutBack(t)) * state.drop;
      }

      const { batch, instance } = entry;
      if (batch.object instanceof THREE.InstancedMesh) {
        batch.object.setMatrixAt(instance, matrix);
        batch.object.instanceMatrix.needsUpdate = true;
      } else {
        batch.object.matrixAutoUpdate = false;
        batch.object.matrix.copy(matrix);
        batch.object.matrixWorldNeedsUpdate = true;
      }
    });

    if (settled) this.animation = null;
    return !settled;
  }

  /** Lifts one brick clear of the build, the way you pick a piece off a model. */
  setHighlight(id: string | null): void {
    if (this.highlighted === id) return;
    this.highlighted = id;
    this.invalidate();
  }

  // --- picking ------------------------------------------------------------

  private bindPointer(): void {
    const element = this.renderer.domElement;
    element.addEventListener("pointermove", this.onPointerMove);
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointerleave", this.onPointerLeave);
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1,
    );
  }

  /** Raycast against the current batches and resolve back to a placement. */
  pick(): LegoPickEvent | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = [...this.batches.values()].map((batch) => batch.object);
    const hits = this.raycaster.intersectObjects(targets, false);
    for (const hit of hits) {
      const batch = [...this.batches.values()].find((entry) => entry.object === hit.object);
      if (!batch) continue;
      const id =
        hit.object instanceof THREE.InstancedMesh && hit.instanceId !== undefined
          ? batch.ids[hit.instanceId]
          : batch.ids[0];
      const placement = id ? this.placements.get(id) : undefined;
      if (!placement || placement.interactive === false) continue;
      return { id: placement.id, placement, data: placement.data, point: hit.point };
    }
    return null;
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.updatePointer(event);
    const hit = this.pick();
    const id = hit?.id ?? null;
    if (id !== this.hovered) {
      this.hovered = id;
      this.renderer.domElement.style.cursor = id ? "pointer" : this.options.orbit ? "grab" : "default";
      for (const listener of this.hoverListeners) listener(hit);
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.updatePointer(event);
    const hit = this.pick();
    for (const listener of this.pickListeners) listener(hit);
  };

  private onPointerLeave = (): void => {
    if (this.hovered === null) return;
    this.hovered = null;
    for (const listener of this.hoverListeners) listener(null);
  };

  /** Fires on pointer-down. Receives `null` when the click missed every brick. */
  onPick(listener: Listener<LegoPickEvent | null>): () => void {
    this.pickListeners.add(listener);
    return () => this.pickListeners.delete(listener);
  }

  onHover(listener: Listener<LegoPickEvent | null>): () => void {
    this.hoverListeners.add(listener);
    return () => this.hoverListeners.delete(listener);
  }

  // --- camera -------------------------------------------------------------

  /**
   * Frames the whole build.
   *
   * Fits the bounding *box* against both the vertical and horizontal fields of
   * view, projected for the camera's current elevation. Fitting the bounding
   * sphere instead — the usual shortcut — leaves a wide, flat build like a city
   * looking small, because most of that sphere is empty air above it.
   */
  frameAll(padding = 1.08): void {
    const box = new THREE.Box3().setFromObject(this.root);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const target = this.controls?.target ?? new THREE.Vector3(...this.options.cameraTarget);

    const direction = this.camera.position.clone().sub(target);
    if (direction.lengthSq() === 0) direction.set(1, 0.8, 1);
    direction.normalize();

    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(this.camera.aspect, 0.0001));

    // Horizontal diagonal, since the build can be viewed from any azimuth.
    const spanH = Math.hypot(size.x, size.z);
    const elevation = Math.asin(Math.min(1, Math.max(-1, direction.y)));
    // Looking down, the footprint foreshortens into the vertical axis and the
    // height shortens; combine both for the on-screen vertical extent.
    const spanV =
      size.y * Math.cos(elevation) + spanH * Math.abs(Math.sin(elevation));

    const distance =
      Math.max(
        spanH / 2 / Math.tan(hFov / 2),
        spanV / 2 / Math.tan(vFov / 2),
      ) * padding;

    this.camera.position.copy(center).add(direction.multiplyScalar(distance));
    this.camera.near = Math.max(distance / 500, 0.05);
    this.camera.far = distance * 8 + spanH * 4;
    this.camera.updateProjectionMatrix();

    if (this.options.fog && this.options.background) {
      // Start the haze just in front of the subject and close it well before
      // the far plane, so depth reads without swallowing the build.
      this.scene.fog = new THREE.Fog(
        new THREE.Color(this.options.background).getHex(),
        distance * 0.72,
        distance * 2.35,
      );
    }

    if (this.controls) {
      this.controls.target.copy(center);
      this.controls.minDistance = distance * 0.4;
      this.controls.maxDistance = distance * 2.4;
      this.controls.update();
    } else {
      // Seed the orbit view so a later setView() eases from here.
      const seeded = this.currentViewFromCamera();
      seeded.distance = distance;
      seeded.target.copy(center);
      this.view = seeded;
      this.viewTarget = {
        azimuth: seeded.azimuth,
        elevation: seeded.elevation,
        distance: seeded.distance,
        target: seeded.target.clone(),
      };
      this.applyView(seeded);
    }
    this.markDirty();
  }

  /**
   * Drives the camera in orbit terms — azimuth, elevation, distance and focus.
   *
   * Only available when `orbit: false`, i.e. when the stage owns the camera
   * rather than OrbitControls. Successive calls ease toward the newest target
   * instead of snapping, which is what makes a scroll-linked camera feel like
   * one continuous move rather than a series of jumps.
   */
  setView(next: Partial<OrbitView>, options: { immediate?: boolean } = {}): void {
    if (this.controls) return;
    const base: OrbitView =
      this.viewTarget ?? this.view ?? this.currentViewFromCamera();
    const merged: OrbitView = {
      azimuth: next.azimuth ?? base.azimuth,
      elevation: next.elevation ?? base.elevation,
      distance: next.distance ?? base.distance,
      target: next.target ? next.target.clone() : base.target.clone(),
    };
    this.viewTarget = merged;
    if (options.immediate || !this.view) {
      this.view = {
        azimuth: merged.azimuth,
        elevation: merged.elevation,
        distance: merged.distance,
        target: merged.target.clone(),
      };
      this.applyView(this.view);
    }
    this.markDirty();
  }

  /** How quickly `setView` catches up: 0 holds still, 1 snaps. */
  setViewSmoothing(factor: number): void {
    this.viewSmoothing = Math.min(1, Math.max(0.001, factor));
  }

  private currentViewFromCamera(): OrbitView {
    const target = new THREE.Vector3(...this.options.cameraTarget);
    const offset = this.camera.position.clone().sub(target);
    const distance = Math.max(offset.length(), 0.001);
    return {
      azimuth: Math.atan2(offset.x, offset.z),
      elevation: Math.asin(Math.min(1, Math.max(-1, offset.y / distance))),
      distance,
      target,
    };
  }

  private applyView(view: OrbitView): void {
    const horizontal = Math.cos(view.elevation) * view.distance;
    this.camera.position.set(
      view.target.x + Math.sin(view.azimuth) * horizontal,
      view.target.y + Math.sin(view.elevation) * view.distance,
      view.target.z + Math.cos(view.azimuth) * horizontal,
    );
    this.camera.lookAt(view.target);
  }

  /** Eases one frame toward the view target. Returns false once settled. */
  private stepView(): boolean {
    if (!this.view || !this.viewTarget) return false;
    const k = this.viewSmoothing;
    const from = this.view;
    const to = this.viewTarget;

    // Shortest-path interpolation, so crossing +/-PI does not spin the long way.
    let deltaAzimuth = to.azimuth - from.azimuth;
    while (deltaAzimuth > Math.PI) deltaAzimuth -= Math.PI * 2;
    while (deltaAzimuth < -Math.PI) deltaAzimuth += Math.PI * 2;

    const deltaElevation = to.elevation - from.elevation;
    const deltaDistance = to.distance - from.distance;
    const deltaTarget = to.target.clone().sub(from.target);

    const settled =
      Math.abs(deltaAzimuth) < 1e-4 &&
      Math.abs(deltaElevation) < 1e-4 &&
      Math.abs(deltaDistance) < 1e-3 &&
      deltaTarget.lengthSq() < 1e-6;

    if (settled) {
      from.azimuth = to.azimuth;
      from.elevation = to.elevation;
      from.distance = to.distance;
      from.target.copy(to.target);
      this.applyView(from);
      return false;
    }

    from.azimuth += deltaAzimuth * k;
    from.elevation += deltaElevation * k;
    from.distance += deltaDistance * k;
    from.target.add(deltaTarget.multiplyScalar(k));
    this.applyView(from);
    return true;
  }

  // --- lifecycle ----------------------------------------------------------

  private observeResize(): void {
    if (typeof ResizeObserver === "undefined") {
      globalThis.addEventListener?.("resize", this.resize);
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  /**
   * Pushes the rendered scene sideways within the canvas, as a fraction of the
   * viewport — `0.22` moves it 22% to the right.
   *
   * This shifts the camera *frustum*, not the camera, so the subject stays put
   * on screen while an orbit sweep continues around it. Use it to keep a model
   * clear of a text column instead of shrinking the canvas.
   */
  setFrameShift(x = 0, y = 0): void {
    this.frameShift = { x, y };
    this.applyFrameShift();
    this.markDirty();
  }

  private applyFrameShift(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    if (this.frameShift.x === 0 && this.frameShift.y === 0) {
      this.camera.clearViewOffset();
      return;
    }
    // A negative offset moves the visible window left, which pushes the
    // rendered subject right.
    this.camera.setViewOffset(
      width,
      height,
      -this.frameShift.x * width,
      -this.frameShift.y * height,
      width,
      height,
    );
  }

  resize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.applyFrameShift();
    this.markDirty();
  };

  private markDirty = (): void => {
    this.dirty = true;
  };

  /** Schedules one repaint. Needed after mutating an object in the scene. */
  requestRender(): void {
    this.dirty = true;
  }

  /**
   * Recolours the ground and haze without rebuilding the stage.
   *
   * Swapping themes by recreating the stage would tear down the renderer and
   * force every loaded model to re-parse, so the visible part is changed in
   * place instead.
   */
  setBackground(color: string): void {
    this.options.background = color;
    const value = new THREE.Color(color);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(value);
    else this.scene.background = value;
    if (this.scene.fog instanceof THREE.Fog) this.scene.fog.color.copy(value);
    this.markDirty();
  }

  /**
   * Renders on demand: only when something changed, or continuously while
   * damping or auto-rotation is still in motion. An idle scene costs nothing.
   */
  private start(): void {
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      let animating = false;

      if (this.options.autoRotate !== 0) {
        this.root.rotation.y += (this.options.autoRotate * Math.PI * delta) / 180;
        animating = true;
      }
      if (this.controls?.enableDamping) {
        animating = this.controls.update() || animating;
      }
      if (this.animation) {
        animating = this.applyBuildIn(now()) || animating;
      }
      if (!this.controls) {
        animating = this.stepView() || animating;
      }
      if (this.updaters.size > 0) {
        for (const update of this.updaters) update(delta);
        animating = true;
      }
      if (this.dirty || animating) {
        this.dirty = false;
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.frame = requestAnimationFrame(loop);
  }

  /** Tears down GPU resources. Shared geometry and material caches survive. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);

    const element = this.renderer.domElement;
    element.removeEventListener("pointermove", this.onPointerMove);
    element.removeEventListener("pointerdown", this.onPointerDown);
    element.removeEventListener("pointerleave", this.onPointerLeave);
    this.resizeObserver?.disconnect();
    globalThis.removeEventListener?.("resize", this.resize);

    this.controls?.removeEventListener("change", this.markDirty);
    this.controls?.dispose();

    for (const batch of this.batches.values()) {
      if (batch.object instanceof THREE.InstancedMesh) batch.object.dispose();
    }
    this.batches.clear();
    this.index.clear();
    this.placements.clear();
    this.animation = null;
    this.pickListeners.clear();
    this.hoverListeners.clear();
    this.updaters.clear();

    this.ground?.geometry.dispose();
    (this.ground?.material as THREE.Material | undefined)?.dispose();
    this.environmentTexture?.dispose();

    this.renderer.dispose();
    element.remove();
  }
}
