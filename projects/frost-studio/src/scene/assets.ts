import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Catalog } from "../domain/schema";
import { LoadingManager } from "three";
import { assetUrl } from "./surfaces";
export function createAssetManager() {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    const parsed = new URL(url, location.href);
    if (parsed.origin !== location.origin) return url;
    const prefix = import.meta.env.BASE_URL;
    if (!parsed.pathname.startsWith(prefix)) return url;
    const logical = parsed.pathname.slice(prefix.length),
      runtime = assetUrl(logical);
    // Imported same-origin GLBs may carry authentication/version query parameters.
    // Rewrite only known packed resources, preserving every unrelated model URL.
    return runtime === prefix + logical
      ? url
      : runtime + parsed.search + parsed.hash;
  });
  return manager;
}
export async function loadModelAsset(asset: Catalog["assets"][number]) {
  if (!asset.url) throw Error("该模型使用程序化生成器");
  const url = new URL(asset.url);
  if (!["https:", "http:"].includes(url.protocol)) throw Error("模型协议无效");
  const gltf = await new GLTFLoader(createAssetManager()).loadAsync(url.href);
  return gltf.scene;
}
