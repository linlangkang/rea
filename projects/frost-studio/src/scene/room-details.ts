import * as T from "three";
import { box, cylinder, tube } from "./models";
import { pbr } from "./surfaces";
/** Original canvas paintings and functional-looking props; no third-party artwork. */
export function addRoomDetails(g: T.Group, w: number, d: number, h: number) {
  for (let i = 0; i < 3; i++) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 640;
    const x = c.getContext("2d")!;
    x.fillStyle = ["#ded9cc", "#d2dce2", "#d8d6ce"][i];
    x.fillRect(0, 0, 512, 640);
    for (let band = 0; band < 6; band++) {
      x.fillStyle = [
        "#a8bec4",
        "#7e9ba9",
        "#536f83",
        "#38566b",
        "#244052",
        "#182e40",
      ][band];
      x.beginPath();
      x.moveTo(0, 640);
      for (let j = 0; j <= 32; j++)
        x.lineTo(j * 16, 235 + band * 55 + Math.sin(j * 0.23 + i + band) * 42);
      x.lineTo(512, 640);
      x.fill();
    }
    x.fillStyle = "#eee7d3";
    x.beginPath();
    x.arc(365, 133, 48, 0, Math.PI * 2);
    x.fill();
    const map = new T.CanvasTexture(c);
    map.colorSpace = T.SRGBColorSpace;
    const z = 2.4 + i * 0.73;
    box(
      g,
      0.065,
      0.83,
      0.63,
      w / 2 - 0.05,
      1.91,
      z,
      pbr("wood", "#766657"),
      0.006,
    );
    box(
      g,
      0.012,
      0.76,
      0.56,
      w / 2 - 0.087,
      1.91,
      z,
      new T.MeshStandardMaterial({ map, roughness: 0.84 }),
      0.001,
    ).name = "original_framed_landscape_" + i;
  }
  // Reading corner and entry bench stay clear of the central circulation path.
  box(
    g,
    0.58,
    0.07,
    1.5,
    w / 2 - 0.65,
    0.46,
    3.65,
    pbr("wood", "#af9272"),
    0.012,
  );
  for (const z of [3.1, 4.2])
    box(
      g,
      0.07,
      0.43,
      0.07,
      w / 2 - 0.65,
      0.215,
      z,
      pbr("brushed", "#555e61"),
      0.008,
    );
  box(
    g,
    0.5,
    0.1,
    1.36,
    w / 2 - 0.65,
    0.54,
    3.65,
    pbr("cotton", "#8097a5"),
    0.04,
  );
  for (let n = 0; n < 5; n++) {
    const z = 0.8 + n * 0.14;
    box(
      g,
      0.24,
      0.22 + n * 0.008,
      0.08,
      w / 2 - 0.31,
      0.64,
      z,
      pbr("cotton", ["#647885", "#b3987c", "#829584", "#d1c5b3", "#516373"][n]),
      0.003,
    );
  }
  // Tall floor lamp: weighted base, stem and open-bottom shade.
  cylinder(g, 0.22, 0.035, 2.7, 0.018, 2.6, pbr("metal", "#434b50"));
  cylinder(g, 0.015, 1.67, 2.7, 0.87, 2.6, pbr("brushed", "#a9a49a"));
  const shade = new T.Mesh(
    new T.CylinderGeometry(0.19, 0.29, 0.28, 48, 1, true),
    pbr("cotton", "#e4d9c4", true),
  );
  shade.position.set(2.7, 1.72, 2.6);
  g.add(shade);
  // Low side table, book stack and remote.
  cylinder(g, 0.3, 0.055, 0.4, 0.58, 1.4, pbr("wood", "#ad9276"));
  cylinder(g, 0.035, 0.55, 0.4, 0.28, 1.4, pbr("metal", "#4f5960"));
  cylinder(g, 0.22, 0.025, 0.4, 0.014, 1.4, pbr("metal", "#4f5960"));
  for (let n = 0; n < 3; n++)
    box(
      g,
      0.18,
      0.026,
      0.25,
      0.4,
      0.623 + n * 0.028,
      1.4,
      pbr("cotton", ["#647a89", "#c1a17c", "#92a699"][n]),
      0.002,
    );
  box(
    g,
    0.04,
    0.014,
    0.13,
    0.53,
    0.618,
    1.48,
    pbr("plastic", "#333a41"),
    0.005,
  );
  // Entrance hooks and a mirror on the solid entrance wall.
  box(
    g,
    0.8,
    1.45,
    0.05,
    2.6,
    1.62,
    d / 2 - 0.035,
    pbr("brushed", "#89989e"),
    0.012,
  );
  box(
    g,
    0.72,
    1.36,
    0.012,
    2.6,
    1.62,
    d / 2 - 0.066,
    new T.MeshStandardMaterial({
      color: "#b7c8d0",
      metalness: 0.95,
      roughness: 0.12,
    }),
    0.004,
  );
  for (let n = 0; n < 3; n++)
    tube(
      g,
      [
        [1.85 + n * 0.14, 1.74, d / 2 - 0.02],
        [1.85 + n * 0.14, 1.74, d / 2 - 0.08],
        [1.85 + n * 0.14, 1.81, d / 2 - 0.08],
      ],
      0.012,
      pbr("brushed", "#7f8788"),
    );
}
