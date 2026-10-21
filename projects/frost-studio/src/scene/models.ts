import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Category, SKU } from "../domain/schema";
import { pbr, metricUV } from "./surfaces";
import { cushion, cloth } from "./soft";
import { stockedFridge } from "./snacks";
export const geometries = new Map<string, T.BufferGeometry>();
export const materials = new Map<string, T.MeshStandardMaterial>();
export function geometry(key: string, make: () => T.BufferGeometry) {
  if (!geometries.has(key)) geometries.set(key, make());
  return geometries.get(key)!;
}
export const white = "#e3eaf3",
  blue = "#437ba9",
  dark = "#152538",
  silver = "#9facbc";
export function material(color: string, emissive = false) {
  const key = color + ":" + emissive;
  if (materials.has(key)) return materials.get(key)!;
  const m = new T.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0,
  });
  if (emissive) {
    m.name = "surface:diffuser";
    m.emissive.set(color);
    m.emissiveIntensity = 1.4;
    m.userData.led = true;
  }
  materials.set(key, m);
  return m;
}
export function box(
  g: T.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string | T.Material = white,
  round = 0.015,
) {
  const geo = round
    ? geometry(
        `r:${w}:${h}:${d}:${round}`,
        () =>
          new RoundedBoxGeometry(
            w,
            h,
            d,
            3,
            Math.min(round, w / 3, h / 3, d / 3),
          ),
      )
    : geometry(`b:${w}:${h}:${d}`, () => new T.BoxGeometry(w, h, d));
  const surface = typeof color === "string" ? material(color) : color;
  const mapped = surface.userData.surface
    ? geometry("metric:" + geo.uuid, () => {
        const copy = geo.clone();
        metricUV(copy);
        return copy;
      })
    : geo;
  const m = new T.Mesh(mapped, surface);
  m.position.set(x, y, z);
  m.castShadow = w > 0.1 && h > 0.05;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
export function cylinder(
  g: T.Object3D,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  color: string | T.Material = white,
) {
  const m = new T.Mesh(
    geometry(`c:${r}:${h}`, () => new T.CylinderGeometry(r, r, h, 48)),
    typeof color === "string" ? material(color) : color,
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
export function tube(
  g: T.Object3D,
  pts: number[][],
  radius = 0.008,
  color: string | T.Material = white,
) {
  const curve = new T.CatmullRomCurve3(
    pts.map((p) => new T.Vector3(...(p as [number, number, number]))),
  );
  const m = new T.Mesh(
    new T.TubeGeometry(curve, 32, radius, 12, false),
    typeof color === "string" ? material(color) : color,
  );
  g.add(m);
  return m;
}
export function ring(
  g: T.Object3D,
  r: number,
  x: number,
  y: number,
  z: number,
  color: string | T.Material,
) {
  const m = new T.Mesh(
    geometry(`t:${r}`, () => new T.TorusGeometry(r, r * 0.065, 8, 32)),
    typeof color === "string" ? material(color) : color,
  );
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
export function keyboard(g: T.Object3D, w = 0.36, d = 0.14, color = white) {
  box(g, w, 0.012, d, 0, 0.006, 0, pbr("metal", color), 0.004);
  box(
    g,
    w - 0.006,
    0.005,
    d - 0.006,
    0,
    0.014,
    0,
    pbr("brushed", "#7b8794"),
    0.002,
  );
  box(
    g,
    w - 0.014,
    0.002,
    d - 0.014,
    0,
    0.017,
    0,
    pbr("rubber", "#273039"),
    0.001,
  );
  const geo = geometry(`pbt-key-${w}-${d}`, () => {
    const geo = new RoundedBoxGeometry(
        (w / 15) * 0.86,
        0.009,
        (d / 6) * 0.84,
        4,
        0.0014,
      ),
      pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++)
      if (pos.getY(i) > 0.002) {
        const nx = pos.getX(i) / ((w / 30) * 0.86),
          nz = pos.getZ(i) / ((d / 12) * 0.84);
        pos.setY(
          i,
          pos.getY(i) -
            0.0012 * Math.max(0, 1 - nx * nx) * Math.max(0, 1 - nz * nz),
        );
      }
    geo.computeVertexNormals();
    metricUV(geo);
    return geo;
  });
  const keys = new T.InstancedMesh(geo, pbr("pbt", "#d8e1e8"), 70);
  const switches = new T.InstancedMesh(
    geometry("led-collar", () => new T.BoxGeometry(0.017, 0.002, 0.017)),
    pbr("diffuser", "#8cd9f2"),
    70,
  );
  const mat = new T.Matrix4();
  const labels = [
    "Esc",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "0",
    "-",
    "=",
    "Del",
    "Tab",
    "Q",
    "W",
    "E",
    "R",
    "T",
    "Y",
    "U",
    "I",
    "O",
    "P",
    "[",
    "]",
    "\\",
    "Caps",
    "A",
    "S",
    "D",
    "F",
    "G",
    "H",
    "J",
    "K",
    "L",
    ";",
    "'",
    "Enter",
    "Fn",
    "Shift",
    "Z",
    "X",
    "C",
    "V",
    "B",
    "N",
    "M",
    ",",
    ".",
    "/",
    "Up",
    "Shift",
    "End",
    "Ctrl",
    "Win",
    "Alt",
    "",
    "",
    "",
    "Space",
    "",
    "",
    "",
    "Alt",
    "Left",
    "Down",
    "Right",
  ];
  const atlas = document.createElement("canvas");
  atlas.width = 1024;
  atlas.height = 512;
  const ctx = atlas.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 14; col++) {
      const index = row * 14 + col,
        z = ((row - 2) * d) / 6;
      if (row === 4 && [3, 4, 5, 7, 8].includes(col)) {
        mat.makeScale(0, 0, 0);
        keys.setMatrixAt(index, mat);
        switches.setMatrixAt(index, mat);
        continue;
      }
      const space = row === 4 && col === 6,
        x = (((space ? 5.5 : col) - 6.5) * w) / 15,
        sx = space ? ((6 * w) / 15 - 0.008) / ((w / 15) * 0.86) : 1;
      mat.makeScale(sx, 1, 1);
      mat.setPosition(x, 0.023, z);
      keys.setMatrixAt(index, mat);
      mat.setPosition(x, 0.018, z);
      switches.setMatrixAt(index, mat);
      ctx.fillText(
        labels[index] ?? "",
        ((col + 0.5) * 1024) / 14,
        ((row + 0.5) * 512) / 5,
      );
      const start = positions.length / 3,
        a = col / 14,
        b = (col + 1) / 14,
        top = 1 - row / 5,
        bottom = 1 - (row + 1) / 5;
      positions.push(
        x - 0.007,
        0.028,
        z - 0.007,
        x + 0.007,
        0.028,
        z - 0.007,
        x + 0.007,
        0.028,
        z + 0.007,
        x - 0.007,
        0.028,
        z + 0.007,
      );
      uvs.push(a, top, b, top, b, bottom, a, bottom);
      indices.push(start, start + 2, start + 1, start, start + 3, start + 2);
    }
  keys.castShadow = true;
  keys.receiveShadow = true;
  g.add(keys, switches);
  const map = new T.CanvasTexture(atlas);
  map.colorSpace = T.SRGBColorSpace;
  const legends = new T.MeshStandardMaterial({
    map,
    color: "#425569",
    emissiveMap: map,
    emissive: "#8bd8fa",
    emissiveIntensity: 0.18,
    alphaTest: 0.4,
    roughness: 0.7,
    side: T.DoubleSide,
  });
  legends.userData.led = true;
  legends.name = "keyboard:backlit-legends";
  const legendGeo = new T.BufferGeometry();
  legendGeo.setAttribute(
    "position",
    new T.Float32BufferAttribute(positions, 3),
  );
  legendGeo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  legendGeo.setIndex(indices);
  legendGeo.computeVertexNormals();
  g.add(new T.Mesh(legendGeo, legends));
  for (const x of [-w * 0.4, w * 0.4])
    box(
      g,
      0.026,
      0.004,
      0.02,
      x,
      -0.001,
      d * 0.3,
      pbr("rubber", "#29303a"),
      0.002,
    );
  box(
    g,
    0.012,
    0.005,
    0.004,
    -w * 0.3,
    0.009,
    -d / 2 - 0.001,
    pbr("plastic", "#1c2630"),
    0.001,
  );
  box(
    g,
    0.009,
    0.002,
    0.005,
    -w * 0.3,
    0.009,
    -d / 2 - 0.002,
    pbr("brushed", "#788593"),
    0.0005,
  );
}
export function screen(
  g: T.Object3D,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  texture: T.Texture,
) {
  box(g, w + 0.018, h + 0.018, 0.028, x, y, z, dark, 0.009);
  const m = new T.MeshBasicMaterial({ map: texture, toneMapped: false });
  m.userData.screen = true;
  const panel = box(g, w, h, 0.002, x, y, z + 0.015, m, 0);
  panel.name = "Frost_DynamicScreen";
  return panel;
}
export function fan(
  g: T.Object3D,
  x: number,
  y: number,
  z: number,
  size = 0.12,
) {
  const f = new T.Group();
  f.position.set(x, y, z);
  g.add(f);
  box(f, size, size, 0.022, 0, 0, 0, white, 0.007);
  ring(f, size * 0.4, 0, 0, 0.013, material("#78dbff", true));
  const center = cylinder(f, size * 0.09, 0.014, 0, 0, 0.018, white);
  center.rotation.x = Math.PI / 2;
  for (let i = 0; i < 7; i++) {
    const blade = box(
      f,
      size * 0.14,
      size * 0.31,
      0.005,
      0,
      0,
      0.017,
      silver,
      0.006,
    );
    const a = (i * Math.PI * 2) / 7;
    blade.position.x = Math.sin(a) * size * 0.21;
    blade.position.y = Math.cos(a) * size * 0.21;
    blade.rotation.z = -a + 0.5;
  }
  return f;
}
export function makeModel(
  category: Category,
  sku: SKU,
  color: string | null,
  texture: T.Texture,
) {
  const g = new T.Group();
  const c = color ?? white;
  const dim = sku.dimensionsMm?.map((n) => n / 1000);
  let base: [number, number, number] | undefined;
  switch (category) {
    case "桌子": {
      base = [2.8, 0.75, 0.9];
      box(g, 2.8, 0.055, 0.9, 0, 0.752, 0, pbr("lacquer", c), 0.008);
      box(
        g,
        1.05,
        0.003,
        0.42,
        0,
        0.782,
        0.15,
        pbr("cotton", "#7090a2"),
        0.009,
      );
      tube(
        g,
        [
          [-0.51, 0.784, -0.05],
          [-0.51, 0.784, 0.35],
          [0.51, 0.784, 0.35],
          [0.51, 0.784, -0.05],
        ],
        0.0012,
        pbr("cotton", "#b5c6d0"),
      );
      for (const x of [-1.25, 1.25])
        box(g, 0.3, 0.008, 0.69, x, 0.008, 0, pbr("rubber", "#30383e"), 0.004);
      for (const x of [-1.25, 1.25]) {
        box(g, 0.075, 0.7, 0.075, x, 0.37, 0, pbr("metal", c), 0.006);
        box(g, 0.32, 0.04, 0.72, x, 0.03, 0, pbr("metal", silver), 0.006);
      }
      box(g, 0.48, 0.69, 0.7, -1.12, 0.355, 0, pbr("lacquer", c), 0.012);
      for (let j = 0; j < 3; j++) {
        box(
          g,
          0.45,
          0.215,
          0.018,
          -1.12,
          0.15 + j * 0.225,
          0.36,
          pbr("lacquer", c),
          0.004,
        );
        box(
          g,
          0.16,
          0.012,
          0.023,
          -1.12,
          0.19 + j * 0.225,
          0.376,
          pbr("brushed", "#b6b9bc"),
          0.003,
        );
      }
      box(g, 2.52, 0.06, 0.055, 0, 0.5, -0.3, silver);
      box(g, 2.7, 0.012, 0.012, 0, 0.72, 0.441, material("#6ce4ff", true), 0);
      box(g, 1.1, 0.045, 0.12, 0, 0.65, -0.34, dark);
      cylinder(g, 0.019, 0.4, 0.07, 0.97, -0.3, silver);
      box(g, 0.67, 0.025, 0.04, 0.07, 1.02, -0.245, silver);
      box(g, 0.085, 0.08, 0.09, 0.07, 0.75, -0.39, silver);
      break;
    }
    case "椅子": {
      base = [0.65, 1.25, 0.65];
      cylinder(g, 0.055, 0.36, 0, 0.26, 0, silver);
      for (let n = 0; n < 5; n++) {
        const a = (n * Math.PI * 2) / 5;
        tube(
          g,
          [
            [0, 0.12, 0],
            [Math.sin(a) * 0.27, 0.1, Math.cos(a) * 0.27],
          ],
          0.02,
          silver,
        );
        const wh = cylinder(
          g,
          0.038,
          0.04,
          Math.sin(a) * 0.27,
          0.055,
          Math.cos(a) * 0.27,
          dark,
        );
        wh.rotation.z = Math.PI / 2;
      }
      cushion(g, 0.5, 0.13, 0.48, 0, 0.51, 0, c);
      cushion(g, 0.37, 0.065, 0.37, 0, 0.568, -0.02, blue);
      // Upholstered back: taper shoulders and waist, with a convex rear shell.
      // Preserve the shared chair anchor and seat height across camera views.
      const back = cushion(g, 0.49, 0.12, 0.69, 0, 0.89, 0.2, c, 3);
      const backPositions = back.geometry.getAttribute("position");
      for (let i = 0; i < backPositions.count; i++) {
        const x = backPositions.getX(i),
          y = backPositions.getY(i),
          z = backPositions.getZ(i);
        const waist = 1 - 0.15 * Math.exp(-Math.pow((z - 0.09) / 0.16, 2));
        const shoulder = 1 - 0.1 * Math.max(0, -z / 0.345);
        backPositions.setXYZ(
          i,
          x * waist * shoulder,
          y + 0.018 * Math.cos(((z / 0.345) * Math.PI) / 2),
          z,
        );
      }
      back.geometry.computeVertexNormals();
      back.rotation.x = Math.PI / 2 - 0.1;
      // Remove the old flat perimeter seam after deformation; tailored seam follows below.
      for (const child of [...back.children]) {
        back.remove(child);
        if (child instanceof T.Mesh) child.geometry.dispose();
      }
      const insert = cushion(g, 0.28, 0.07, 0.5, 0, 0.91, 0.115, blue, 4);
      insert.rotation.x = Math.PI / 2 - 0.1;
      const headrest = cushion(g, 0.25, 0.11, 0.13, 0, 1.15, 0.075, c, 5);
      headrest.rotation.x = Math.PI / 2;
      for (const x of [-0.2, 0.2]) {
        const bolster = cushion(g, 0.11, 0.5, 0.13, x, 0.89, 0.11, c, 2);
        bolster.rotation.z = x * 0.45;
        box(
          g,
          0.065,
          0.075,
          0.008,
          x * 0.58,
          1.09,
          0.045,
          pbr("plastic", dark),
          0.018,
        );
      }
      const lumbar = cushion(g, 0.3, 0.12, 0.11, 0, 0.68, 0.1, blue);
      lumbar.rotation.x = 0.14;
      g.traverse((o) => {
        if (
          o instanceof T.Mesh &&
          !Array.isArray(o.material) &&
          o.material.userData.surface === "cotton"
        )
          o.material = pbr("leather", "#" + o.material.color.getHexString());
      });
      for (const x of [-0.19, 0.19])
        tube(
          g,
          [
            [x, 0.69, 0.038],
            [x, 0.94, 0.03],
            [x, 1.14, 0.065],
          ],
          0.0015,
          pbr("cotton", "#c5d0d8"),
        );
      cylinder(
        g,
        0.045,
        0.018,
        0.255,
        0.49,
        0.1,
        pbr("plastic", "#28333c"),
      ).rotation.z = Math.PI / 2;
      tube(
        g,
        [
          [0.13, 0.4, 0],
          [0.23, 0.4, 0],
          [0.27, 0.43, -0.08],
        ],
        0.006,
        pbr("brushed", silver),
      );
      box(
        g,
        0.075,
        0.014,
        0.032,
        0.27,
        0.43,
        -0.08,
        pbr("rubber", "#26333f"),
        0.006,
      );
      for (const x of [-0.29, 0.29]) {
        box(g, 0.035, 0.22, 0.05, x, 0.62, 0.035, silver);
        box(
          g,
          0.07,
          0.035,
          0.3,
          x,
          0.73,
          -0.02,
          pbr("rubber", "#566773"),
          0.012,
        );
      }
      break;
    }
    case "显示器": {
      base = [0.615, 0.365, 0.05];
      box(g, 0.035, 0.35, 0.035, 0, 0.19, -0.035, silver);
      box(g, 0.23, 0.014, 0.17, 0, 0.008, 0.01, pbr("metal", silver), 0.008);
      box(g, 0.26, 0.16, 0.03, 0, 0.34, -0.03, pbr("plastic", "#e0e3e6"), 0.02);
      screen(g, 0.597, 0.336, 0, 0.36, 0, texture);
      box(g, 0.1, 0.004, 0.003, 0, 0.184, 0.017, material("#78dbff", true), 0);
      break;
    }
    case "笔记本": {
      box(g, 0.365, 0.016, 0.27, 0, 0.008, 0, pbr("brushed", c), 0.004);
      const k = new T.Group();
      k.position.set(0, 0.02, -0.01);
      k.scale.set(0.8, 0.5, 0.75);
      keyboard(k, 0.34, 0.14, c);
      g.add(k);
      box(g, 0.105, 0.002, 0.063, 0, 0.019, 0.083, silver, 0.003);
      const lid = new T.Group();
      lid.position.set(0, 0.026, -0.122);
      lid.rotation.x = -0.18;
      screen(lid, 0.335, 0.215, 0, 0.11, 0, texture);
      box(lid, 0.36, 0.24, 0.008, 0, 0.11, -0.02, pbr("brushed", c), 0.003);
      for (const x of [-0.13, 0.13])
        cylinder(
          g,
          0.006,
          0.055,
          x,
          0.019,
          -0.12,
          pbr("brushed", "#a2adb2"),
        ).rotation.z = Math.PI / 2;
      for (const x of [-0.183, 0.183])
        for (let port = 0; port < 3; port++)
          box(
            g,
            0.001,
            0.004,
            0.014,
            x,
            0.009,
            -0.07 + port * 0.028,
            pbr("plastic", "#333c42"),
            0.001,
          );
      g.add(lid);
      break;
    }
    case "键盘":
      base = [0.36, 0.03, 0.14];
      keyboard(g, 0.36, 0.14, c);
      break;
    case "鼠标": {
      base = [0.065, 0.04, 0.12];
      const baseGeo = new T.SphereGeometry(1, 64, 16),
        bp = baseGeo.getAttribute("position");
      for (let i = 0; i < bp.count; i++)
        bp.setXYZ(
          i,
          bp.getX(i) * 0.03,
          0.005 + bp.getY(i) * 0.003,
          bp.getZ(i) * 0.054,
        );
      baseGeo.computeVertexNormals();
      const underside = new T.Mesh(baseGeo, pbr("plastic", "#39434b"));
      underside.castShadow = true;
      g.add(underside);
      // An arched shell, with a lower nose and a full palm support at the rear.
      const shellGeo = new T.SphereGeometry(1, 64, 40),
        sp = shellGeo.getAttribute("position");
      for (let i = 0; i < sp.count; i++) {
        const a = sp.getX(i),
          b = sp.getY(i),
          z = sp.getZ(i);
        sp.setXYZ(
          i,
          a * 0.031 * (1 - 0.12 * Math.max(0, -z)),
          0.012 + Math.max(0, b) * 0.026 * (0.86 + 0.14 * z),
          z * 0.055,
        );
      }
      shellGeo.computeVertexNormals();
      metricUV(shellGeo);
      const shell = new T.Mesh(shellGeo, pbr("plastic", c));
      shell.castShadow = shell.receiveShadow = true;
      g.add(shell);
      const skinY = (x: number, z: number) =>
        0.012 +
        Math.sqrt(Math.max(0, 1 - (x / 0.031) ** 2 - (z / 0.055) ** 2)) *
          0.026 *
          (0.86 + (0.14 * z) / 0.055) +
        0.00035;
      tube(
        g,
        Array.from({ length: 16 }, (_, i) => {
          const z = -0.051 + (i * 0.035) / 15;
          return [0, skinY(0, z), z];
        }),
        0.0004,
        pbr("rubber", "#35404b"),
      );
      tube(
        g,
        Array.from({ length: 25 }, (_, i) => {
          const x = -0.028 + (i * 0.056) / 24,
            z = 0.006;
          return [x, skinY(x, z), z];
        }),
        0.00035,
        pbr("rubber", "#65717a"),
      );
      cylinder(
        g,
        0.006,
        0.008,
        0,
        0.034,
        -0.025,
        pbr("rubber", "#34424b"),
      ).rotation.z = Math.PI / 2;
      const treadGeo = geometry(
        "mouse-wheel-tread",
        () => new T.BoxGeometry(0.0085, 0.001, 0.0014),
      );
      const tread = new T.InstancedMesh(treadGeo, pbr("rubber", "#6e7c85"), 32),
        treadTransform = new T.Object3D();
      for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI * 2) / 32;
        treadTransform.position.set(
          0,
          0.034 + Math.cos(a) * 0.006,
          -0.025 + Math.sin(a) * 0.006,
        );
        treadTransform.rotation.x = a;
        treadTransform.updateMatrix();
        tread.setMatrixAt(i, treadTransform.matrix);
      }
      g.add(tread);
      for (const z of [-0.035, 0.034])
        box(
          g,
          0.039,
          0.001,
          0.014,
          0,
          0.001,
          z,
          pbr("plastic", "#c4d0d8"),
          0.005,
        );
      box(
        g,
        0.013,
        0.002,
        0.016,
        0,
        0.001,
        0.006,
        pbr("plastic", "#172532"),
        0.003,
      );
      box(
        g,
        0.006,
        0.001,
        0.006,
        0,
        -0.0003,
        0.006,
        pbr("glass", "#617f8c"),
        0.002,
      );
      box(
        g,
        0.011,
        0.005,
        0.002,
        0,
        0.012,
        -0.056,
        pbr("brushed", "#96a4ad"),
        0.001,
      );
      box(
        g,
        0.007,
        0.002,
        0.002,
        0,
        0.012,
        -0.0575,
        pbr("rubber", "#29343d"),
        0.0005,
      );
      for (const z of [-0.005, 0.016])
        box(
          g,
          0.003,
          0.005,
          0.014,
          -0.031,
          0.026,
          z,
          pbr("plastic", "#9aacb9"),
          0.001,
        );
      box(
        g,
        0.002,
        0.005,
        0.008,
        0,
        0.039,
        0.006,
        pbr("diffuser", "#81cee9"),
        0.001,
      );
      break;
    }
    case "耳机": {
      tube(
        g,
        [
          [-0.064, 0.248, 0],
          [0, 0.302, 0],
          [0.064, 0.248, 0],
        ],
        0.011,
        pbr("leather", "#465868"),
      );
      box(g, 0.14, 0.012, 0.1, 0, 0.006, 0, silver);
      box(g, 0.015, 0.25, 0.015, 0, 0.135, 0, silver);
      tube(
        g,
        [
          [-0.073, 0.17, 0],
          [-0.075, 0.28, 0],
          [0, 0.32, 0],
          [0.075, 0.28, 0],
          [0.073, 0.17, 0],
        ],
        0.015,
        c,
      );
      for (const x of [-0.075, 0.075]) {
        const housing = new T.Mesh(
          geometry("earcup-oval", () => new T.SphereGeometry(1, 32, 24)),
          pbr("plastic", c),
        );
        housing.scale.set(0.0225, 0.0475, 0.035);
        housing.position.set(x, 0.18, 0);
        housing.castShadow = housing.receiveShadow = true;
        g.add(housing);
        const pad = new T.Mesh(
          geometry(
            "earpad-ring",
            () => new T.TorusGeometry(0.027, 0.008, 12, 40),
          ),
          pbr("leather", "#435361"),
        );
        pad.rotation.y = Math.PI / 2;
        pad.scale.set(1, 1.3, 1);
        pad.position.set(x * 0.76, 0.18, 0);
        pad.castShadow = true;
        g.add(pad);
        const mesh = new T.Mesh(
          geometry("earpad-insert", () => new T.CircleGeometry(0.025, 32)),
          pbr("cotton", "#222d35"),
        );
        mesh.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
        mesh.scale.y = 1.3;
        mesh.position.set(x * 0.64, 0.18, 0);
        g.add(mesh);
        cylinder(
          g,
          0.009,
          0.049,
          x,
          0.235,
          0,
          pbr("brushed", silver),
        ).rotation.z = Math.PI / 2;
        box(
          g,
          0.001,
          0.029,
          0.013,
          x * 1.3,
          0.18,
          0,
          pbr("diffuser", "#8fd8ec"),
          0.004,
        );
      }
      tube(
        g,
        [
          [-0.09, 0.15, 0.018],
          [-0.09, 0.125, 0.07],
          [-0.055, 0.125, 0.1],
        ],
        0.003,
        pbr("rubber", "#3d4a55"),
      );
      box(
        g,
        0.025,
        0.012,
        0.014,
        -0.052,
        0.125,
        0.1,
        pbr("plastic", "#536273"),
        0.005,
      );
      break;
    }
    case "扩展坞":
      base = [0.16, 0.025, 0.07];
      box(g, 0.16, 0.025, 0.07, 0, 0.015, 0, c);
      for (let i = 0; i < 4; i++)
        box(g, 0.02, 0.006, 0.001, (i - 1.5) * 0.033, 0.016, 0.036, dark, 0);
      break;
    case "线材": {
      tube(
        g,
        [
          [-0.15, -0.107, -0.06],
          [-0.15, -0.08, -0.2],
          [0.3, -0.1, -0.3],
          [0.95, -0.1, -0.3],
          [1.04, -0.04, -0.25],
          [1.04, 0.07, -0.133],
        ],
        0.005,
        pbr("rubber", "#46535c"),
      );
      // Cables are local to the desk's fixed layout, with slack behind each screen.
      for (const x of [-0.32, 0.32])
        tube(
          g,
          [
            [x, 0.34, -0.15],
            [x, 0.16, -0.23],
            [x, -0.1, -0.32],
            [1.1, -0.1, -0.32],
            [1.1, 0.2, -0.18],
          ],
          0.004,
          pbr("rubber", "#39444d"),
        );
      tube(
        g,
        [
          [-0.108, 0.009, 0.178],
          [-0.108, 0.008, 0.14],
          [-0.2, 0.006, 0.04],
          [-0.2, 0.008, -0.3],
          [-0.2, -0.1, -0.34],
          [1.1, -0.1, -0.34],
          [1.1, 0.3, -0.18],
        ],
        0.002,
        pbr("rubber", "#c5cdd2"),
      );
      box(
        g,
        0.012,
        0.006,
        0.019,
        -0.108,
        0.009,
        0.171,
        pbr("plastic", "#7f929e"),
        0.002,
      );
      for (let i = 0; i < 5; i++)
        box(
          g,
          0.007,
          0.006,
          0.001,
          -0.108,
          0.009,
          0.159 - i * 0.002,
          pbr("rubber", "#9daeb8"),
          0.0004,
        );
      for (const x of [-0.32, 0.32])
        box(
          g,
          0.018,
          0.012,
          0.02,
          x,
          0.34,
          -0.15,
          pbr("plastic", "#39444d"),
          0.002,
        );
      for (const y of [0.2, 0.3])
        box(
          g,
          0.018,
          0.012,
          0.02,
          1.1,
          y,
          -0.18,
          pbr("plastic", "#39444d"),
          0.002,
        );
      box(
        g,
        1.25,
        0.012,
        0.075,
        0.4,
        -0.125,
        -0.32,
        pbr("metal", "#73818b"),
        0.002,
      );
      for (const x of [-0.15, 0.4, 0.95])
        box(
          g,
          0.012,
          0.036,
          0.078,
          x,
          -0.11,
          -0.32,
          pbr("rubber", "#35434d"),
          0.002,
        );
      box(g, 0.24, 0.04, 0.07, -0.15, -0.13, -0.06, c);
      for (let i = 0; i < 4; i++)
        box(g, 0.025, 0.004, 0.025, -0.23 + i * 0.05, -0.107, -0.06, dark, 0);
      break;
    }
    case "床": {
      base = [1.8, 0.5, 2.15];
      box(g, 1.73, 0.13, 2.04, 0, 0.105, 0, pbr("wood", "#c2aa88"), 0.018);
      box(g, 1.8, 0.22, 2.15, 0, 0.26, 0, pbr("cotton", "#b7b0a4"), 0.04);
      box(g, 1.77, 0.24, 2.1, 0, 0.47, 0, pbr("cotton", "#f2eee5"), 0.055);
      for (const y of [0.37, 0.56]) {
        const corners = [
          [-0.84, y, -1.015],
          [0.84, y, -1.015],
          [0.865, y, -0.99],
          [0.865, y, 0.99],
          [0.84, y, 1.015],
          [-0.84, y, 1.015],
          [-0.865, y, 0.99],
          [-0.865, y, -0.99],
          [-0.84, y, -1.015],
        ];
        const path = new T.CurvePath<T.Vector3>();
        for (let i = 1; i < corners.length; i++)
          path.add(
            new T.LineCurve3(
              new T.Vector3(...(corners[i - 1] as [number, number, number])),
              new T.Vector3(...(corners[i] as [number, number, number])),
            ),
          );
        g.add(
          new T.Mesh(
            new T.TubeGeometry(path, 100, 0.003, 4, false),
            pbr("cotton", "#cec9bf"),
          ),
        );
      }
      box(g, 1.88, 1.03, 0.1, 0, 0.59, -1.06, pbr("cotton", "#aaa69e"), 0.035);
      for (const x of [-0.61, 0, 0.61])
        box(
          g,
          0.59,
          0.9,
          0.045,
          x,
          0.62,
          -0.995,
          pbr("cotton", "#c6c0b5"),
          0.02,
        );
      for (const [n, x] of [-0.44, 0.44].entries()) {
        const pillow = cushion(g, 0.73, 0.19, 0.48, x, 0.665, -0.67, c, n + 2);
        pillow.rotation.y = n ? 0.055 : -0.045;
      }
      cloth(g, 2.12, 1.8, 0, 0.65, 0.25, "#e2ddd1");
      cloth(g, 2.12, 0.7, 0, 0.695, 0.56, "#708597", "bed", 0.018);
      box(g, 0.43, 0.42, 0.45, 1.2, 0.21, -0.68, c, 0.035);
      cylinder(g, 0.12, 0.025, 1.2, 0.445, -0.68, silver);
      cylinder(g, 0.018, 0.22, 1.2, 0.56, -0.68, silver);
      cylinder(g, 0.11, 0.14, 1.2, 0.72, -0.68, material("#d1ecff", true));
      break;
    }
    case "沙发": {
      base = [2.8, 0.85, 0.95];
      for (const x of [-1.16, 1.16])
        for (const z of [-0.28, 0.28])
          cylinder(g, 0.035, 0.14, x, 0.07, z, silver);
      box(g, 2.76, 0.22, 0.91, 0, 0.245, 0, pbr("cotton", "#d1cec6"), 0.035);
      cushion(g, 2.75, 0.13, 0.38, 0, 0.67, 0.35, c, 9).rotation.x =
        Math.PI / 2 - 0.06;
      for (const x of [-1.28, 1.28])
        cushion(g, 0.23, 0.39, 0.95, x, 0.49, 0, c, 2 + x);
      for (const x of [-0.8, 0, 0.8]) {
        cushion(g, 0.77, 0.19, 0.76, x, 0.445, -0.045, c, x * 7 + 3);
        const back = cushion(
          g,
          0.78,
          0.18,
          0.44,
          x,
          0.705,
          0.235,
          "#e3ded4",
          x * 5,
        );
        back.rotation.x = Math.PI / 2 - 0.14;
      }
      for (const x of [-0.89, 0.88]) {
        const pillow = cushion(
          g,
          0.4,
          0.17,
          0.41,
          x,
          0.63,
          0.04,
          x > 0 ? "#79909f" : "#bec0b8",
          x * 9,
        );
        pillow.rotation.set(Math.PI / 2 - 0.24, x * 0.11, x * 0.24);
      }
      cloth(g, 0.42, 0.92, -1.28, 0.7, -0.015, "#7a8b99", "sofa");
      break;
    }
    case "电视": {
      base = [1.9, 1.09, 0.06];
      screen(g, 1.88, 1.057, 0, 0, 0, texture);
      box(g, 1.82, 0.93, 0.025, 0, 0, -0.025, pbr("plastic", "#27292c"), 0.008);
      break;
    }
    case "冰箱": {
      base = [0.7, 1.8, 0.7];
      stockedFridge(g, c);
      break;
    }
    default:
      box(g, 0.1, 0.1, 0.1, 0, 0.05, 0, c);
  }
  const type =
    category === "冰箱"
      ? "metal"
      : category === "桌子"
        ? "lacquer"
        : category === "扩展坞"
          ? "brushed"
          : "plastic";
  g.traverse((o) => {
    if (!(o instanceof T.Mesh) || Array.isArray(o.material)) return;
    const m = o.material as T.MeshStandardMaterial;
    if (
      m.userData.surface ||
      m.userData.led ||
      m.userData.screen ||
      m.map ||
      m.transparent ||
      !m.color
    )
      return;
    if (m.color.getHexString() === new T.Color(silver).getHexString())
      o.material = pbr("brushed", silver);
    else o.material = pbr(type, "#" + m.color.getHexString());
  });
  if (dim && base)
    g.scale.set(dim[0] / base[0], dim[1] / base[1], dim[2] / base[2]);
  return g;
}
export function disposeObject(obj: T.Object3D, preserveShared = false) {
  const disposedGeometry = new Set<T.BufferGeometry>(),
    disposedMaterial = new Set<T.Material>();
  obj.traverse((o) => {
    if (o instanceof T.Mesh) {
      if (o instanceof T.InstancedMesh) o.dispose();
      if (
        !disposedGeometry.has(o.geometry) &&
        (!preserveShared || ![...geometries.values()].includes(o.geometry))
      ) {
        o.geometry.dispose();
        disposedGeometry.add(o.geometry);
      }
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (disposedMaterial.has(m) || (preserveShared && m.userData.surface))
          continue;
        disposedMaterial.add(m);
        for (const v of Object.values(m))
          if (v instanceof T.Texture && !v.userData.sharedRuntime) v.dispose();
        for (const v of Object.values(m.userData))
          if (v instanceof T.Texture) v.dispose();
        m.dispose();
      }
    }
  });
}
