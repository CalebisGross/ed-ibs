import * as THREE from "three";

export function disposeObject3D(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const material = mesh.material;
    const list = Array.isArray(material) ? material : material ? [material] : [];
    for (const item of list) {
      materials.add(item);
      const standard = item as THREE.MeshStandardMaterial;
      if (standard.map) textures.add(standard.map);
      if (standard.roughnessMap) textures.add(standard.roughnessMap);
      if (standard.normalMap) textures.add(standard.normalMap);
      if (standard.emissiveMap) textures.add(standard.emissiveMap);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}
