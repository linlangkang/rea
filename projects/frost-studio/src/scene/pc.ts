import * as T from "three";
import { box, tube, material, white, silver, dark } from "./models";
import {
  hardwareFan as fan,
  repeated,
  fastener,
  cableBundle,
  pcbDetails,
  hardwareLabel,
} from "./hardware";
import type { BuildPreset, Catalog } from "../domain/schema";
import { pbr } from "./surfaces";
export const internalIds = [
  "cpu",
  "gpu",
  "board",
  "ram",
  "ssd",
  "psu",
  "aio",
  "fan",
  "strip",
];
export type Part = { object: T.Group; home: T.Vector3; offset: T.Vector3 };
export function makePc(p: BuildPreset, catalog: Catalog) {
  const root = new T.Group();
  const groups = new Map<string, T.Group>();
  const parts: Part[] = [];
  const ci = p.instances.find((i) => i.id === "case")!;
  root.position.fromArray(ci.position);
  root.rotation.y = ci.rotation;
  const sku = catalog.skus.find((s) => s.id === ci.skuId)!;
  const dims = sku.dimensionsMm ?? [285, 480, 450];
  root.scale.set(dims[0] / 285, dims[1] / 480, dims[2] / 450);
  const add = (id: string, offset: number[]) => {
    const g = new T.Group();
    g.userData.instanceId = id;
    root.add(g);
    groups.set(id, g);
    parts.push({
      object: g,
      home: g.position.clone(),
      offset: new T.Vector3(...(offset as [number, number, number])),
    });
    return g;
  };
  const color = (id: string) =>
    p.instances.find((i) => i.id === id)?.customColor ?? white;
  const chassis = add("case", [0, 0, 0]);
  const c = pbr("metal", color("case"));
  box(chassis, 0.285, 0.024, 0.45, 0, 0.018, 0, c);
  box(chassis, 0.285, 0.019, 0.45, 0, 0.471, 0, c);
  box(chassis, 0.018, 0.45, 0.45, -0.134, 0.244, 0, c);
  for (const z of [-0.215, 0.215])
    box(chassis, 0.018, 0.45, 0.018, 0.134, 0.244, z, c);
  for (const x of [-0.105, 0.105])
    for (const z of [-0.175, 0.175])
      box(chassis, 0.04, 0.02, 0.06, x, -0.004, z, dark);
  // Separate tray, folded rails, rear expansion slots and top ventilation.
  box(
    chassis,
    0.002,
    0.34,
    0.29,
    -0.119,
    0.28,
    -0.025,
    pbr("metal", "#687986"),
    0.001,
  );
  for (const z of [-0.218, 0.218])
    box(chassis, 0.25, 0.007, 0.008, 0, 0.043, z, c, 0.001);
  repeated(
    chassis,
    [0.002, 0.001, 0.16],
    Array.from({ length: 28 }, (_, i) => [-0.105 + i * 0.008, 0.481, -0.015]),
    pbr("plastic", "#34424d"),
  );
  repeated(
    chassis,
    [0.17, 0.002, 0.004],
    Array.from({ length: 7 }, (_, i) => [0.015, 0.115 + i * 0.016, -0.227]),
    pbr("brushed", "#81909c"),
  );
  box(
    chassis,
    0.05,
    0.003,
    0.025,
    0.09,
    0.483,
    0.158,
    pbr("plastic", "#4c5d6b"),
    0.004,
  );
  for (const x of [0.078, 0.101])
    box(
      chassis,
      0.012,
      0.001,
      0.006,
      x,
      0.485,
      0.16,
      pbr("plastic", "#0d1822"),
      0.001,
    );
  for (const y of [0.052, 0.438])
    for (const z of [-0.195, 0.195]) fastener(chassis, 0.149, y, z);
  for (const y of [0.05, 0.445])
    for (const z of [-0.2, 0.2]) {
      box(
        chassis,
        0.006,
        0.012,
        0.012,
        0.15,
        y,
        z,
        pbr("brushed", "#b4bac0"),
        0.004,
      );
      box(
        chassis,
        0.001,
        0.006,
        0.001,
        0.154,
        y,
        z,
        pbr("plastic", "#20252a"),
        0,
      );
    }
  const glass = new T.MeshPhysicalMaterial({
    color: "#eef4f8",
    transparent: true,
    opacity: 0.065,
    roughness: 0.035,
    envMapIntensity: 0.55,
    metalness: 0,
    side: T.DoubleSide,
    depthWrite: false,
  });
  glass.name = "surface:glass";
  glass.userData.surface = "glass";
  const panel = box(chassis, 0.004, 0.433, 0.418, 0.145, 0.246, 0, glass, 0);
  panel.castShadow = false;
  panel.userData.sidePanel = true;
  panel.userData.noPick = true;
  const frontGlass = box(
    chassis,
    0.25,
    0.422,
    0.004,
    0,
    0.245,
    0.226,
    glass,
    0,
  );
  frontGlass.userData.noPick = true;
  frontGlass.castShadow = false;
  const board = add("board", [-0.36, 0.05, 0]);
  box(
    board,
    0.003,
    0.305,
    0.244,
    -0.107,
    0.276,
    -0.02,
    pbr("circuit", "#243d43"),
    0.001,
  );
  pcbDetails(board);
  box(
    board,
    0.008,
    0.054,
    0.054,
    -0.095,
    0.33,
    -0.023,
    pbr("plastic", "#394650"),
    0.002,
  );
  for (const z of [-0.115, 0.035])
    repeated(
      board,
      [0.026, 0.002, 0.055],
      Array.from({ length: 15 }, (_, i) => [-0.07, 0.3 + i * 0.007, z]),
      pbr("brushed", "#b9c6cd"),
    );
  for (let n = 0; n < 15; n++)
    box(
      board,
      0.001,
      0.001,
      0.05 + (n % 4) * 0.015,
      -0.099,
      0.15 + n * 0.016,
      -0.07,
      pbr("metal", "#b8aa78"),
      0,
    );
  for (const z of [-0.115, 0.035])
    box(board, 0.008, 0.115, 0.055, -0.095, 0.35, z, silver, 0.002);
  box(board, 0.025, 0.032, 0.12, -0.085, 0.19, -0.03, silver, 0.002);
  for (let i = 0; i < 6; i++)
    box(
      board,
      0.007,
      0.021,
      0.011,
      -0.082,
      0.24 + i * 0.019,
      -0.122,
      dark,
      0.001,
    );
  const cpu = add("cpu", [0.38, 0.3, -0.24]);
  box(
    cpu,
    0.002,
    0.04,
    0.04,
    -0.084,
    0.33,
    -0.023,
    pbr("circuit", "#3b645a"),
    0.001,
  );
  box(
    cpu,
    0.003,
    0.034,
    0.034,
    -0.08,
    0.33,
    -0.023,
    pbr("brushed", "#c6cbd0"),
    0.002,
  );
  repeated(
    cpu,
    [0.001, 0.002, 0.002],
    Array.from({ length: 12 }, (_, i) => [
      -0.082,
      0.313 + (i % 4) * 0.01,
      -0.038 + Math.floor(i / 4) * 0.015,
    ]),
    pbr("brushed", "#b6a16e"),
  );
  const gpu = add("gpu", [0.46, -0.03, 0.12]);
  const gs = catalog.skus.find(
    (s) => s.id === p.instances.find((i) => i.id === "gpu")?.skuId,
  );
  const gl = (gs?.specs.gpuLength ?? 338) / 1000;
  const gt = (gs?.specs.gpuThickness ?? 50) / 1000;
  const gpuMat = pbr("metal", color("gpu")),
    gpuBottom = 0.192 - gt / 2,
    gpuTop = 0.192 + gt / 2;
  box(
    gpu,
    0.13,
    0.002,
    gl * 0.96,
    -0.023,
    gpuTop - 0.003,
    -0.016,
    pbr("circuit", "#253932"),
    0.001,
  );
  box(gpu, 0.14, 0.004, gl, -0.023, gpuTop + 0.001, -0.016, gpuMat, 0.002);
  repeated(
    gpu,
    [0.122, gt - 0.012, 0.0012],
    Array.from({ length: 66 }, (_, i) => [
      -0.023,
      0.192,
      -0.016 - gl * 0.46 + (i * gl * 0.92) / 65,
    ]),
    pbr("brushed", "#738795"),
  );
  for (const x of [-0.09, 0.044])
    box(gpu, 0.008, 0.015, gl, x, gpuBottom + 0.007, -0.016, gpuMat, 0.002);
  for (const z of [-0.016 - gl / 2, -0.016 + gl / 2])
    box(gpu, 0.14, gt, 0.005, -0.023, 0.192, z, gpuMat, 0.002);
  for (const x of [-0.063, 0.01])
    tube(
      gpu,
      [
        [x, 0.181, -gl * 0.4],
        [x, 0.181, gl * 0.36],
      ],
      0.003,
      pbr("brushed", "#9e7858"),
    );
  for (const z of [-gl * 0.38, 0, gl * 0.38]) fastener(gpu, 0.049, 0.2, z);
  box(
    gpu,
    0.014,
    0.016,
    0.024,
    0.05,
    gpuTop - 0.004,
    0.075,
    pbr("plastic", "#25343e"),
    0.002,
  );
  for (let i = 0; i < 3; i++) {
    const f = fan(
      gpu,
      -0.023,
      gpuBottom - 0.004,
      -gl * 0.32 - 0.016 + i * gl * 0.32,
      Math.min(0.097, gl * 0.29),
      false,
    );
    f.rotation.x = Math.PI / 2;
  }
  box(
    gpu,
    0.004,
    0.013,
    0.21,
    0.05,
    0.196,
    -0.016,
    material("#80dfff", true),
    0,
  );
  const ram = add("ram", [0.38, 0.3, 0.15]);
  for (const [n, z] of [0.062, 0.085].entries()) {
    const stick = new T.Group();
    stick.userData.instanceId = "ram-" + (n + 1);
    ram.add(stick);
    groups.set("ram-" + (n + 1), stick);
    box(stick, 0.022, 0.135, 0.007, -0.063, 0.33, z, color("ram"), 0.002);
    box(
      stick,
      0.003,
      0.132,
      0.008,
      -0.081,
      0.33,
      z,
      pbr("circuit", "#243c39"),
      0.001,
    );
    repeated(
      stick,
      [0.001, 0.003, 0.006],
      Array.from({ length: 20 }, (_, i) => [-0.083, 0.267 + i * 0.0063, z]),
      pbr("brushed", "#c7ad6f"),
    );
    repeated(
      stick,
      [0.002, 0.004, 0.006],
      Array.from({ length: 16 }, (_, i) => [-0.05, 0.278 + i * 0.0066, z]),
      pbr("brushed", "#9dacba"),
    );
    if (typeof document !== "undefined")
      hardwareLabel(stick, "DDR5", -0.05, 0.327, z + 0.003, 0.006, 0.026);
    box(
      stick,
      0.026,
      0.135,
      0.003,
      -0.06,
      0.33,
      z + 0.004,
      material("#7deaff", true),
      0.001,
    );
  }
  const ssd = add("ssd", [0.41, -0.11, -0.27]);
  box(ssd, 0.008, 0.022, 0.08, -0.087, 0.248, -0.046, "#395875", 0.001);
  box(ssd, 0.004, 0.016, 0.052, -0.08, 0.248, -0.046, silver, 0.001);
  repeated(
    ssd,
    [0.004, 0.016, 0.013],
    [
      [-0.079, 0.248, -0.071],
      [-0.079, 0.248, -0.05],
      [-0.079, 0.248, -0.027],
    ],
    pbr("plastic", "#182b35"),
  );
  fastener(ssd, -0.076, 0.248, -0.085, "x", 0.002);
  if (typeof document !== "undefined")
    hardwareLabel(ssd, "NVMe", -0.075, 0.248, -0.046, 0.035, 0.009);
  const psu = add("psu", [0.1, 0.04, 0.48]);
  box(psu, 0.15, 0.086, 0.15, -0.02, 0.078, -0.105, color("psu"), 0.006);
  for (let i = 0; i < 7; i++)
    box(psu, 0.002, 0.04, 0.003, 0.057, 0.078, -0.15 + i * 0.012, dark, 0);
  for (const z of [-0.14, -0.11, -0.08]) {
    box(
      psu,
      0.005,
      0.023,
      0.018,
      0.058,
      0.075,
      z,
      pbr("plastic", "#29363f"),
      0.002,
    );
    repeated(
      psu,
      [0.001, 0.004, 0.003],
      Array.from({ length: 6 }, (_, i) => [
        0.061,
        0.068 + Math.floor(i / 3) * 0.009,
        z - 0.005 + (i % 3) * 0.005,
      ]),
      pbr("brushed", "#9b9583"),
    );
  }
  // Back-panel sockets have separate metal shells, recessed plastic and contacts.
  const rear = pbr("metal", color("case")),
    socket = pbr("plastic", "#17242c");
  box(chassis, 0.034, 0.135, 0.006, -0.092, 0.345, -0.222, rear, 0.002);
  for (let i = 0; i < 4; i++) {
    box(
      chassis,
      0.023,
      0.011,
      0.003,
      -0.092,
      0.302 + i * 0.022,
      -0.227,
      pbr("brushed", "#a4afb5"),
      0.001,
    );
    box(
      chassis,
      0.019,
      0.007,
      0.002,
      -0.092,
      0.302 + i * 0.022,
      -0.229,
      socket,
      0.0007,
    );
    repeated(
      chassis,
      [0.0015, 0.001, 0.001],
      Array.from({ length: 4 }, (_, n) => [
        -0.098 + n * 0.004,
        0.302 + i * 0.022,
        -0.2305,
      ]),
      pbr("brushed", "#b69a57"),
    );
  }
  for (const x of [-0.11, 0.105])
    for (const y of [0.07, 0.445]) fastener(chassis, x, y, -0.231, "z");
  box(psu, 0.028, 0.023, 0.004, -0.057, 0.076, -0.183, socket, 0.002);
  repeated(
    psu,
    [0.003, 0.009, 0.003],
    [
      [-0.065, 0.076, -0.186],
      [-0.049, 0.076, -0.186],
      [-0.057, 0.082, -0.186],
    ],
    pbr("brushed", "#b6bdc1"),
  );
  box(psu, 0.014, 0.019, 0.004, -0.018, 0.076, -0.183, socket, 0.002);
  box(
    psu,
    0.009,
    0.012,
    0.002,
    -0.018,
    0.076,
    -0.186,
    pbr("plastic", "#46535d"),
    0.001,
  );
  for (const x of [-0.078, 0.038])
    for (const y of [0.047, 0.108]) fastener(psu, x, y, -0.183, "z", 0.002);
  // Separate return lips make the removable steel panel readable from the back.
  for (const z of [-0.211, 0.211])
    box(chassis, 0.008, 0.414, 0.006, -0.121, 0.244, z, rear, 0.001);
  for (const y of [0.039, 0.455])
    box(chassis, 0.008, 0.006, 0.422, -0.121, y, 0, rear, 0.001);
  const aio = add("aio", [0, 0.35, 0]);
  for (const x of [-0.057, 0.057])
    box(
      aio,
      0.007,
      0.025,
      0.394,
      x,
      0.443,
      -0.007,
      pbr("metal", color("aio")),
      0.002,
    );
  for (const z of [-0.197, 0.183])
    box(
      aio,
      0.12,
      0.025,
      0.014,
      0,
      0.443,
      z,
      pbr("metal", color("aio")),
      0.003,
    );
  repeated(
    aio,
    [0.104, 0.021, 0.001],
    Array.from({ length: 88 }, (_, i) => [0, 0.443, -0.181 + i * 0.0041]),
    pbr("brushed", "#647580"),
  );
  for (let i = 0; i < 3; i++) {
    const f = fan(aio, 0, 0.415, -0.14 + i * 0.132);
    f.rotation.x = Math.PI / 2;
  }
  box(aio, 0.04, 0.052, 0.052, -0.037, 0.33, -0.023, color("aio"), 0.014);
  box(
    aio,
    0.003,
    0.032,
    0.032,
    -0.015,
    0.33,
    -0.023,
    material("#8eeaff", true),
    0.008,
  );
  for (const z of [-0.046, -0.015])
    tube(
      aio,
      [
        [-0.02, 0.33, z],
        [0.07, 0.32, z + 0.02],
        [0.065, 0.39, z - 0.07],
        [0, 0.42, -0.14],
      ],
      0.005,
      pbr("plastic", "#9eabb6"),
    );
  const fans = add("fan", [0.3, 0, 0.42]);
  for (let i = 0; i < 2; i++) fan(fans, 0, 0.276 + i * 0.135, 0.2);
  const strip = add("strip", [0.33, 0.05, 0.23]);
  box(strip, 0.009, 0.005, 0.38, 0.105, 0.039, 0, material("#80e4ff", true), 0);
  cableBundle(
    gpu,
    [
      [0.059, gpuTop, 0.075],
      [0.088, 0.255, 0.09],
      [0.1, 0.135, 0.1],
      [0.087, 0.08, -0.02],
      [0.061, 0.078, -0.08],
    ],
    8,
  );
  cableBundle(
    board,
    [
      [-0.085, 0.347, 0.098],
      [0.021, 0.35, 0.132],
      [0.102, 0.273, 0.148],
      [0.108, 0.11, 0.09],
      [0.085, 0.078, -0.07],
      [0.061, 0.078, -0.11],
    ],
    6,
  );
  tube(
    chassis,
    [
      [-0.02, 0.075, -0.1],
      [0.09, 0.09, -0.06],
      [0.085, 0.19, 0.08],
      [0.025, 0.2, 0.08],
    ],
    0.005,
    white,
  );
  for (const [id, group] of groups) {
    if (id.startsWith("ram-")) continue;
    group.traverse((o) => {
      if (!(o instanceof T.Mesh) || Array.isArray(o.material)) return;
      const m = o.material as T.MeshStandardMaterial;
      if (
        m.userData.surface ||
        m.userData.led ||
        m.transparent ||
        m.map ||
        !m.color
      )
        return;
      o.material = pbr(
        id === "ssd" ? "plastic" : "metal",
        `#${m.color.getHexString()}`,
      );
    });
  }
  // A small distant case occupies only a few dozen pixels in a room view. Keep
  // the authoring geometry intact, but render a structural silhouette at that distance.
  const distant = new T.Group();
  distant.name = "PC_DistantStructure";
  distant.userData.instanceId = "case";
  distant.visible = false;
  root.add(distant);
  box(
    distant,
    0.003,
    0.305,
    0.244,
    -0.107,
    0.276,
    -0.02,
    pbr("circuit", "#243d43"),
    0,
  );
  box(
    distant,
    0.15,
    0.086,
    0.15,
    -0.02,
    0.078,
    -0.105,
    pbr("metal", color("psu")),
    0.004,
  );
  box(
    distant,
    0.14,
    gt,
    gl,
    -0.023,
    0.192,
    -0.016,
    pbr("metal", color("gpu")),
    0.003,
  );
  box(
    distant,
    0.035,
    0.08,
    0.22,
    -0.08,
    0.35,
    -0.025,
    pbr("brushed", "#b9c6cd"),
    0.002,
  );
  box(
    distant,
    0.04,
    0.052,
    0.052,
    -0.037,
    0.33,
    -0.023,
    pbr("metal", color("aio")),
    0.004,
  );
  for (const z of [0.062, 0.085])
    box(
      distant,
      0.007,
      0.134,
      0.012,
      -0.077,
      0.33,
      z,
      pbr("metal", color("ram")),
      0.001,
    );
  for (const y of [0.276, 0.411]) {
    box(
      distant,
      0.12,
      0.12,
      0.023,
      0,
      y,
      0.2,
      pbr("plastic", "#dce3e8"),
      0.004,
    );
    const face = new T.Mesh(
      new T.CircleGeometry(0.048, 24),
      pbr("plastic", "#9aabb9"),
    );
    face.position.set(0, y, 0.213);
    distant.add(face);
    const rim = new T.Mesh(
      new T.RingGeometry(0.049, 0.052, 24),
      pbr("diffuser", "#9edfff"),
    );
    rim.position.set(0, y, 0.214);
    distant.add(rim);
  }
  tube(
    distant,
    [
      [-0.04, 0.35, -0.025],
      [0.07, 0.4, -0.12],
      [0.09, 0.41, 0.04],
    ],
    0.005,
    pbr("rubber", "#c7d1d9"),
  );
  return { root, groups, parts, panel, distant };
}
export function applyExplosion(parts: Part[], value: number) {
  for (const part of parts)
    part.object.position.copy(part.home).addScaledVector(part.offset, value);
}
