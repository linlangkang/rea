import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { catalog as seed, defaultPreset } from "./data/catalog";
import { type Catalog, type BuildPreset } from "./domain/schema";
import { readSaved, saveState, validateState } from "./domain/storage";
import {updateLegacySofa} from './domain/catalog-updates';
export const useStudio = defineStore("studio", () => {
  const catalog = ref<Catalog>(structuredClone(seed));
  const preset = ref<BuildPreset>(defaultPreset());
  const cameraRevision = ref(0);
  const selected = ref<string | null>(null);
  const compared = ref<string[]>([]);
  const notice = ref("");
  const ready = ref(false);
  function restore() {
    try {
      const saved = readSaved(localStorage);
      if (saved) {
        catalog.value = saved.catalog;
        preset.value = saved.preset;
        if(preset.value.room[0]===8&&preset.value.room[1]===8){
          const next=defaultPreset();
          for(const i of preset.value.instances){
            const target=next.instances.find(n=>n.id===i.id);if(!target)continue;
            const old=[...target.position];
            if(['desk','chair','case','monitor','monitor-2','laptop','keyboard','mouse','headset','dock','cable'].includes(i.id))old[0]+=1;
            else if(i.id==='bed'){old[0]= -2.2;old[2]=2.82;}
            else if(i.id==='tv'){old[0]=3.88;old[2]=-.35;}
            else if(i.id==='fridge'){old[0]=3.43;old[2]=-2.95;}
            else continue;
            if(i.position.every((v,a)=>Math.abs(v-old[a])<.001))i.position=[...target.position];
          }
          preset.value.room=[...next.room];
        }
        notice.value = "已恢复本地方案";
        if(preset.value.layoutVersion===1){referenceLayout();notice.value='已恢复配件并迁移到修正布局；原保存未覆盖，请检查后保存';}
        const chair=preset.value.instances.find(i=>i.id==='chair');
        const keyboard=preset.value.instances.find(i=>i.id==='keyboard');
        if(keyboard&&Math.abs(keyboard.position[0]+2.95)<.001&&Math.abs(keyboard.position[2]+.65)<.001)keyboard.position[0]=defaultPreset().instances.find(i=>i.id==='keyboard')!.position[0];
        if(chair&&Math.abs(chair.position[0]+2.21)<.001&&Math.abs(chair.position[2]+.5)<.001){
          chair.position[0]=defaultPreset().instances.find(i=>i.id==='chair')!.position[0];
          notice.value='已恢复配件，旧默认椅位向桌面靠近 22 cm；原保存未覆盖';
        }
        if(updateLegacySofa(catalog.value,seed))notice.value+='；旧默认沙发已更新为三人长款，原保存未覆盖';
      } else notice.value = "尚无本地保存";
    } catch (e) {
      notice.value =
        "恢复失败：数据损坏、版本不支持或存储不可用。原保存未覆盖。";
    } finally {
      ready.value = true;
    }
  }
  function save() {
    try {
      const next = { ...preset.value, savedAt: new Date().toISOString() };
      saveState(localStorage, next, catalog.value);
      preset.value.savedAt = next.savedAt;
      notice.value = "方案已保存到当前浏览器";
    } catch {
      notice.value = "保存失败：存储不可用或已满，请导出备份";
    }
  }
  function reset() {
    preset.value = defaultPreset();
    catalog.value = structuredClone(seed);
    selected.value = null;
    notice.value = "已重置当前工作台；点击保存才会覆盖本地方案";
  }
  function referenceLayout() {
    const reference = defaultPreset();
    for (const i of preset.value.instances) {
      const pose = reference.instances.find(x => x.id === i.id);
      if (pose) { i.position = [...pose.position]; i.rotation = pose.rotation; }
    }
    preset.value.room = reference.room;
    preset.value.layoutVersion=2;
    preset.value.camera = 'default'; cameraRevision.value++;
    notice.value = '已应用参考图布局，保留当前配件与配色；保存后生效到下次访问';
  }
  function importCatalog(next: Catalog) {
    try {
      validateState(preset.value, next);
      catalog.value = next;
      notice.value = "目录已应用；请保存以持久化";
    } catch (e) {
      notice.value = String(e);
      throw e;
    }
  }
  const instance = computed(() =>
    preset.value.instances.find(
      (i) =>
        i.id === (selected.value?.startsWith("ram-") ? "ram" : selected.value),
    ),
  );
  const sku = computed(() =>
    catalog.value.skus.find((s) => s.id === instance.value?.skuId),
  );
  return {
    catalog,
    preset,
    cameraRevision,
    selected,
    compared,
    notice,
    ready,
    instance,
    sku,
    restore,
    save,
    reset,
    referenceLayout,
    importCatalog,
  };
});
