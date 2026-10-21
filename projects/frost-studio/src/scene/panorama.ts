import * as T from "three";
import { loadTexture, loadEnvironment, assetState } from "./surfaces";
export function makePanorama(
  _w: number,
  _d: number,
  _h: number,
  scenery: string,
) {
  const group = new T.Group();
  group.userData.noPick = true;
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const sky = skyCanvas.getContext("2d")!;
  const gradient = sky.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#6492b7");
  gradient.addColorStop(0.5, "#cbdce5");
  gradient.addColorStop(1, "#718b8e");
  sky.fillStyle = gradient;
  sky.fillRect(0, 0, 1024, 512);
  const skyMap = new T.CanvasTexture(skyCanvas);
  skyMap.colorSpace = T.SRGBColorSpace;
  const domeGeometry = new T.SphereGeometry(65, 64, 32);
  domeGeometry.scale(-1, 1, 1);
  const dome = new T.Mesh(
    domeGeometry,
    new T.MeshBasicMaterial({
      map: skyMap,
      side: T.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  dome.name = "Frost_PanoramaFullSky";
  dome.renderOrder = -10;
  group.add(dome);
  const m = new T.MeshBasicMaterial({
    color: "#a6c4d4",
    side: T.DoubleSide,
    toneMapped: false,
    depthWrite: false,
  });
  m.userData.sky = true;
  m.userData.loaded = false;
  let dead = false;
  m.addEventListener("dispose", () => (dead = true));
  // One continuous far-field surface, never one repeated photograph per window.
  const geo =
    scenery === "mist"
      ? new T.SphereGeometry(35, 64, 32)
      : new T.CylinderGeometry(
          18,
          18,
          (Math.PI * 18 * 941) / 1672,
          96,
          1,
          true,
          Math.PI * 0.75,
          Math.PI,
        );
  const mesh = new T.Mesh(geo, m);
  if (scenery !== "mist") mesh.position.y = -3;
  else mesh.rotation.y = Math.PI;
  mesh.renderOrder = -5;
  group.add(mesh);
  // Real geometry provides modest near/middle parallax below the distant image.
  // It is an illustrative landscape, not reconstructed geography.
  if (scenery !== "coast")
    for (let band = 0; band < 2; band++) {
      const vertices: number[] = [],
        indices: number[] = [];
      const radius = 8 + band * 5;
      for (let i = 0; i <= 80; i++) {
        const a = Math.PI * 0.75 + (i / 80) * Math.PI;
        const peak =
          -1.7 -
          band * 0.55 +
          0.45 * Math.sin(i * 0.23 + band) +
          0.2 * Math.sin(i * 0.67);
        vertices.push(
          Math.sin(a) * radius,
          peak,
          Math.cos(a) * radius,
          Math.sin(a) * radius,
          -5,
          Math.cos(a) * radius,
        );
        if (i < 80) {
          const j = i * 2;
          indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
        }
      }
      const terrain = new T.BufferGeometry();
      terrain.setAttribute(
        "position",
        new T.Float32BufferAttribute(vertices, 3),
      );
      terrain.setIndex(indices);
      terrain.computeVertexNormals();
      group.add(
        new T.Mesh(
          terrain,
          new T.MeshStandardMaterial({
            color: band ? "#688287" : "#426661",
            roughness: 1,
            side: T.DoubleSide,
          }),
        ),
      );
    }
  const waterGeo = new T.PlaneGeometry(
    scenery === "coast" ? 45 : 6,
    scenery === "coast" ? 45 : 18,
    40,
    40,
  );
  waterGeo.rotateX(-Math.PI / 2);
  const waterMaterial = new T.MeshStandardMaterial({
    color: scenery === "coast" ? "#54a7b6" : "#537f89",
    roughness: 0.3,
    metalness: 0.18,
  });
  const waterTime = { value: 0 };
  // Analytic displacement and its normal run on the GPU; no repeated vertex uploads or CPU normal rebuild.
  waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.frostWaterTime = waterTime;
    shader.vertexShader =
      "uniform float frostWaterTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      `#include <beginnormal_vertex>
      float a=position.x*.8+frostWaterTime*.5, b=position.z*.6+frostWaterTime*.3;
      objectNormal=normalize(vec3(-.028*cos(a)*cos(b),1.,.021*sin(a)*sin(b)));`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      transformed.y+=.035*sin(position.x*.8+frostWaterTime*.5)*cos(position.z*.6+frostWaterTime*.3);`,
    );
  };
  waterMaterial.customProgramCacheKey = () => "frost-water-v1";
  const water = new T.Mesh(waterGeo, waterMaterial);
  water.position.set(
    scenery === "coast" ? 0 : -9,
    -3.5,
    scenery === "coast" ? 0 : -5,
  );
  water.userData.water = true;
  water.userData.waterTime = waterTime;
  group.add(water);
  const path =
    scenery === "mist"
      ? "materials/environment.hdr"
      : `environment/${scenery}.png`;
  assetState.set(path, "loading");
  const promise =
    scenery === "mist" ? loadEnvironment() : loadTexture(path, true);
  promise
    .then((t) => {
      if (dead) return;
      assetState.set(path, "ready");
      t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
      m.map = t;
      m.color.set("white");
      m.userData.loaded = true;
      m.needsUpdate = true;
    })
    .catch(() => {
      assetState.set(path, "failed");
      m.color.set("#a6c4d4");
    });
  return group;
}
