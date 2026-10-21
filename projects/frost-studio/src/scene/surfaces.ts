import * as T from "three";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import renderAssets from "./render-assets.json";

export type Surface =
  | "paint"
  | "wood"
  | "cotton"
  | "rug"
  | "stone"
  | "marble"
  | "lacquer"
  | "metal"
  | "brushed"
  | "plastic"
  | "circuit"
  | "glass"
  | "pbt"
  | "rubber"
  | "leather"
  | "diffuser";
export const assetState = new Map<string, string>();
const cache = new Map<string, T.MeshStandardMaterial>();
const textures = new Map<string, Promise<T.Texture>>();
const variants = new Map<string, Promise<T.Texture>>();
const mappedTextures = new Set<T.Texture>();
const finishes = new Map<string, [T.Texture, T.Texture]>();
const textiles = new Map<string, T.Texture>();
let anisotropy = 4,
  generation = 0;
export function assetUrl(path: string) {
  const key = path.replace(/^\//, "");
  return (
    import.meta.env.BASE_URL +
    ((renderAssets as Record<string, string>)[key] ?? key)
  );
}
function shared(texture: T.Texture) {
  texture.userData.sharedRuntime = true;
  texture.anisotropy = anisotropy;
  mappedTextures.add(texture);
  return texture;
}
// Original procedural microfinish; scanned leather is loaded separately below.
function microfinish(kind: Surface): [T.Texture, T.Texture] {
  if (finishes.has(kind)) return finishes.get(kind)!;
  const rough = document.createElement("canvas"),
    normal = document.createElement("canvas");
  rough.width = normal.width = 128;
  rough.height = normal.height = 128;
  const rc = rough.getContext("2d")!,
    nc = normal.getContext("2d")!,
    r = rc.createImageData(128, 128),
    n = nc.createImageData(128, 128);
  const noise = (x: number, y: number) => {
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4,
        h = noise(x, y),
        dx = noise((x + 1) % 128, y) - h,
        dy = noise(x, (y + 1) % 128) - h;
      const grain = kind === "brushed" ? noise(x, 0) : h;
      r.data[i] = r.data[i + 1] = r.data[i + 2] = Math.round(218 + grain * 30);
      r.data[i + 3] = 255;
      n.data[i] = 128 + Math.round((kind === "brushed" ? dx * 0.3 : dx) * 14);
      n.data[i + 1] = 128 + Math.round((kind === "brushed" ? 0 : dy) * 14);
      n.data[i + 2] = 255;
      n.data[i + 3] = 255;
    }
  rc.putImageData(r, 0, 0);
  nc.putImageData(n, 0, 0);
  const result = [rough, normal].map((canvas) => {
    const t = shared(new T.CanvasTexture(canvas));
    t.colorSpace = T.NoColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(24, 24);
    return t;
  }) as [T.Texture, T.Texture];
  finishes.set(kind, result);
  return result;
}
// Original yarn albedo. Scanned normal/roughness retain the measured fabric structure;
// small luminance differences prevent tinted cloth from reading as smooth molded plastic.
function textileAlbedo(kind: "cotton" | "rug") {
  if (textiles.has(kind)) return textiles.get(kind)!;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const context = canvas.getContext("2d")!,
    pixels = context.createImageData(512, 512);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const warp = Math.sin((x * Math.PI) / 4),
        weft = Math.sin((y * Math.PI) / 4);
      const cellX = Math.floor(x / 8),
        cellY = Math.floor(y / 8),
        over = (cellX + cellY) % 2;
      const yarn = over ? warp : weft;
      const grain = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const fleck = grain - Math.floor(grain);
      const v = Math.round(
        (kind === "rug" ? 205 : 225) +
          yarn * (kind === "rug" ? 20 : 12) +
          fleck * 12,
      );
      const index = (y * 512 + x) * 4;
      pixels.data[index] = v;
      pixels.data[index + 1] = v;
      pixels.data[index + 2] = v;
      pixels.data[index + 3] = 255;
    }
  context.putImageData(pixels, 0, 0);
  const texture = shared(new T.CanvasTexture(canvas));
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(
    kind === "rug" ? 1 / 0.22 : 1 / 0.3,
    kind === "rug" ? 1 / 0.22 : 1 / 0.3,
  );
  textiles.set(kind, texture);
  return texture;
}
export function textureQuality(value: number) {
  anisotropy = value;
  for (const texture of mappedTextures) texture.anisotropy = value;
}
export function loadTexture(path: string, color = false): Promise<T.Texture> {
  const key = path + ":" + color;
  if (!textures.has(key)) {
    const current = generation;
    assetState.set(path, "loading");
    const pending = new T.TextureLoader()
      .loadAsync(assetUrl(path))
      .then((texture) => {
        if (current !== generation) {
          texture.dispose();
          throw Error("Discarded stale texture");
        }
        texture.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        shared(texture);
        assetState.set(path, "ready");
        return texture;
      })
      .catch((error) => {
        if (current === generation) {
          assetState.set(path, "failed");
          textures.delete(key);
        }
        throw error;
      });
    textures.set(key, pending);
  }
  return textures.get(key)!;
}
export function loadEnvironment(): Promise<T.Texture> {
  const path = "materials/environment.hdr",
    key = "hdr:" + path;
  if (!textures.has(key)) {
    const current = generation;
    assetState.set(path, "loading");
    const pending = new HDRLoader()
      .loadAsync(assetUrl(path))
      .then((texture) => {
        if (current !== generation) {
          texture.dispose();
          throw Error("Discarded stale environment");
        }
        shared(texture);
        assetState.set(path, "ready");
        return texture;
      })
      .catch((error) => {
        if (current === generation) {
          assetState.set(path, "failed");
          textures.delete(key);
        }
        throw error;
      });
    textures.set(key, pending);
  }
  return textures.get(key)!;
}
function mapped(path: string, repeat: number, color = false) {
  const key = path + ":" + repeat + ":" + color;
  if (!variants.has(key)) {
    const current = generation;
    variants.set(
      key,
      loadTexture(path, color)
        .then((original) => {
          if (current !== generation)
            throw Error("Discarded stale material map");
          const texture = shared(original.clone());
          texture.repeat.set(repeat, repeat);
          texture.channel = 0;
          texture.needsUpdate = true;
          return texture;
        })
        .catch((error) => {
          if (current === generation) variants.delete(key);
          throw error;
        }),
    );
  }
  return variants.get(key)!;
}
export function pbr(
  kind: Surface,
  color = "#ffffff",
  doubleSided = false,
  vertexColors = false,
) {
  const key = kind + color + ":" + doubleSided + ":" + vertexColors;
  if (cache.has(key)) return cache.get(key)!;
  const settings: Record<Surface, T.MeshPhysicalMaterialParameters> = {
    paint: { roughness: 0.9 },
    wood: { roughness: 0.61 },
    cotton: {
      roughness: 0.96,
      sheen: 0.48,
      sheenRoughness: 0.9,
      sheenColor: "#f4efea",
    },
    rug: { roughness: 1, sheen: 0.4, sheenRoughness: 1 },
    stone: { roughness: 0.56 },
    marble: { roughness: 0.28, clearcoat: 0.16, clearcoatRoughness: 0.3 },
    lacquer: { roughness: 0.35, clearcoat: 0.18, clearcoatRoughness: 0.4 },
    // Painted metal is a dielectric coating; bare metal is represented by brushed.
    metal: { roughness: 0.42, metalness: 0.08 },
    brushed: { roughness: 0.32, metalness: 0.94, anisotropy: 0.35 },
    plastic: { roughness: 0.42, metalness: 0 },
    circuit: { roughness: 0.52, metalness: 0 },
    pbt: { roughness: 0.72, metalness: 0 },
    rubber: { roughness: 0.94, metalness: 0 },
    leather: { roughness: 0.58, sheen: 0.18, sheenRoughness: 0.9 },
    diffuser: { roughness: 0.55, emissive: color, emissiveIntensity: 0.65 },
    glass: {
      roughness: 0.045,
      metalness: 0,
      ior: 1.5,
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      envMapIntensity: 0.55,
    },
  };
  const physical = [
    "cotton",
    "rug",
    "marble",
    "lacquer",
    "brushed",
    "leather",
    "glass",
  ].includes(kind);
  const material = physical
    ? new T.MeshPhysicalMaterial({ color, ...settings[kind] })
    : new T.MeshStandardMaterial({ color, ...settings[kind] });
  material.side = doubleSided ? T.DoubleSide : T.FrontSide;
  material.vertexColors = vertexColors;
  material.name = "surface:" + kind;
  material.userData.surface = kind;
  cache.set(key, material);
  if (kind === "cotton" || kind === "rug") material.map = textileAlbedo(kind);
  if (kind === "diffuser") material.userData.led = true;
  if (
    ["metal", "brushed", "plastic", "pbt", "rubber", "circuit"].includes(kind)
  ) {
    const [rough, normal] = microfinish(kind);
    material.roughnessMap = rough;
    material.normalMap = normal;
    material.normalScale.setScalar(0.12);
  }
  const source = (
    {
      wood: "wood_floor",
      cotton: "fabric_pattern_07",
      rug: "fabric_pattern_07",
      stone: "marble_01",
      marble: "marble012",
      paint: "painted_plaster_wall",
      leather: "leather_white",
    } as Partial<Record<Surface, string>>
  )[kind];
  if (source) {
    const repeat =
      kind === "cotton"
        ? 1 / 0.3
        : kind === "rug"
          ? 1 / 0.22
          : kind === "leather"
            ? 1 / 0.3
            : kind === "wood" || kind === "marble" || kind === "paint"
              ? 0.5
              : 1;
    const assign = (
      path: string,
      slot: "map" | "normalMap" | "roughnessMap" | "aoMap",
      colorMap = false,
    ) => {
      mapped(path, repeat, colorMap)
        .then((texture) => {
          if (cache.get(key) !== material) return;
          material[slot] = texture;
          material.needsUpdate = true;
        })
        .catch(() => {});
    };
    if (!["cotton", "rug", "paint", "leather"].includes(kind))
      assign("materials/" + source + "-Diffuse.jpg", "map", true);
    assign("materials/" + source + "-nor_gl.jpg", "normalMap");
    assign("materials/" + source + "-ARM.webp", "roughnessMap");
    if (kind !== "leather" && kind !== "marble")
      assign("materials/" + source + "-ARM.webp", "aoMap");
    material.normalScale.setScalar(
      kind === "marble"
        ? 0.065
        : kind === "paint"
          ? 0.035
          : kind === "cotton"
            ? 0.42
            : kind === "rug"
              ? 0.55
              : kind === "leather"
                ? 0.17
                : kind === "wood"
                  ? 0.22
                  : 0.2,
    );
    material.aoMapIntensity = kind === "cotton" || kind === "rug" ? 0.25 : 0.32;
  }
  return material;
}
export function metricUV(geometry: T.BufferGeometry) {
  const position = geometry.getAttribute("position"),
    normal = geometry.getAttribute("normal"),
    uv = geometry.getAttribute("uv");
  if (!uv || !normal) return;
  for (let i = 0; i < position.count; i++) {
    const x = Math.abs(normal.getX(i)),
      y = Math.abs(normal.getY(i)),
      z = Math.abs(normal.getZ(i));
    uv.setXY(
      i,
      x > y && x > z ? position.getZ(i) : position.getX(i),
      y > x && y > z ? position.getZ(i) : position.getY(i),
    );
  }
  uv.needsUpdate = true;
}
export function clearSurfaceMaterials() {
  cache.clear();
}
export function disposeSurfaces() {
  generation++;
  for (const material of cache.values()) material.dispose();
  cache.clear();
  for (const texture of mappedTextures) texture.dispose();
  mappedTextures.clear();
  textures.clear();
  variants.clear();
  finishes.clear();
  textiles.clear();
  assetState.clear();
}
