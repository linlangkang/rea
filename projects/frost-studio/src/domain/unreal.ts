import { catalogSchema, presetSchema, type BuildPreset, type Catalog } from './schema';
import { validateState } from './storage';
import { cameraPoses, ROOM_LAYOUT } from '../scene/layout';

// Web right/up/toward entrance -> UE right/up via X forward, Y right, Z up.
// Reflection changes handedness: web +Y rotation becomes UE negative yaw.
export function unrealPosition(p: readonly number[]): [number, number, number] {
  if (p.length !== 3 || p.some(v => !Number.isFinite(v))) throw Error('无效场景坐标');
  return [-p[2] * 100, p[0] * 100, p[1] * 100];
}
export function createUnrealSnapshot(rawPreset: BuildPreset, rawCatalog: Catalog) {
  const preset = presetSchema.parse(rawPreset);
  const catalog = catalogSchema.parse(rawCatalog);
  validateState(preset, catalog);
  return {
    protocol: 'frost.unreal.snapshot', version: 1,
    units: 'centimeters', axes: 'X=-webZ,Y=webX,Z=webY',
    roomSizeCm: [preset.room[1]*100, preset.room[0]*100, preset.room[2]*100],
    instances: preset.instances.map(i => {
      const sku = catalog.skus.find(s => s.id === i.skuId)!;
      const product = catalog.products.find(p => p.id === sku.productId)!;
      return {
        id: i.id, skuId: sku.id, label: sku.label, category: product.category,
        quantity: i.quantity, locationCm: unrealPosition(i.position),
        yawDegrees: -i.rotation * 180 / Math.PI,
        officialColor: sku.officialColor, customColor: i.customColor,
        assetId: sku.assetId, assetAccuracy: catalog.assets.find(a=>a.id===sku.assetId)!.accuracy,
        dimensionsMm: sku.dimensionsMm, status: sku.status,
      };
    }),
    fixedAnchors: Object.fromEntries(['coffee','door'].map(key=>[key, unrealPosition(ROOM_LAYOUT[key as 'coffee'|'door'])])),
    cameras: Object.fromEntries(Object.entries(cameraPoses).map(([id,p])=>[id, {
      locationCm: unrealPosition(p.position), targetCm: unrealPosition(p.look),
    }])),
    presentation: { camera: preset.camera, night: preset.night, timeOfDay: preset.timeOfDay,
      scenery: preset.scenery, quality: preset.quality, light: preset.light,
      brightness: preset.brightness, explode: preset.explode, sidePanel: preset.sidePanel,
      wallpaper: preset.wallpaper, tvWallpaper: preset.tvWallpaper },
    // Keep the original validated data for lossless restoration; UE must not invent SKU facts.
    source: { preset, catalog },
  };
}
