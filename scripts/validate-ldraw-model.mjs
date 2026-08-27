import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["public/ldraw/10281-cherry-blossoms-packed.mpd"];
for (const file of files) {
  const source = await readFile(file, "utf8");
  const loader = new LDrawLoader();
  loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
  let timeout;
  const group = await Promise.race([
    new Promise((resolve, reject) => loader.parse(source, resolve, reject)),
    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(`${file} parse timed out`)), 180000); }),
  ]).finally(() => clearTimeout(timeout));
  group.rotation.x = Math.PI;
  group.updateMatrixWorld(true);
  let meshes = 0;
  let vertices = 0;
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      meshes += 1;
      vertices += object.geometry.getAttribute("position")?.count ?? 0;
    }
  });
  const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  if (meshes === 0 || vertices === 0 || !Number.isFinite(size.length())) throw new Error(`${file} did not produce valid geometry`);
  console.log(JSON.stringify({ file, meshes, vertices, bounds: size.toArray().map((value) => Number(value.toFixed(2))) }));
}
