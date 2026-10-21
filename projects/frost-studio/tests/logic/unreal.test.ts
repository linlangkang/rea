import { describe, it, expect } from 'vitest';
import { createUnrealSnapshot, unrealPosition } from '../../src/domain/unreal';
import { catalog, defaultPreset } from '../../src/data/catalog';
describe('UE migration contract', () => {
  it('maps entrance to negative X and keeps up and right orthogonal', () => {
    expect(unrealPosition([0,0,1])).toEqual([-100,0,0]);
    expect(unrealPosition([1,1,0])).toEqual([-0,100,100]);
    expect(()=>unrealPosition([NaN,0,0])).toThrow();
  });
  it('preserves configuration, independent monitors and colors without mutating state', () => {
    const p=defaultPreset(); const before=JSON.stringify(p);
    const out=createUnrealSnapshot(p,catalog);
    expect(out.instances.filter(i=>i.category==='显示器')).toHaveLength(2);
    expect(out.source.preset).toEqual(p);
    expect(JSON.stringify(p)).toBe(before);
    expect(out.instances.find(i=>i.id==='desk')!.yawDegrees).toBeCloseTo(-90);
  });
  it('rejects broken SKU references before export', () => {
    const p=defaultPreset(); p.instances[0].skuId='missing';
    expect(()=>createUnrealSnapshot(p,catalog)).toThrow();
  });
});
