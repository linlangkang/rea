import * as T from "three";
import { box, cylinder, material, tube } from "./models";
import { makePanorama } from "./panorama";
import { pbr, metricUV } from "./surfaces";
import { plant } from "./soft";
import { ROOM_LAYOUT } from "./layout";
import { snack } from "./snacks";
import { addRoomDetails } from "./room-details";
export function makeRoom(size: number[], scenery = "mountain") {
  const g = new T.Group(),
    [w, d, h] = size;
  g.add(makePanorama(w, d, h, scenery));
  box(g, w, 0.12, d, 0, -0.06, 0, pbr("wood", "#f1dfc5"), 0.005);
  const wallMat = pbr("paint", "#e8e1d5");
  function wall(
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    rotation: number,
  ) {
    const geo = new T.PlaneGeometry(width, height);
    metricUV(geo);
    const m = new T.Mesh(geo, wallMat);
    m.position.set(x, y, z);
    m.rotation.y = rotation;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }
  wall(d, h, w / 2, h / 2, 0, -Math.PI / 2);
  // Recessed outlets belong to the solid wall, never to the glass panes.
  for (const z of [1.7, 2.8]) {
    box(
      g,
      0.015,
      0.1,
      0.16,
      w / 2 - 0.01,
      0.32,
      z,
      pbr("plastic", "#ece8df"),
      0.004,
    );
    for (const dz of [-0.045, 0.045])
      for (const dy of [-0.011, 0.011])
        box(
          g,
          0.004,
          0.018,
          0.004,
          w / 2 - 0.02,
          0.32 + dy,
          z + dz,
          pbr("rubber", "#373b3b"),
          0.001,
        );
  }
  // Inferred entrance wall, with a real opening and frame; not a window-side headboard.
  const doorX = ROOM_LAYOUT.door[0],
    doorW = 1.12,
    doorH = 2.24;
  const leftW = w / 2 + doorX - doorW / 2,
    rightW = w / 2 - doorX - doorW / 2;
  wall(leftW, h, -w / 2 + leftW / 2, h / 2, d / 2, Math.PI);
  wall(rightW, h, w / 2 - rightW / 2, h / 2, d / 2, Math.PI);
  wall(doorW, h - doorH, doorX, doorH + (h - doorH) / 2, d / 2, Math.PI);
  const door = box(
    g,
    doorW - 0.03,
    doorH - 0.025,
    0.045,
    doorX,
    doorH / 2,
    d / 2 - 0.01,
    pbr("wood", "#c9ae88"),
    0.006,
  );
  door.name = "entrance-door";
  for (const x of [doorX - doorW / 2 - 0.025, doorX + doorW / 2 + 0.025])
    box(
      g,
      0.065,
      doorH + 0.08,
      0.08,
      x,
      doorH / 2,
      d / 2 - 0.025,
      pbr("lacquer", "#e7dfd1"),
      0.006,
    );
  box(
    g,
    doorW + 0.13,
    0.07,
    0.08,
    doorX,
    doorH + 0.015,
    d / 2 - 0.025,
    pbr("lacquer", "#e7dfd1"),
    0.006,
  );
  for (const y of [0.28, 1.1, 2])
    cylinder(
      g,
      0.012,
      0.075,
      doorX - doorW / 2 + 0.045,
      y,
      d / 2 - 0.052,
      pbr("brushed", "#a5a6a3"),
    );
  box(
    g,
    0.025,
    0.12,
    0.02,
    doorX + 0.38,
    1.05,
    d / 2 - 0.045,
    pbr("brushed", "#bfc0ba"),
    0.008,
  );
  box(
    g,
    0.14,
    0.016,
    0.045,
    doorX + 0.33,
    1.06,
    d / 2 - 0.07,
    pbr("brushed", "#bfc0ba"),
    0.006,
  );
  const ceiling = new T.Mesh(
    new T.PlaneGeometry(w, d),
    pbr("paint", "#f0eadd"),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h;
  ceiling.receiveShadow = true;
  g.add(ceiling);
  const metal = pbr("metal", "#303b41"),
    glass = pbr("glass", "#eef7fa");
  for (const side of [0, 1]) {
    const win = new T.Group(),
      length = side ? d : w;
    for (let x = -length / 2; x <= length / 2; x += length / 4)
      box(win, 0.06, h, 0.1, x, h / 2, 0, metal, 0.006);
    for (const y of [0.045, h - 0.045])
      box(win, length, 0.09, 0.1, 0, y, 0, metal, 0.005);
    box(win, length, 0.038, 0.06, 0, 0.92, 0, metal, 0.003);
    const pane = box(
      win,
      length - 0.09,
      h - 0.16,
      0.012,
      0,
      h / 2,
      0.015,
      glass,
      0,
    );
    pane.castShadow = false;
    pane.userData.noPick = true;
    if (side) {
      win.rotation.y = Math.PI / 2;
      win.position.x = -w / 2;
    } else win.position.z = -d / 2;
    g.add(win);
  }
  // Pleated fabric curtains instead of solid cylinders.
  for (const x of [-w / 2 + 0.28, w / 2 - 0.28]) {
    const geo = new T.PlaneGeometry(0.68, h - 0.13, 48, 24),
      pos = geo.getAttribute("position"),
      uv = geo.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      const xx = pos.getX(i),
        yy = pos.getY(i);
      pos.setZ(
        i,
        Math.sin(xx * 83) * 0.042 + 0.012 * Math.sin(yy * 6 + xx * 13),
      );
      uv.setXY(i, xx, yy);
    }
    geo.computeVertexNormals();
    const mat = pbr("cotton", "#d0c8b9", true);
    const curtain = new T.Mesh(geo, mat);
    curtain.position.set(x, h / 2, -d / 2 + 0.12);
    curtain.castShadow = curtain.receiveShadow = true;
    g.add(curtain);
  }
  const warm = new T.MeshStandardMaterial({
    color: "#fff0ca",
    emissive: "#ffda9c",
    emissiveIntensity: 1,
  });
  warm.userData.warm = true;
  for (const x of [-w / 2 + 0.09, w / 2 - 0.09]) {
    box(g, 0.18, 0.12, d, x, h - 0.07, 0, pbr("paint", "#eee5d8"), 0.015);
    box(g, 0.025, 0.012, d - 0.12, x, h - 0.145, 0, warm, 0);
    box(g, 0.025, 0.1, d, x, 0.05, 0, pbr("lacquer", "#d6cabb"), 0.003);
  }
  for (const z of [-2.6, 0, 2.6])
    for (const x of [-1.4, 1.4]) {
      cylinder(g, 0.066, 0.012, x, h - 0.015, z, pbr("brushed", "#c9c5bb"));
      cylinder(g, 0.047, 0.014, x, h - 0.026, z, warm);
    }
  const consoleX = w / 2 - 0.32;
  box(
    g,
    0.58,
    0.43,
    2.85,
    consoleX,
    0.3,
    0.35,
    pbr("lacquer", "#eee7dc"),
    0.012,
  );
  box(g, 0.48, 0.1, 2.72, consoleX, 0.08, 0.35, pbr("paint", "#807b72"), 0.005);
  box(g, 0.48, 0.012, 2.65, consoleX, 0.14, 0.35, material("#70c9ff", true), 0);
  for (let z = -0.79; z < 1.7; z += 0.57) {
    box(
      g,
      0.018,
      0.35,
      0.555,
      w / 2 - 0.62,
      0.31,
      z,
      pbr("lacquer", "#eee7dc"),
      0.004,
    );
    box(
      g,
      0.015,
      0.025,
      0.19,
      w / 2 - 0.64,
      0.44,
      z,
      pbr("brushed", "#a19c92"),
      0.003,
    );
  }
  box(g, 3.2, 0.018, 3.65, 1.05, 0.012, -0.45, pbr("rug", "#b7b7ae"), 0.02);
  // Straight hem follows the rug perimeter; a sparse Catmull-Rom loop overshoots the corners.
  const hem = new T.CurvePath<T.Vector3>();
  const corners = [
    [-0.53, 0.023, -2.255],
    [2.63, 0.023, -2.255],
    [2.63, 0.023, 1.355],
    [-0.53, 0.023, 1.355],
    [-0.53, 0.023, -2.255],
  ];
  for (let i = 1; i < corners.length; i++)
    hem.add(
      new T.LineCurve3(
        new T.Vector3(...(corners[i - 1] as [number, number, number])),
        new T.Vector3(...(corners[i] as [number, number, number])),
      ),
    );
  g.add(
    new T.Mesh(
      new T.TubeGeometry(hem, 64, 0.003, 4, false),
      pbr("cotton", "#9fa6a5"),
    ),
  );
  const [cx, , cz] = ROOM_LAYOUT.coffee;
  box(g, 0.69, 0.32, 1.32, cx, 0.19, cz, pbr("marble", "#d8d6d0"), 0.012);
  const slab = box(
    g,
    0.95,
    0.06,
    1.57,
    cx,
    0.38,
    cz,
    pbr("marble", "#ffffff"),
    0.012,
  );
  slab.name = "连续整板石材茶几";
  box(
    g,
    0.24,
    0.031,
    0.32,
    cx,
    0.427,
    cz + 0.15,
    pbr("paint", "#d8d0bc"),
    0.002,
  );
  for (const y of [0.412, 0.444])
    box(
      g,
      0.248,
      0.003,
      0.327,
      cx,
      y,
      cz + 0.15,
      pbr("cotton", "#53697b"),
      0.002,
    );
  box(
    g,
    0.004,
    0.032,
    0.327,
    cx - 0.122,
    0.428,
    cz + 0.15,
    pbr("cotton", "#53697b"),
    0.001,
  );
  for (let n = 0; n < 7; n++)
    box(
      g,
      0.001,
      0.0005,
      0.3,
      cx + 0.121,
      0.416 + n * 0.0035,
      cz + 0.15,
      pbr("paint", "#aaa38f"),
      0,
    );
  const mugProfile = [
    [0, 0],
    [0.039, 0],
    [0.047, 0.008],
    [0.052, 0.082],
    [0.052, 0.09],
    [0.047, 0.09],
    [0.047, 0.082],
    [0.042, 0.013],
    [0, 0.013],
  ].map((p) => new T.Vector2(p[0], p[1]));
  const mug = new T.Mesh(
    new T.LatheGeometry(mugProfile, 64),
    pbr("lacquer", "#d5cfbb"),
  );
  mug.position.set(cx, 0.413, cz - 0.42);
  mug.castShadow = mug.receiveShadow = true;
  g.add(mug);
  tube(
    g,
    [
      [cx + 0.048, 0.489, cz - 0.42],
      [cx + 0.081, 0.483, cz - 0.42],
      [cx + 0.083, 0.45, cz - 0.42],
      [cx + 0.048, 0.442, cz - 0.42],
    ],
    0.006,
    pbr("lacquer", "#d5cfbb"),
  );
  const shelfX = w / 2 - 0.3,
    shelfZ = -2.38;
  box(
    g,
    0.5,
    2.35,
    0.032,
    shelfX,
    1.2,
    shelfZ - 0.43,
    pbr("wood", "#d9b98d"),
    0.003,
  );
  for (const z of [shelfZ - 0.46, shelfZ + 0.46])
    box(g, 0.57, 2.35, 0.035, shelfX, 1.2, z, pbr("wood", "#d9b98d"), 0.004);
  // Shelf opens toward the room (-X).
  box(
    g,
    0.035,
    2.35,
    0.94,
    w / 2 - 0.05,
    1.2,
    shelfZ,
    pbr("wood", "#d9b98d"),
    0.004,
  );
  for (let y = 0.35; y < 2.5; y += 0.47) {
    box(g, 0.57, 0.035, 0.94, shelfX, y, shelfZ, pbr("wood", "#d9b98d"), 0.004);
    box(g, 0.015, 0.012, 0.84, w / 2 - 0.57, y - 0.03, shelfZ, warm, 0);
    for (let n = 0; n < 3; n++) {
      if (y > 2.2) continue; // Reserved for the licensed Poly Haven pantry model.
      const z = shelfZ - 0.28 + n * 0.28,
        item = snack((Math.round((y - 0.35) / 0.47) * 3 + n + 5) % 12);
      item.rotation.y = -Math.PI / 2;
      item.position.set(w / 2 - 0.36, y + 0.018, z);
      g.add(item);
    }
  }
  plant(g, -w / 2 + 0.5, -d / 2 + 0.8, 1.1);
  plant(g, w / 2 - 0.7, -d / 2 + 0.5, 0.65);
  plant(g, w / 2 - 0.7, 2, 0.75);
  addRoomDetails(g, w, d, h);
  return g;
}
