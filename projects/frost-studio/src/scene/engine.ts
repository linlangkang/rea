import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { makeModel, disposeObject, geometries, materials } from "./models";
import { makePc, internalIds, applyExplosion, type Part } from "./pc";
import { makeRoom } from "./room";
import { loadModelAsset, createAssetManager } from "./assets";
import { batchStaticMeshes, type BatchStats } from "./batch";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import {
  assetState,
  loadTexture,
  loadEnvironment,
  textureQuality,
  clearSurfaceMaterials,
  disposeSurfaces,
} from "./surfaces";
import { cameraPoses } from "./layout";
import { contactShadow } from "./contact";
import type { BuildPreset, Catalog } from "../domain/schema";
export type EngineAPI = {
  rotate: (enabled: boolean) => void;
  zoom: (factor: number) => void;
  snapshot: () => Promise<Blob>;
  exportRoom: () => Promise<void>;
  inspectHardware: (name: string) => void;
  fridge: (open: boolean) => void;
  focus: (name: string) => void;
  update: (p: BuildPreset, c: Catalog) => void;
  select: (id: string | null) => void;
  dispose: () => void;
  diagnostics: () => unknown;
  project: (id: string) => { x: number; y: number } | null;
  captureCamera: () => void;
};
export async function createEngine(
  host: HTMLElement,
  onSelect: (id: string | null) => void,
  onStatus: (s: string) => void,
  onMetrics: (fps: number) => void,
  options: { mode?: "room" | "build" } = {},
): Promise<EngineAPI> {
  const buildMode = options.mode === "build";
  let autoRotate = false;
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    buildMode ? "可旋转的 3D 主机装配" : "可旋转的 3D 电竞房间",
  );
  renderer.domElement.setAttribute("role", "img");
  renderer.setClearColor("#101b2a");
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.AgXToneMapping;
  renderer.toneMappingExposure = 1.02;
  const scene = new T.Scene();
  let fridgeOpen = false;
  const camera = new T.PerspectiveCamera(46, 1, 0.025, 120);
  const pmrem = new T.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  let environment = pmrem.fromScene(envScene, 0.04);
  envScene.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.35;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minDistance = 0.3;
  controls.maxDistance = buildMode ? 5 : 21;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.target.set(0, 0.7, 0);
  camera.position.set(9, 8, 11);
  const ambient = new T.HemisphereLight("#eaf1ff", "#dce0e5", 0.6);
  scene.add(ambient);
  const sun = new T.DirectionalLight("#d8ecff", 3.8);
  sun.position.set(2, 8, 4);
  sun.castShadow = true;
  sun.shadow.autoUpdate = false;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: buildMode ? -0.8 : -6,
    right: buildMode ? 0.8 : 6,
    top: buildMode ? 0.8 : 6,
    bottom: buildMode ? -0.8 : -6,
    near: 0.5,
    far: 25,
  });
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.008;
  sun.shadow.radius = 3;
  scene.add(sun);
  const accent = new T.PointLight("#89c9f0", 0.1, 3.2);
  accent.position.set(-2.9, 0.5, -0.65);
  if (!buildMode) scene.add(accent);
  RectAreaLightUniformsLib.init();
  const roomLight = new T.RectAreaLight("#ffdcad", 1, 5, 5);
  roomLight.position.set(0.5, 2.93, 0);
  roomLight.rotation.x = -Math.PI / 2;
  if (!buildMode) scene.add(roomLight);
  const windowLight = new T.RectAreaLight("#e4edfa", 1.2, 6, 2.5);
  if (!buildMode) scene.add(windowLight);
  const screenLight = new T.RectAreaLight("#bbd6ee", 0.1, 1.15, 0.29);
  if (!buildMode) scene.add(screenLight);
  const fill = new T.DirectionalLight("#e2edff", 0.45);
  fill.position.set(-5, 3, -6);
  scene.add(fill);
  // Upward broad fill approximates floor bounce; this is not real-time global illumination.
  const bounce = new T.DirectionalLight("#e5eef6", 0.65);
  bounce.position.set(0, 0.15, 0);
  bounce.target.position.set(0, 3, 0);
  scene.add(bounce, bounce.target);
  const wallpaper = document.createElement("canvas");
  wallpaper.width = 512;
  wallpaper.height = 288;
  const ctx = wallpaper.getContext("2d")!;
  const texture = new T.CanvasTexture(wallpaper);
  texture.colorSpace = T.SRGBColorSpace;
  const tvCanvas = document.createElement("canvas");
  tvCanvas.width = 1024;
  tvCanvas.height = 576;
  const tvCtx = tvCanvas.getContext("2d")!;
  tvCtx.fillStyle = "#54768a";
  tvCtx.fillRect(0, 0, 1024, 576);
  const tvTexture = new T.CanvasTexture(tvCanvas);
  tvTexture.colorSpace = T.SRGBColorSpace;
  let pcPhoto: T.Texture | undefined,
    tvPhoto: T.Texture | undefined,
    tvMode = "";
  if (!buildMode)
    loadTexture("environment/mountain.png", true)
      .then((t) => {
        pcPhoto = t;
        lastPcPaint = -Infinity;
      })
      .catch(() => {});
  let world = new T.Group();
  scene.add(world);
  let groups = new Map<string, T.Group>();
  let parts: Part[] = [];
  let panel: T.Mesh | undefined;
  let pcRoot: T.Group | undefined, pcDistant: T.Group | undefined;
  let pcDetailFull = true;
  const pcWorldPosition = new T.Vector3();
  let lamps: T.MeshStandardMaterial[] = [];
  let rotors: T.Object3D[] = [];
  let waters: T.Mesh[] = [];
  let fridgeDoors: T.Object3D[] = [];
  const targetMin = new T.Vector3(),
    targetMax = new T.Vector3();
  const whiteLight = new T.Color("#ffffff");
  let lightingDirty = true;
  let appliedExplosion = 0;
  let updates = 0,
    rebuilds = 0;
  let batching: BatchStats = { before: 0, after: 0, merged: 0, batches: 0 };
  let shadowDirty = true,
    lastShadow = 0,
    shadowUpdates = 0;
  let screens: T.MeshBasicMaterial[] = [];
  let pcScreens: T.Mesh[] = [],
    tvScreens: T.Mesh[] = [];
  const screenFrustum = new T.Frustum(),
    screenMatrix = new T.Matrix4();
  let lastPcPaint = -Infinity,
    lastTvPaint = -Infinity,
    screenUploads = 0;
  let skies: T.MeshBasicMaterial[] = [];
  let warmLights: T.MeshStandardMaterial[] = [];
  let debugGroup = new T.Group();
  scene.add(debugGroup);
  let debugMode = "";
  let quality = "";
  let assetNotice = "";
  let modelFailure = false;
  let p: BuildPreset, c: Catalog;
  let buildKey = "";
  let view = "";
  let cameraExplosion = 0;
  let selected: string | null = null;
  let selection: T.BoxHelper | null = null;
  let transitioning = false;
  let targetCamera = new T.Vector3(),
    targetLook = new T.Vector3();
  let explosion = 0;
  let frame = 0,
    disposed = false,
    contextLost = false,
    inViewport = true,
    visible = !document.hidden,
    last = performance.now(),
    frames = 0,
    metricStart = last,
    lastWallpaper = 0;
  let version = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const presets = cameraPoses;
  assetState.set("materials/environment.hdr", "loading");
  loadEnvironment()
    .then((t) => {
      if (disposed) return;
      const next = pmrem.fromEquirectangular(t);
      environment.dispose();
      environment = next;
      scene.environment = next.texture;
      assetState.set("materials/environment.hdr", "ready");
    })
    .catch(() => assetState.set("materials/environment.hdr", "failed"));
  function setView(name: string) {
    view = name;
    resize();
    const pose = presets[name];
    targetCamera.fromArray(pose.position);
    targetLook.fromArray(pose.look);
    if (p && name === "pc") {
      const anchor = p.instances.find(
        (i) => i.id === (name === "pc" ? "case" : "desk"),
      );
      if (anchor) {
        const offset = new T.Vector3(
          ...((name === "pc" ? [0.85, 0.65, 0.85] : [1.2, 2.1, 2.6]) as [
            number,
            number,
            number,
          ]),
        );
        offset.applyAxisAngle(new T.Vector3(0, 1, 0), anchor.rotation);
        targetLook
          .fromArray(anchor.position)
          .add(new T.Vector3(0, name === "pc" ? 0.25 : 0.9, 0));
        targetCamera.fromArray(anchor.position).add(offset);
      }
    }
    if (name === "pc" && p) {
      targetLook.y += p.explode * 0.08;
      targetCamera
        .sub(targetLook)
        .multiplyScalar(1 + p.explode * 0.85)
        .add(targetLook);
    }
    if (reduced.matches) {
      camera.position.copy(targetCamera);
      controls.target.copy(targetLook);
      transitioning = false;
    } else transitioning = true;
  }
  const stopTransition = () => {
    transitioning = false;
  };
  controls.addEventListener("start", stopTransition);
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    // 78-degree horizontal field for an interior view; cap vertical field in portrait.
    camera.fov = T.MathUtils.clamp(
      T.MathUtils.radToDeg(
        2 *
          Math.atan(
            Math.tan(T.MathUtils.degToRad(view === "pc" ? 44 : 78) / 2) /
              camera.aspect,
          ),
      ),
      35,
      58,
    );
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  function clearSelection() {
    if (selection) {
      scene.remove(selection);
      selection.geometry.dispose();
      (selection.material as T.Material).dispose();
      selection = null;
    }
  }
  function select(id: string | null) {
    selected = id;
    clearSelection();
    const obj = id ? groups.get(id) : null;
    if (obj) {
      selection = new T.BoxHelper(obj, "#80e8ff");
      (selection.material as T.Material).depthTest = false;
      selection.renderOrder = 100;
      scene.add(selection);
    }
  }
  function collectMaterials() {
    lamps = [];
    screens = [];
    pcScreens = [];
    tvScreens = [];
    skies = [];
    warmLights = [];
    rotors = [];
    waters = [];
    fridgeDoors = [];
    const seen = new Set<T.Material>();
    lightingDirty = true;
    world.traverse((o) => {
      if (o.userData.fanRotor) rotors.push(o);
      if (o.userData.fridgeDoor) fridgeDoors.push(o);
      if (o instanceof T.Mesh && o.userData.water) waters.push(o);
      if (o instanceof T.Mesh) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m.map === texture) pcScreens.push(o);
          if (m.map === tvTexture) tvScreens.push(o);
          if (seen.has(m)) continue;
          seen.add(m);
          if (m.userData.led) lamps.push(m);
          if (m.userData.screen) screens.push(m);
          if (m.userData.sky) skies.push(m);
          if (m.userData.warm) warmLights.push(m);
        }
      }
    });
  }
  function rebuild() {
    rebuilds++;
    version++;
    const current = version;
    clearSelection();
    scene.remove(world);
    // 共用屏幕纹理在整个引擎生命周期内保留。
    world.traverse((o) => {
      if (o instanceof T.Mesh) {
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if (m.map === texture || m.map === tvTexture) m.map = null;
      }
    });
    disposeObject(world);
    geometries.clear();
    materials.clear();
    clearSurfaceMaterials();
    debugMode = "";
    world = new T.Group();
    scene.add(world);
    groups = new Map();
    const room = buildMode ? new T.Group() : makeRoom(p.room, p.scenery);
    world.add(room);
    if (buildMode) {
      const floor = new T.Mesh(
        new T.PlaneGeometry(6, 6),
        new T.MeshStandardMaterial({ color: "#f0f2f5", roughness: 0.9 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.004;
      floor.receiveShadow = true;
      floor.userData.noPick = true;
      room.add(floor);
      const shadow = contactShadow(0.48, 0.55);
      room.add(shadow);
      const grid = new T.GridHelper(3, 30, "#d3dbe3", "#e8ecf0");
      grid.position.y = -0.002;
      grid.userData.noPick = true;
      room.add(grid);
    }
    if (!buildMode) {
      assetState.set("model:long-life-food", "loading");
      void new GLTFLoader(createAssetManager())
        .loadAsync(
          `${import.meta.env.BASE_URL}models/long-life-food/long_life_food.gltf`,
        )
        .then((gltf) => {
          if (disposed || current !== version) {
            disposeObject(gltf.scene);
            return;
          }
          const bounds = new T.Box3().setFromObject(gltf.scene),
            size = bounds.getSize(new T.Vector3()),
            center = bounds.getCenter(new T.Vector3());
          gltf.scene.position.set(-center.x, -bounds.min.y, -center.z);
          const pantry = new T.Group();
          pantry.name = "CC0_LongLifeFood_MiaPecinaZorko";
          pantry.add(gltf.scene);
          pantry.scale.setScalar(
            Math.min(0.52 / size.x, 0.29 / size.y, 0.35 / size.z),
          );
          pantry.rotation.y = -Math.PI / 2;
          pantry.position.set(p.room[0] / 2 - 0.36, 2.248, -1.88);
          pantry.traverse((o) => {
            if (o instanceof T.Mesh) {
              o.castShadow = o.receiveShadow = true;
            }
          });
          room.add(pantry);
          batchStaticMeshes(pantry);
          shadowDirty = true;
          assetState.set("model:long-life-food", "ready");
        })
        .catch(() => {
          if (!disposed && current === version)
            assetState.set("model:long-life-food", "failed");
        });
    }
    for (const i of p.instances) {
      if (internalIds.includes(i.id) || i.id === "case") continue;
      const sku = c.skus.find((s) => s.id === i.skuId);
      const product = c.products.find((pr) => pr.id === sku?.productId);
      if (!sku || !product) continue;
      const group = makeModel(
        product.category,
        sku,
        i.customColor,
        product.category === "电视" ? tvTexture : texture,
      );
      group.position.fromArray(i.position);
      group.rotation.y = i.rotation;
      group.userData.instanceId = i.id;
      groups.set(i.id, group);
      world.add(group);
      if (["床", "沙发", "椅子", "冰箱"].includes(product.category)) {
        const dims = sku.dimensionsMm ?? [800, 1000, 800];
        const shadow = contactShadow(
          (dims[0] / 1000) * 1.08,
          (dims[2] / 1000) * 1.08,
        );
        shadow.position.x = i.position[0];
        shadow.position.z = i.position[2];
        shadow.rotation.z = i.rotation;
        world.add(shadow);
      }
      const asset = c.assets.find((a) => a.id === sku.assetId);
      if (asset?.url)
        void loadModelAsset(asset)
          .then((model) => {
            if (disposed || current !== version) {
              disposeObject(model);
              return;
            }
            disposeObject(group, true);
            group.clear();
            group.add(model);
            batchStaticMeshes(group);
            shadowDirty = true;
            collectMaterials();
          })
          .catch(() => {
            if (disposed || current !== version) return;
            modelFailure = true;
            onStatus("GLB 资源加载失败，已保留参数化模型；可重试场景");
          });
    }
    if (p.instances.some((i) => i.id === "case")) {
      const pc = makePc(p, c);
      world.add(pc.root);
      pc.groups.forEach((g, id) => groups.set(id, g));
      parts = pc.parts;
      panel = pc.panel;
      pcRoot = pc.root;
      pcDistant = pc.distant;
      pcDetailFull = true;
    } else {
      parts = [];
      panel = undefined;
      pcRoot = pcDistant = undefined;
      pcDetailFull = true;
    }
    batching = batchStaticMeshes(world);
    shadowDirty = true;
    collectMaterials();
    for (const door of fridgeDoors) door.rotation.y = fridgeOpen ? 1.65 : 0;
    applyExplosion(parts, explosion);
    appliedExplosion = explosion;
    select(selected);
  }
  function updateDebug() {
    if (debugMode === p.debug) return;
    debugMode = p.debug;
    debugGroup.traverse((o) => {
      if (o instanceof T.LineSegments) {
        o.geometry.dispose();
        (o.material as T.Material).dispose();
      }
    });
    debugGroup.clear();
    if (p.debug === "axes") debugGroup.add(new T.AxesHelper(2));
    if (p.debug === "bounds")
      for (const g of groups.values())
        debugGroup.add(new T.BoxHelper(g, "#fac769"));
    world.traverse((o) => {
      if (o instanceof T.Mesh)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          if ("wireframe" in m) m.wireframe = p.debug === "wireframe";
    });
  }
  function update(next: BuildPreset, cat: Catalog) {
    updates++;
    if (p?.wallpaper !== next.wallpaper) lastPcPaint = -Infinity;
    p = next;
    c = cat;
    lightingDirty = true;
    shadowDirty = true;
    targetMin.set(-p.room[0] / 2, 0.1, -p.room[1] / 2);
    targetMax.set(p.room[0] / 2, 3, p.room[1] / 2);
    const key = JSON.stringify([
      p.instances,
      p.room,
      p.scenery,
      c.products,
      c.skus,
      c.assets,
    ]);
    if (key !== buildKey) {
      buildKey = key;
      rebuild();
    }
    if (
      view !== p.camera ||
      (p.camera === "pc" && cameraExplosion !== p.explode)
    ) {
      view = p.camera;
      cameraExplosion = p.explode;
      setView(view);
    }
    if (panel) panel.visible = p.sidePanel;
    updateDebug();
    if (!buildMode && tvMode !== p.tvWallpaper) {
      tvMode = p.tvWallpaper;
      const mode = tvMode;
      loadTexture(`environment/${mode}.png`, true)
        .then((t) => {
          if (!disposed && mode === tvMode) {
            tvPhoto = t;
            lastTvPaint = -Infinity;
          }
        })
        .catch(() => {});
    }
    if (quality !== p.quality) {
      renderer.setPixelRatio(
        Math.min(devicePixelRatio, { low: 1, medium: 1.4, high: 2 }[p.quality]),
      );
      renderer.shadowMap.enabled = p.quality !== "low";
      quality = p.quality;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
      textureQuality(
        Math.min(
          renderer.capabilities.getMaxAnisotropy(),
          p.quality === "low" ? 2 : p.quality === "high" ? 8 : 4,
        ),
      );
      resize();
    }
  }
  function paint(time: number) {
    const mode = p.wallpaper;
    if (mode === "photo" && pcPhoto) {
      ctx.drawImage(pcPhoto.image, 0, 0, 512, 288);
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.fillText(new Date().toLocaleTimeString("zh-CN"), 18, 265);
      texture.needsUpdate = true;
      return;
    }
    const grad = ctx.createLinearGradient(0, 0, 512, 288);
    grad.addColorStop(0, mode === "aurora" ? "#071c37" : "#102f48");
    grad.addColorStop(0.55, "#236ca0");
    grad.addColorStop(1, "#7fdaeb");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 288);
    if (mode === "grid") {
      ctx.strokeStyle = "#76c9e8";
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(256, 70);
        ctx.lineTo((i - 5) * 75, 288);
        ctx.stroke();
      }
      for (let y = 110; y < 288; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `rgba(186,242,255,${0.35 - i * 0.045})`;
        ctx.lineWidth = 7 + i * 9;
        ctx.beginPath();
        for (let x = 0; x <= 512; x += 8) {
          const y =
            140 + Math.sin(x / 110 + time * 0.18 + i * 0.38) * (55 + i * 12);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      if (mode === "orbit") {
        ctx.strokeStyle = "#dafaff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(256, 144, 115, 85, -0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#e7faff";
    ctx.font = "500 16px sans-serif";
    ctx.fillText("F R O S T  /  S T U D I O", 26, 254);
    texture.needsUpdate = true;
  }
  function tick(now: number) {
    frame = 0;
    if (!visible || !p || disposed) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduced.matches && pcDetailFull) {
      for (const o of rotors)
        o.rotation.z = (o.rotation.z + dt * 7) % (Math.PI * 2);
    }
    if (transitioning) {
      const alpha = 1 - Math.exp(-dt * 6);
      camera.position.lerp(targetCamera, alpha);
      controls.target.lerp(targetLook, alpha);
      if (camera.position.distanceTo(targetCamera) < 0.005) {
        camera.position.copy(targetCamera);
        controls.target.copy(targetLook);
        transitioning = false;
      }
    }
    controls.target.clamp(targetMin, targetMax);
    camera.position.y = Math.max(0.12, camera.position.y); // 基础地面与目标限制；不是完整物理碰撞。
    if (pcRoot && pcDistant) {
      pcRoot.getWorldPosition(pcWorldPosition);
      const forced =
        p.quality === "high" ||
        p.explode > 0 ||
        explosion > 0 ||
        p.debug !== "off" ||
        !!(
          selected &&
          (internalIds.includes(selected) || selected.startsWith("ram-"))
        ) ||
        selected === "case";
      const full =
        forced ||
        camera.position.distanceTo(pcWorldPosition) <
          (pcDetailFull ? 4.2 : 3.6);
      if (full !== pcDetailFull) {
        pcDetailFull = full;
        pcDistant.visible = !full;
        for (const part of parts)
          if (part.object.userData.instanceId !== "case")
            part.object.visible = full;
        shadowDirty = true;
      }
    }
    if (Math.abs(explosion - p.explode) < 0.001 || reduced.matches)
      explosion = p.explode;
    else explosion = T.MathUtils.damp(explosion, p.explode, 8, dt);
    let objectMoved = false;
    if (appliedExplosion !== explosion) {
      applyExplosion(parts, explosion);
      appliedExplosion = explosion;
      shadowDirty = true;
      objectMoved = true;
    }
    const off = p.light === "off";
    const intensity = off
      ? 0
      : p.light === "breath" && !reduced.matches
        ? 1.0 + Math.sin(now * 0.0013) * 0.55
        : 1.3;
    if (lightingDirty || (p.light === "breath" && !reduced.matches)) {
      for (const m of lamps) {
        m.emissive.set(p.light === "white" ? "#ffffff" : "#73dfff");
        if (p.light === "breath" && !reduced.matches)
          m.emissive.lerp(whiteLight, (Math.sin(now * 0.0013) + 1) / 2);
        m.emissiveIntensity = intensity;
        m.color.set(
          off ? "#647788" : p.light === "white" ? "#ffffff" : "#a3eaff",
        );
      }
      accent.intensity = off ? 0 : (p.night ? 0.13 : 0.035) * intensity;
    }
    if (lightingDirty) {
      const hour = p.night
        ? p.timeOfDay >= 6 && p.timeOfDay < 18
          ? 21
          : p.timeOfDay
        : p.timeOfDay < 6 || p.timeOfDay >= 18
          ? 14
          : p.timeOfDay;
      const elevation = Math.max(0.12, Math.sin(((hour - 6) / 12) * Math.PI));
      sun.position.set(
        -8,
        p.night ? 6 : 2 + elevation * 10,
        (hour - 12) * 0.8 - 2,
      );
      sun.color.set(
        p.night ? "#9bbbed" : hour < 9 || hour > 16 ? "#ffd1a0" : "#fff1d6",
      );
      sun.intensity = p.night ? 0.16 : 1.25 + elevation * 0.65;
      ambient.intensity = p.night ? 0.17 : 0.42;
      fill.intensity = p.night ? 0.07 : 0.12;
      bounce.intensity = p.night ? 0.1 : 0.22;
      scene.environmentIntensity = p.night ? 0.2 : 0.65;
      roomLight.intensity = p.night ? 2.2 : 0.08;
      windowLight.position.set(-p.room[0] / 2 - 0.05, 1.7, -0.6);
      windowLight.lookAt(0, 1, -0.6);
      windowLight.intensity = p.night ? 0.12 : 2.4;
      const desk = p.instances.find((i) => i.id === "desk"),
        monitor = p.instances.find((i) => i.id === "monitor"),
        chair = p.instances.find((i) => i.id === "chair");
      if (desk)
        accent.position.set(desk.position[0] + 0.3, 0.45, desk.position[2]);
      if (monitor) {
        screenLight.position
          .fromArray(monitor.position)
          .add(new T.Vector3(0.03, 0.36, 0));
        screenLight.lookAt(
          chair
            ? new T.Vector3(...chair.position).add(new T.Vector3(0, 0.8, 0))
            : new T.Vector3(0, 1, 0),
        );
      }
      screenLight.intensity = p.brightness * (p.night ? 0.55 : 0.05);
      for (const m of warmLights) m.emissiveIntensity = p.night ? 1.4 : 0.25;
      renderer.setClearColor(p.night ? "#203042" : "#abc3d0");
      if (buildMode) {
        sun.position.set(2, 4, 3);
        sun.color.set("#fffaf3");
        sun.intensity = 2;
        ambient.intensity = 0.8;
        fill.intensity = 0.5;
        bounce.intensity = 0.12;
        roomLight.intensity =
          windowLight.intensity =
          screenLight.intensity =
          accent.intensity =
            0;
        scene.environmentIntensity = 0.75;
        renderer.setClearColor("#f0f2f5");
      }
      for (const m of screens) m.color.setScalar(p.brightness);
      lightingDirty = false;
    }
    for (const m of skies)
      if (m.userData.loaded) m.color.set(p.night ? "#536f99" : "#ffffff");
    if (now - lastWallpaper > 100) {
      camera.updateMatrixWorld();
      screenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      screenFrustum.setFromProjectionMatrix(screenMatrix);
      const needed = (meshes: T.Mesh[]) =>
        meshes.some(
          (mesh) => mesh.visible && screenFrustum.intersectsObject(mesh),
        );
      if (
        p.brightness > 0 &&
        needed(pcScreens) &&
        (lastPcPaint === -Infinity ||
          (!reduced.matches &&
            now - lastPcPaint > (p.wallpaper === "photo" ? 1000 : 100)))
      ) {
        paint(reduced.matches ? 0 : now * 0.001);
        lastPcPaint = now;
        screenUploads++;
      }
      if (
        tvPhoto &&
        p.brightness > 0 &&
        needed(tvScreens) &&
        (lastTvPaint === -Infinity ||
          (!reduced.matches && now - lastTvPaint > 100))
      ) {
        tvCtx.drawImage(tvPhoto.image, 0, 0, 1024, 576);
        if (!reduced.matches) {
          tvCtx.fillStyle = "rgba(255,255,255,.025)";
          for (let i = 0; i < 6; i++)
            tvCtx.fillRect((now * 0.008 + i * 167) % 1024, 415 + i * 19, 95, 1);
        }
        tvTexture.needsUpdate = true;
        lastTvPaint = now;
        screenUploads++;
      }
      lastWallpaper = now;
    }
    for (const water of waters)
      water.userData.waterTime.value = reduced.matches ? 0 : now * 0.001;
    for (const door of fridgeDoors) {
      const target = fridgeOpen ? 1.65 : 0;
      if (door.rotation.y !== target) {
        door.rotation.y =
          Math.abs(door.rotation.y - target) < 0.001
            ? target
            : T.MathUtils.damp(door.rotation.y, target, 5, dt);
        shadowDirty = true;
        objectMoved = true;
      }
    }
    if (objectMoved) selection?.update();
    if (shadowDirty && renderer.shadowMap.enabled && now - lastShadow > 90) {
      sun.shadow.needsUpdate = true;
      shadowDirty = false;
      lastShadow = now;
      shadowUpdates++;
    }
    controls.autoRotate = autoRotate && !reduced.matches;
    controls.autoRotateSpeed = 1;
    controls.update(dt);
    renderer.render(scene, camera);
    frames++;
    if (now - metricStart > 1500) {
      const failed = [...assetState]
        .filter(([, v]) => v === "failed")
        .map(([k]) => k);
      const notice = failed.length
        ? `资源加载失败（${failed.length}）：已保留基础材质和天空，可重试场景`
        : "场景就绪 · 原创参数化模型";
      if (notice !== assetNotice) {
        assetNotice = notice;
        if (!modelFailure) onStatus(notice);
      }
      onMetrics(Math.round((frames * 1000) / (now - metricStart)));
      frames = 0;
      metricStart = now;
    }
  }
  const ray = new T.Raycaster();
  const pointer = new T.Vector2();
  let down = { x: 0, y: 0 },
    moved = false;
  const pointerDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
    moved = false;
  };
  const pointerMove = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) moved = true;
  };
  const pointerUp = (e: PointerEvent) => {
    if (moved || e.button !== 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObjects(world.children, true);
    let hitId: string | null = null;
    for (const hit of hits) {
      let obj: T.Object3D | null = hit.object;
      let valid = true;
      while (obj) {
        if (!obj.visible || obj.userData.noPick) {
          valid = false;
          break;
        }
        obj = obj.parent;
      }
      if (!valid) continue;
      obj = hit.object;
      while (obj) {
        if (obj.userData.instanceId) {
          hitId = obj.userData.instanceId;
          break;
        }
        obj = obj.parent;
      }
      if (hitId) break;
      if (
        hit.object instanceof T.Mesh &&
        !(hit.object.material as T.Material).transparent
      )
        break; // 不穿透实体墙或家具选择被遮挡物。
    }
    onSelect(hitId);
  };
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointermove", pointerMove);
  renderer.domElement.addEventListener("pointerup", pointerUp);
  const visibility = () => {
    visible = !document.hidden && !contextLost && inViewport;
    last = performance.now();
    metricStart = last;
    frames = 0;
    cancelAnimationFrame(frame);
    if (visible && !disposed) frame = requestAnimationFrame(tick);
  };
  const viewportObserver = new IntersectionObserver(([entry]) => {
    inViewport =
      entry.isIntersecting &&
      entry.intersectionRect.width > 0 &&
      entry.intersectionRect.height > 0;
    visibility();
  });
  viewportObserver.observe(host);
  const motionChanged = () => {
    lightingDirty = true;
  };
  reduced.addEventListener("change", motionChanged);
  document.addEventListener("visibilitychange", visibility);
  const lost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    visible = false;
    cancelAnimationFrame(frame);
    onStatus("WebGL 上下文丢失，请重试；配置仍然可用");
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  frame = requestAnimationFrame(tick);
  onStatus("场景就绪 · 原创参数化模型");
  return {
    rotate(enabled) {
      autoRotate = enabled;
    },
    zoom(factor) {
      if (!Number.isFinite(factor) || factor <= 0) return;
      transitioning = false;
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(
        T.MathUtils.clamp(
          offset.length() * factor,
          controls.minDistance,
          controls.maxDistance,
        ),
      );
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    async snapshot() {
      renderer.render(scene, camera);
      return new Promise((resolve, reject) =>
        renderer.domElement.toBlob(
          (blob) => (blob ? resolve(blob) : reject(Error("图片导出失败"))),
          "image/png",
        ),
      );
    },
    fridge(open) {
      fridgeOpen = open;
    },
    inspectHardware(name) {
      const poses: Record<string, number[][]> = {
        keyboard: [
          [-2.63, 1.07, -0.56],
          [-2.95, 0.8, -0.67],
        ],
        headset: [
          [-2.9, 1.13, -1.18],
          [-3.29, 1, -1.42],
        ],
        chair: [
          [-3.25, 1.03, -0.02],
          [-2.21, 0.7, -0.5],
        ],
        pc: [
          [-2.65, 1.22, -2.43],
          [-3.23, 1.03, -1.75],
        ],
      };
      poses.sofa = [
        [1.7, 1.25, 1.35],
        [-0.05, 0.58, -0.45],
      ];
      poses.bedding = [
        [-0.65, 1.25, 1.0],
        [-2.2, 0.65, 2.7],
      ];
      poses.coffee = [
        [2.8, 1.05, 0.6],
        [1.58, 0.42, -0.4],
      ];
      poses.plant = [
        [1.9, 1.2, 3.05],
        [3.3, 0.68, 1.65],
      ];
      poses.mouse = [
        [-2.58, 0.94, -1.06],
        [-2.93, 0.805, -1.05],
      ];
      poses.cables = [
        [-3.05, 0.47, -1.5],
        [-3.53, 0.68, -0.85],
      ];
      poses.fridge = [
        [0.9, 1.38, -3.6],
        [3.43, 0.92, -2.95],
      ];
      poses.snacks = [
        [0.9, 1.55, -1.8],
        [3.64, 1.24, -1.88],
      ];
      const pose = poses[name];
      if (!pose) return;
      if (
        ["keyboard", "headset", "chair", "pc", "mouse", "cables"].includes(name)
      )
        for (const p of pose) p[0] -= 1;
      if (["fridge", "snacks"].includes(name))
        for (const p of pose) {
          p[0] += 1;
          p[2] -= 0.5;
        }
      transitioning = false;
      camera.position.fromArray(pose[0]);
      controls.target.fromArray(pose[1]);
      camera.fov = ["fridge", "snacks"].includes(name) ? 48 : 40;
      camera.updateProjectionMatrix();
    },
    async exportRoom() {
      const { GLTFExporter } = await import(
        "three/addons/exporters/GLTFExporter.js"
      );
      const root = new T.Group();
      root.name = "FrostRoom_WebBaseline";
      // Export full authoring geometry at every camera distance; never bake the preview LOD.
      const visibility = parts.map((part) => part.object.visible);
      for (const part of parts) part.object.visible = true;
      if (pcDistant) pcDistant.visible = false;
      for (const child of scene.children) {
        if (child instanceof T.Light || child.type.includes("Helper")) continue;
        root.add(child.clone(true));
      }
      parts.forEach((part, i) => (part.object.visible = visibility[i]));
      if (pcDistant) pcDistant.visible = !pcDetailFull;
      const instances: T.InstancedMesh[] = [];
      root.traverse((o) => {
        if (o.userData.instanceId) o.name = "instance_" + o.userData.instanceId;
        o.userData = {};
        if (o instanceof T.InstancedMesh) instances.push(o);
      });
      // UE 5.7's glTF translator rejects EXT_mesh_gpu_instancing. Expand only
      // authoring copies, sharing geometry/material; the live scene stays instanced.
      for (const inst of instances) {
        const group = new T.Group();
        group.name = inst.name;
        inst.updateMatrix();
        group.applyMatrix4(inst.matrix);
        group.visible = inst.visible;
        for (let i = 0; i < inst.count; i++) {
          const mesh = new T.Mesh(inst.geometry, inst.material),
            matrix = new T.Matrix4();
          inst.getMatrixAt(i, matrix);
          mesh.applyMatrix4(matrix);
          group.add(mesh);
          if (Math.abs(matrix.determinant()) < 1e-12) mesh.removeFromParent();
        }
        inst.parent?.add(group);
        inst.removeFromParent();
      }
      const data = await new GLTFExporter().parseAsync(root, {
        binary: true,
        onlyVisible: true,
        maxTextureSize: 1024,
      });
      if (!(data instanceof ArrayBuffer))
        throw Error("GLB export did not produce binary data");
      const url = URL.createObjectURL(
        new Blob([data], { type: "model/gltf-binary" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "room-baseline.glb";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    focus: setView,
    captureCamera() {
      transitioning = false;
      camera.position.set(1.25, 2.05, 3.9);
      controls.target.set(-0.25, 1.2, -1.8);
      camera.fov = 72;
      camera.updateProjectionMatrix();
    },
    update,
    select,
    project(id) {
      const group = groups.get(id);
      if (!group) return null;
      const point = new T.Box3()
        .setFromObject(group)
        .getCenter(new T.Vector3())
        .project(camera);
      const rect = host.getBoundingClientRect();
      return {
        x: rect.left + ((point.x + 1) * rect.width) / 2,
        y: rect.top + ((1 - point.y) * rect.height) / 2,
      };
    },
    diagnostics() {
      const gl = renderer.getContext(),
        debug = gl.getExtension("WEBGL_debug_renderer_info");
      const doors: number[] = [],
        stock: string[] = [];
      world.traverse((o) => {
        if (o.userData.fridgeDoor) doors.push(o.rotation.y);
        if (o.userData.snack) stock.push(o.userData.snack);
      });
      return {
        updates,
        mode: buildMode ? "build" : "room",
        rendering: visible && !disposed,
        autoRotate: controls.autoRotate,
        rebuilds,
        pcDetail: pcDetailFull ? "full" : "distant",
        batching,
        shadowUpdates,
        screenUploads,
        geometryCount: renderer.info.memory.geometries,
        textureCount: renderer.info.memory.textures,
        fridge: { open: fridgeOpen, doorAngles: doors },
        stock: [...new Set(stock)],
        gpu: debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : "driver identity unavailable",
        fpsFrames: frames,
        renderer: renderer
          .getContext()
          .getParameter(renderer.getContext().RENDERER),
        cameraPosition: camera.position.toArray(),
        cameraTarget: controls.target.toArray(),
        fov: camera.fov,
        timeOfDay: p.timeOfDay,
        assets: Object.fromEntries(assetState),
        layout: p.instances.map((i) => ({
          id: i.id,
          position: [...i.position],
          rotation: i.rotation,
        })),
        sidePanel: panel?.visible,
        night: p.night,
        wallpaper: p.wallpaper,
        reducedMotion: reduced.matches,
        quality: p.quality,
        size: renderer.getSize(new T.Vector2()).toArray(),
        pixelRatio: renderer.getPixelRatio(),
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        explosion,
        parts: parts.map((x) => ({
          id: x.object.userData.instanceId,
          position: x.object.position.toArray(),
          home: x.home.toArray(),
        })),
        light: p?.light,
        emissive: lamps.map((m) => m.emissiveIntensity),
        selected,
        view,
        screenBrightness: screens[0]?.color.r,
        instances: [...groups].map(([id, g]) => ({
          id,
          bounds: new T.Box3()
            .setFromObject(g)
            .getSize(new T.Vector3())
            .toArray(),
          colors: (() => {
            const colors: string[] = [];
            g.traverse((o) => {
              if (o instanceof T.Mesh) {
                const m = Array.isArray(o.material)
                  ? o.material[0]
                  : o.material;
                if (m.color) colors.push(m.color.getHexString());
              }
            });
            return [...new Set(colors)];
          })(),
        })),
      };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewportObserver.disconnect();
      controls.dispose();
      clearSelection();
      disposeObject(world);
      geometries.clear();
      materials.clear();
      texture.dispose();
      tvTexture.dispose();
      environment.dispose();
      pmrem.dispose();
      disposeSurfaces();
      debugGroup.traverse((o) => {
        if (o instanceof T.LineSegments) {
          o.geometry.dispose();
          (o.material as T.Material).dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", motionChanged);
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
    },
  };
}
