import * as T from "three";
import { pbr, metricUV } from "./surfaces";
// Analytic stuffed textile: pinched perimeter, asymmetric fill and a shallow center depression.
export function cushion(
  g: T.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  seed = 0,
) {
  const geo = new T.SphereGeometry(1, 48, 28),
    p = geo.getAttribute("position");
  const signed = (v: number, power: number) =>
    Math.sign(v) * Math.pow(Math.abs(v), power);
  const colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const a = p.getX(i),
      b = p.getY(i),
      c = p.getZ(i);
    const xx = (signed(a, 0.48) * w) / 2,
      zz = (signed(c, 0.48) * d) / 2;
    let yy = (signed(b, 0.65) * h) / 2;
    // Short gathering folds grow from the sewn edge and die toward the filled center.
    const edge = Math.max(Math.abs(xx) / (w / 2), Math.abs(zz) / (d / 2));
    const gather =
      Math.pow(edge, 6) *
      Math.sin((xx / w) * 39 + (zz / d) * 17 + seed) *
      Math.sin((zz / d) * 25 - seed);
    yy += gather * Math.min(h * 0.055, 0.008) * Math.abs(b);
    yy +=
      Math.sin((xx / w) * 4 + seed) *
      Math.cos((zz / d) * 3 + seed) *
      h *
      0.035 *
      Math.abs(b);
    if (b > 0)
      yy -=
        Math.exp(
          -((xx / w - 0.08 * Math.sin(seed)) ** 2 + (zz / d + 0.06) ** 2) * 18,
        ) *
        h *
        0.17;
    p.setXYZ(i, xx, yy, zz);
    const seamOcclusion = 1 - 0.12 * Math.pow(edge, 10) * (1 - Math.abs(b));
    colors.push(seamOcclusion, seamOcclusion, seamOcclusion);
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  metricUV(geo);
  const mesh = new T.Mesh(geo, pbr("cotton", color, false, true));
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh);
  const points: T.Vector3[] = [];
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * Math.PI * 2;
    points.push(
      new T.Vector3(
        signed(Math.cos(a), 0.48) * w * 0.49,
        0,
        signed(Math.sin(a), 0.48) * d * 0.49,
      ),
    );
  }
  const thread = new T.Color(color).multiplyScalar(0.8);
  const seam = new T.Mesh(
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points, true),
      100,
      0.0018,
      4,
      true,
    ),
    pbr("cotton", "#" + thread.getHexString()),
  );
  mesh.add(seam);
  return mesh;
}
export function cloth(
  g: T.Object3D,
  w: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  mode: "bed" | "sofa" = "bed",
  layer = 0,
) {
  const geo = new T.PlaneGeometry(w, d, 64, 56),
    p = geo.getAttribute("position"),
    uv = geo.getAttribute("uv");
  for (let i = 0; i < p.count; i++) {
    let xx = p.getX(i),
      zz = p.getY(i);
    const u = xx / w,
      v = zz / d;
    const edge = Math.max(0, Math.abs(xx) - 0.91);
    const foot = Math.max(0, zz + z - 1.08);
    const armDrop =
      0.19 *
        (1 - Math.sqrt(1 - Math.pow(Math.min(1, Math.abs(xx) / 0.13), 4))) +
      Math.max(0, Math.abs(xx) - 0.13) * 0.5;
    const drape = mode === "bed" ? Math.max(edge * 2.9, foot * 2.4) : armDrop;
    const stress = Math.exp(-((xx - 0.62) ** 2 + (zz - 0.2) ** 2) * 6);
    const fold =
      (Math.sin(xx * 18 + zz * 4 + Math.sin(zz * 5)) * 0.006 +
        Math.sin(xx * 9 - zz * 12) * 0.004) *
        (1 + edge * 4) +
      stress * Math.sin(Math.atan2(zz - 0.2, xx - 0.62) * 7) * 0.017;
    let yy =
      -drape +
      fold +
      0.009 * Math.sin(v * 8 + u * 3) +
      (mode === "sofa" ? 0.008 * Math.sin(zz * 38 + xx * 8) : 0);
    if (mode === "sofa") {
      // Follow the rounded .23 × .39 × .95 m arm, then rest on the adjacent seat.
      // Tiny gathering folds must not dip through the upholstery underneath.
      const across = Math.abs(xx) / 0.115,
        along = Math.abs(zz + z) / 0.475;
      if (across <= 1 && along <= 1) {
        const support =
          0.49 +
          0.195 *
            Math.pow(
              Math.max(
                0,
                1 - Math.pow(across, 2 / 0.48) - Math.pow(along, 2 / 0.48),
              ),
              0.65 / 2,
            );
        yy = Math.max(yy, support - y + 0.009);
      }
      if (xx > 0.115 && zz + z > -0.42 && zz + z < 0.33)
        yy = Math.max(yy, 0.55 - y);
    }
    if (mode === "bed") {
      xx =
        Math.sign(xx) *
        (Math.min(Math.abs(xx), 0.91) +
          edge * 0.2 +
          layer * Math.min(1, edge * 30));
      zz -= foot * 0.8;
    }
    xx += 0.004 * Math.sin(zz * 13);
    zz += 0.004 * Math.sin(xx * 9);
    p.setXYZ(i, xx, yy, zz);
    uv.setXY(i, xx, zz);
  }
  geo.computeVertexNormals();
  const mat = pbr("cotton", color, true);
  const mesh = new T.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh);
  // A 3 mm textile hem closes the silhouette without a second overlapping cloth surface.
  const boundary: number[] = [];
  for (let col = 0; col <= 64; col++) boundary.push(col);
  for (let row = 1; row <= 56; row++) boundary.push(row * 65 + 64);
  for (let col = 63; col >= 0; col--) boundary.push(56 * 65 + col);
  for (let row = 55; row >= 0; row--) boundary.push(row * 65);
  const edgePositions: number[] = [],
    edgeUv: number[] = [],
    indices: number[] = [];
  for (const index of boundary) {
    for (const offset of [0, -0.003]) {
      edgePositions.push(p.getX(index), p.getY(index) + offset, p.getZ(index));
      edgeUv.push(uv.getX(index), uv.getY(index));
    }
  }
  for (let n = 0; n < boundary.length - 1; n++) {
    const a = n * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const hem = new T.BufferGeometry();
  hem.setAttribute("position", new T.Float32BufferAttribute(edgePositions, 3));
  hem.setAttribute("uv", new T.Float32BufferAttribute(edgeUv, 2));
  hem.setIndex(indices);
  hem.computeVertexNormals();
  mesh.add(new T.Mesh(hem, mat));
  return mesh;
}
export function plant(g: T.Object3D, x: number, z: number, size = 1) {
  const root = new T.Group();
  root.position.set(x, 0, z);
  root.scale.setScalar(size);
  g.add(root);
  root.name = "分叉枝干与薄叶植物";
  const profile = [
    [0, 0],
    [0.125, 0],
    [0.13, 0.012],
    [0.17, 0.29],
    [0.173, 0.315],
    [0.168, 0.328],
    [0.153, 0.328],
    [0.15, 0.311],
    [0.118, 0.025],
    [0, 0.025],
  ].map(([r, h]) => new T.Vector2(r, h));
  const pot = new T.Mesh(
    new T.LatheGeometry(profile, 40),
    pbr("paint", "#d9d2c4"),
  );
  pot.castShadow = pot.receiveShadow = true;
  root.add(pot);
  const dirt = new T.Mesh(
    new T.CircleGeometry(0.15, 24),
    pbr("paint", "#343020"),
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.323;
  root.add(dirt);
  const branchMat = pbr("wood", "#625846");
  const trunkCurve = new T.CatmullRomCurve3([
    new T.Vector3(0, 0.31, 0),
    new T.Vector3(-0.02, 0.69, 0.014),
    new T.Vector3(0.028, 1.08, -0.018),
    new T.Vector3(0.018, 1.47, 0),
  ]);
  const trunk = new T.Mesh(
    new T.TubeGeometry(trunkCurve, 28, 0.009, 8, false),
    branchMat,
  );
  trunk.castShadow = true;
  root.add(trunk);
  // Shared curved blade: thin geometry, fine outline, asymmetric shoulders.
  const leafGeo = new T.PlaneGeometry(1, 1, 8, 16),
    pos = leafGeo.getAttribute("position");
  const colors: number[] = [];
  for (let j = 0; j < pos.count; j++) {
    const u = pos.getX(j) * 2,
      t = pos.getY(j) + 0.5;
    const width =
      Math.pow(Math.sin(Math.PI * t), 0.8) *
      (0.28 + 0.04 * Math.sin(t * 5)) *
      (u < 0 ? 0.9 : 1);
    pos.setXYZ(
      j,
      u * width,
      t,
      Math.sin(t * Math.PI) * 0.09 +
        u * u * 0.04 -
        0.008 * Math.cos(t * 35) * Math.abs(u),
    );
    const tint = 1 - 0.13 * Math.abs(u) + 0.06 * Math.sin(t * 9);
    colors.push(0.22 * tint, 0.39 * tint, 0.16 * tint);
  }
  leafGeo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  leafGeo.computeVertexNormals();
  const leafMat = new T.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.66,
    side: T.DoubleSide,
  });
  leafMat.name = "surface:foliage";
  const leaves = new T.InstancedMesh(leafGeo, leafMat, 43),
    dummy = new T.Object3D();
  dummy.position.copy(trunkCurve.getPoint(1));
  dummy.rotation.set(0.45, 0.9, -0.25);
  dummy.scale.setScalar(0.18);
  dummy.updateMatrix();
  leaves.setMatrixAt(0, dummy.matrix);
  leaves.castShadow = leaves.receiveShadow = true;
  root.add(leaves);
  for (let branchIndex = 0; branchIndex < 7; branchIndex++) {
    const angle = branchIndex * 2.399 + 0.22,
      start = trunkCurve.getPoint(0.18 + branchIndex * 0.105);
    const end = start
      .clone()
      .add(
        new T.Vector3(
          Math.cos(angle) * (0.25 + (branchIndex % 3) * 0.035),
          0.16 + (branchIndex % 2) * 0.07,
          Math.sin(angle) * 0.27,
        ),
      );
    const middle = start.clone().lerp(end, 0.55);
    middle.y += 0.045;
    const curve = new T.CatmullRomCurve3([start, middle, end]);
    const branch = new T.Mesh(
      new T.TubeGeometry(curve, 16, 0.0037, 6, false),
      branchMat,
    );
    branch.castShadow = true;
    root.add(branch);
    for (let k = 0; k < 6; k++) {
      const n = branchIndex * 6 + k,
        point = curve.getPoint(0.25 + k * 0.135),
        a = angle + (k % 2 ? 1 : -1) * 1.05;
      const length = 0.145 + 0.09 * (0.5 + 0.5 * Math.sin(n * 3.71));
      dummy.position.copy(point);
      dummy.rotation.set(
        0.55 + 0.35 * Math.sin(n * 1.7),
        a,
        0.25 * Math.sin(n * 2.3),
      );
      dummy.scale.set(length * (0.82 + 0.18 * Math.sin(n)), length, length);
      dummy.updateMatrix();
      leaves.setMatrixAt(n + 1, dummy.matrix);
    }
  }
  leaves.computeBoundingBox();
  leaves.computeBoundingSphere();
  return root;
}
