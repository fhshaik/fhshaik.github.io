"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

type ThemeName = "serene" | "classic";
type Landmark = "About" | "Research" | "Projects" | "Experience";

const LANDMARKS: Landmark[] = ["About", "Research", "Projects", "Experience"];
const LANDMARK_COPY: Record<Landmark, string> = {
  About: "Bonsai silhouette — a placeholder for the story behind the work.",
  Research: "Cherry canopy — scientific ML, simulations, and physical systems.",
  Projects: "Display pot — selected work across AI, graphics, and engineering.",
  Experience: "Branch structure — a path through teams, systems, and experiments.",
};

function LDrawGarden({ theme, onSelect }: { theme: ThemeName; onSelect: (landmark: Landmark) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    setStatus("loading");

    const scene = new THREE.Scene();
    const background = theme === "serene" ? 0xede8df : 0xc9e6f2;
    scene.background = new THREE.Color(background);
    scene.fog = new THREE.Fog(background, 22, 38);

    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(12.8, 10.5, 15.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme === "serene" ? 1.18 : 1.28;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = 11;
    controls.maxDistance = 25;
    controls.minPolarAngle = Math.PI * 0.19;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 4.4, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x65574b, theme === "serene" ? 2.2 : 2.7));
    const sun = new THREE.DirectionalLight(0xfff1d4, 4.8);
    sun.position.set(-8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13 });
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ color: 0x514a40, opacity: theme === "serene" ? 0.16 : 0.12 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    scene.add(ground);

    const modelRoot = new THREE.Group();
    modelRoot.rotation.y = -0.08;
    scene.add(modelRoot);
    const hotspots: THREE.Mesh[] = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered: THREE.Mesh | null = null;

    const addHotspot = (group: THREE.Group, landmark: Landmark, position: [number, number, number], size: [number, number, number]) => {
      const hitbox = new THREE.Mesh(
        new THREE.BoxGeometry(...size),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hitbox.position.set(...position);
      hitbox.userData.landmark = landmark;
      group.add(hitbox);
      hotspots.push(hitbox);
    };

    const loader = new LDrawLoader();
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
    const modelUrl = "/ldraw/10281-cherry-blossoms-packed.mpd?v=1";
    loader.loadAsync(modelUrl).then((group) => {
      if (disposed) return;
      group.rotation.x = Math.PI;
      group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      group.position.set(-center.x, -box.min.y, -center.z);
      const scale = 13.5 / Math.max(size.x, size.z);
      modelRoot.scale.setScalar(scale);
      modelRoot.add(group);

      addHotspot(group, "About", [-55, 245, 10], [180, 230, 180]);
      addHotspot(group, "Research", [-125, 405, -70], [250, 190, 250]);
      addHotspot(group, "Projects", [95, 70, 70], [260, 130, 260]);
      addHotspot(group, "Experience", [125, 340, 95], [210, 210, 210]);

      group.traverse((object) => {
        if (object instanceof THREE.Mesh && !object.userData.landmark) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      setStatus("ready");
    }).catch((error) => {
      console.error("LDraw model failed to load", error);
      if (!disposed) setStatus("error");
    });

    const resize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
    };
    const pointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      hovered = (raycaster.intersectObjects(hotspots, false)[0]?.object as THREE.Mesh | undefined) ?? null;
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
    };
    const pointerClick = () => {
      if (hovered?.userData.landmark) onSelect(hovered.userData.landmark as Landmark);
    };
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("click", pointerClick);
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      controls.dispose();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("click", pointerClick);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((entry) => entry.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [theme, onSelect]);

  return (
    <div className="garden-canvas" ref={mountRef}>
      {status !== "ready" && (
        <div className="model-status" role="status">
          <span className={status === "error" ? "error" : ""} />
          {status === "error" ? "The authored set model could not be loaded." : "Assembling the 10281 Cherry Blossoms model…"}
        </div>
      )}
    </div>
  );
}

export default function LDrawPortfolio() {
  const [theme, setTheme] = useState<ThemeName>("serene");
  const [selected, setSelected] = useState<Landmark>("About");
  return (
    <main className={`site-shell theme-${theme}`}>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Faadil Shaik, home"><span className="wordmark-stud" />FS</a>
        <nav className="primary-nav" aria-label="Primary navigation">
          {LANDMARKS.map((item) => <button key={item} onClick={() => setSelected(item)} className={selected === item ? "active" : ""}>{item}</button>)}
        </nav>
        <a className="resume-link" href="#resume">Résumé <span aria-hidden="true">↗</span></a>
      </header>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Physics · Machine Learning · Software</p>
          <h1>I build systems for<br /><em>curious worlds.</em></h1>
          <p className="intro">A portfolio centered on an authored digital replica of LEGO set 10281—preserving its connected build, subassemblies, and original Cherry Blossoms configuration.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => setSelected("Projects")}>Explore selected work</button>
            <a href="/ldraw/10281-cherry-blossoms.mpd" download className="text-action">Inspect the original MPD <span>↓</span></a>
          </div>
          <div className="authenticity-note">
            <strong>753</strong><span>placed parts</span><strong>28</strong><span>authored submodels</span>
          </div>
        </div>
        <div className="scene-wrap">
          <LDrawGarden theme={theme} onSelect={setSelected} />
          <div className="scene-label">
            <span className="scene-index">0{LANDMARKS.indexOf(selected) + 1}</span>
            <div><p>{selected}</p><span>{LANDMARK_COPY[selected]}</span></div>
          </div>
          <p className="scene-hint"><span /> Drag to orbit · Select a landmark</p>
        </div>
      </section>
      <footer className="site-footer">
        <div className="theme-switch" role="group" aria-label="Visual direction">
          <span>Atmosphere</span>
          <button className={theme === "serene" ? "selected" : ""} onClick={() => setTheme("serene")}>Serene</button>
          <button className={theme === "classic" ? "selected" : ""} onClick={() => setTheme("classic")}>LEGO studio</button>
        </div>
        <p><a href="https://library.ldraw.org/omr/sets/1383" target="_blank" rel="noreferrer">10281-1 model by Orion Pobursky</a> · CCAL 2.0</p>
      </footer>
    </main>
  );
}
