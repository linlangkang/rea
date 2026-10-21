import { describe, it, expect } from "vitest";
import * as T from "three";
import { batchStaticMeshes } from "../../src/scene/batch";

const material = () => new T.MeshStandardMaterial({ color: "#aaaabb" });
function cubes(parent: T.Object3D, mat: T.Material) {
  return [0, 0.3, 0.6].map((x) => {
    const mesh = new T.Mesh(new T.BoxGeometry(0.2, 0.2, 0.2), mat);
    mesh.position.x = x;
    parent.add(mesh);
    return mesh;
  });
}
function bounds(root: T.Object3D) {
  const box = new T.Box3().setFromObject(root);
  return [...box.min.toArray(), ...box.max.toArray()];
}
describe("static render batches preserve the interactive scene", () => {
  it("preserves world bounds through nested translations and rotations", () => {
    const root = new T.Group(),
      nested = new T.Group();
    root.add(nested);
    root.position.set(2, 0.4, -1);
    root.rotation.y = 0.7;
    nested.position.set(0.2, 0.1, 0.1);
    nested.rotation.z = 0.2;
    cubes(nested, material());
    const before = bounds(root),
      result = batchStaticMeshes(root);
    expect(result.merged).toBe(2);
    expect(result.after).toBe(1);
    bounds(root).forEach((value, i) => expect(value).toBeCloseTo(before[i], 5));
  });
  it("keeps separately selectable and exploded parts under their original owners", () => {
    const root = new T.Group(),
      a = new T.Group(),
      b = new T.Group(),
      mat = material();
    a.userData.instanceId = "cpu";
    b.userData.instanceId = "gpu";
    b.position.z = -4;
    root.add(a, b);
    cubes(a, mat);
    cubes(b, mat);
    expect(batchStaticMeshes(root).after).toBe(2);
    expect(a.children).toHaveLength(1);
    expect(b.children).toHaveLength(1);
    root.updateMatrixWorld(true);
    const hit = new T.Raycaster(
      new T.Vector3(0.3, 0, 2),
      new T.Vector3(0, 0, -1),
    ).intersectObject(root, true)[0];
    expect(hit.object.parent?.userData.instanceId).toBe("cpu");
    a.position.y = 1;
    root.updateMatrixWorld(true);
    expect(new T.Box3().setFromObject(a).min.y).toBeCloseTo(0.9);
    expect(new T.Box3().setFromObject(b).min.y).toBeCloseTo(-0.1);
  });
  it("preserves moving doors, instanced rotors, glass and hidden geometry", () => {
    const root = new T.Group(),
      door = new T.Group(),
      hidden = new T.Group(),
      mat = material();
    door.userData.fridgeDoor = true;
    root.add(door, hidden);
    hidden.visible = false;
    cubes(door, mat);
    const concealed = cubes(hidden, mat);
    const rotor = new T.InstancedMesh(new T.BoxGeometry(0.1, 0.1, 0.1), mat, 3);
    rotor.userData.fanRotor = true;
    root.add(rotor);
    const glass = new T.Mesh(
      new T.BoxGeometry(1, 1, 0.01),
      new T.MeshPhysicalMaterial({ transparent: true, opacity: 0.08 }),
    );
    root.add(glass);
    batchStaticMeshes(root);
    expect(door.parent).toBe(root);
    expect(door.children).toHaveLength(1);
    expect(rotor.parent).toBe(root);
    expect(glass.parent).toBe(root);
    expect(concealed[0].parent).toBe(hidden);
    door.rotation.y = 1.65;
    expect(door.children[0].parent?.rotation.y).toBe(1.65);
  });
  it("leaves mirrored and no-pick geometry intact", () => {
    const root = new T.Group(),
      mat = material(),
      mirror = cubes(root, mat);
    mirror.forEach((m) => (m.scale.x = -1));
    const background = new T.Group();
    background.userData.noPick = true;
    root.add(background);
    cubes(background, mat);
    expect(batchStaticMeshes(root).merged).toBe(0);
    expect(mirror[0].parent).toBe(root);
    expect(background.children).toHaveLength(3);
  });
});
