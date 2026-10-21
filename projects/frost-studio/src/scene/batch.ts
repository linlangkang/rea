import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type BatchStats = {
  before: number;
  after: number;
  merged: number;
  batches: number;
};
/** Preserve selection/animation ownership. Only combine static, opaque geometry inside each boundary. */
export function batchStaticMeshes(
  root: T.Object3D,
  cellSize = 2.5,
): BatchStats {
  root.updateMatrixWorld(true);
  const owners: T.Object3D[] = [root];
  root.traverse((o) => {
    if (o !== root && (o.userData.instanceId || o.userData.fridgeDoor))
      owners.push(o);
  });
  const stats: BatchStats = { before: 0, after: 0, merged: 0, batches: 0 };
  root.traverse((o) => {
    if (o instanceof T.Mesh) stats.before++;
  });
  for (const owner of owners) {
    const inverse = owner.matrixWorld.clone().invert(),
      buckets = new Map<string, { mesh: T.Mesh; matrix: T.Matrix4 }[]>();
    function collect(o: T.Object3D) {
      if (!o.visible) return;
      if (
        o !== owner &&
        (o.userData.instanceId ||
          o.userData.fridgeDoor ||
          o.userData.fanRotor ||
          o.userData.water ||
          o.userData.noPick)
      )
        return;
      if (
        o instanceof T.Mesh &&
        !(o instanceof T.InstancedMesh) &&
        !(o instanceof T.SkinnedMesh) &&
        !o.children.length &&
        !o.name &&
        !Array.isArray(o.material) &&
        !o.material.transparent &&
        !o.morphTargetInfluences
      ) {
        const material = o.material,
          geometry = o.geometry;
        if (
          !material.userData.screen &&
          !material.userData.sky &&
          !o.userData.batched
        ) {
          const matrix = inverse.clone().multiply(o.matrixWorld),
            position = new T.Vector3().setFromMatrixPosition(matrix);
          if (matrix.determinant() < 0) return; // Mirrored meshes need their original winding/renderer state.
          const attributes = Object.keys(geometry.attributes)
            .sort()
            .map((name) => {
              const a = geometry.getAttribute(name);
              return (
                name +
                ":" +
                a.itemSize +
                ":" +
                a.normalized +
                ":" +
                a.array.constructor.name
              );
            })
            .join(",");
          const cell = [position.x, position.y, position.z]
            .map((v) => Math.floor(v / cellSize))
            .join(":");
          const key = [
            material.uuid,
            o.castShadow,
            o.receiveShadow,
            !!geometry.index,
            attributes,
            cell,
            o.renderOrder,
            o.layers.mask,
          ].join("|");
          const items = buckets.get(key) ?? [];
          items.push({ mesh: o, matrix });
          buckets.set(key, items);
        }
      }
      for (const child of o.children) collect(child);
    }
    collect(owner);
    for (const items of buckets.values()) {
      if (items.length < 3) continue;
      const geometries = items.map(({ mesh, matrix }) =>
        mesh.geometry.clone().applyMatrix4(matrix),
      );
      const geometry = mergeGeometries(geometries, false);
      for (const g of geometries) g.dispose();
      if (!geometry) continue;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const original = items[0].mesh,
        mesh = new T.Mesh(geometry, original.material);
      mesh.castShadow = original.castShadow;
      mesh.receiveShadow = original.receiveShadow;
      mesh.renderOrder = original.renderOrder;
      mesh.layers.mask = original.layers.mask;
      mesh.name = "StaticBatch_" + owner.name;
      mesh.userData.batched = true;
      owner.add(mesh);
      for (const item of items) item.mesh.removeFromParent();
      stats.merged += items.length - 1;
      stats.batches++;
    }
  }
  root.traverse((o) => {
    if (o instanceof T.Mesh) stats.after++;
  });
  return stats;
}
