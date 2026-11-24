import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { ROOMS, FLOORS, FLOOR_HEIGHT } from './house.js';

// ---------------------------------------------------------------- state
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'smarthome' } });
const ALL_FIXTURES = ROOMS.flatMap(r => r.fixtures.map(f => ({ ...f, room: r.id })));
const fixtureState = new Map(ALL_FIXTURES.map(f => [f.id, false]));
const fixtureLink = new Map();      // id -> {device_id, n}
const channelReported = new Map();  // "device:n" -> bool
let user = null;                    // supabase user, or null in demo mode
let demo = false;
let activeFloor = 0;
let focusedRoom = null;
let night = true;

const $ = s => document.querySelector(s);

// ---------------------------------------------------------------- scene
const canvasWrap = $('#scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
canvasWrap.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.domElement.className = 'labels';
canvasWrap.appendChild(labels.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 3;
controls.maxDistance = 45;

const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x3a3226, 1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dd, 1.6);
sun.position.set(-12, 22, -8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
scene.add(sun);
sun.target.position.set(5, 0, 8);
scene.add(sun.target);

// ground
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(5, -0.06, 8); ground.receiveShadow = true;
scene.add(ground);

const HOUSE_CENTER = new THREE.Vector3(5, 0, 8);
// Mirror x so the house reads as seen from the street (three.js looks down +z with +x to the left).
const HOUSE_W = 10;
const wx = x => HOUSE_W - x;
const floorGroups = FLOORS.map(f => { const g = new THREE.Group(); g.position.set(HOUSE_W, f.id * FLOOR_HEIGHT, 0); g.scale.x = -1; scene.add(g); return g; });

// ---------------------------------------------------------------- materials & helpers
const matCache = new Map();
function mat(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  return matCache.get(key);
}
function box(w, h, d, color, x, y, z, parent, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function cyl(rt, rb, h, color, x, y, z, parent, seg = 24, extra) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, extra));
  m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
}

// soft round glow texture used for light pools and halos
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const WARM = new THREE.Color(0xffd9a0), COOL = new THREE.Color(0xe8f0ff);

// ---------------------------------------------------------------- build rooms
const WALL_H = 1.25, WALL_T = 0.12, CEIL = 2.6;
const roomFloors = [];     // meshes to click on to enter a room
const fixtureObjs = new Map(); // id -> {group, setOn(bool), hit:[meshes], fan?}

for (const room of ROOMS) {
  const g = floorGroups[room.floor];
  const [x0, z0, x1, z1] = room.rect;
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  const fl = box(w - 0.02, 0.1, d - 0.02, room.floorColor, cx, -0.05, cz, g);
  fl.userData.room = room.id; roomFloors.push(fl);

  const wc = room.wallColor || '#f4f1ea';
  box(w, WALL_H, WALL_T, wc, cx, WALL_H / 2, z0 + WALL_T / 2, g);
  box(w, WALL_H, WALL_T, wc, cx, WALL_H / 2, z1 - WALL_T / 2, g);
  box(WALL_T, WALL_H, d, wc, x0 + WALL_T / 2, WALL_H / 2, cz, g);
  box(WALL_T, WALL_H, d, wc, x1 - WALL_T / 2, WALL_H / 2, cz, g);
  // wall caps, a thin dark line that makes the cutaway read clearly
  for (const [bw, bd, bx, bz] of [[w, WALL_T, cx, z0 + WALL_T / 2], [w, WALL_T, cx, z1 - WALL_T / 2], [WALL_T, d, x0 + WALL_T / 2, cz], [WALL_T, d, x1 - WALL_T / 2, cz]])
    box(bw + 0.001, 0.02, bd + 0.001, '#2a2622', bx, WALL_H + 0.01, bz, g);

  for (const f of room.furniture) buildFurniture(f, g);
  for (const fx of room.fixtures) buildFixture({ ...fx, room: room.id }, g);

  const el = document.createElement('button');
  el.className = 'room-label'; el.textContent = room.name;
  el.onclick = () => focusRoom(room.id);
  const lab = new CSS2DObject(el); lab.position.set(cx, WALL_H + 0.35, cz); g.add(lab);
  room._label = lab;
}

function buildFurniture(f, g) {
  const [x, z] = f.at;
  const [w, d] = f.size || [1, 1];
  switch (f.type) {
    case 'rug': { const m = box(w, 0.015, d, f.color, x, 0.01, z, g); m.castShadow = false; break; }
    case 'bed': {
      const [bw, bd] = f.rot ? [d, w] : [w, d];
      box(bw, 0.35, bd, '#5b4636', x, 0.18, z, g);
      box(bw - 0.08, 0.18, bd - 0.08, f.color, x, 0.44, z, g);
      if (f.rot) box(0.12, 1.0, bd + 0.1, f.head, x - bw / 2 - 0.02, 0.5, z, g);
      else box(bw + 0.1, 1.0, 0.12, f.head, x, 0.5, z + bd / 2 + 0.02, g);
      break;
    }
    case 'sofa': {
      box(w, 0.42, d, f.color, x, 0.21, z, g);
      const back = w > d ? [w, 0.4, 0.22, x, 0.62, z - d / 2 + 0.11] : [0.22, 0.4, d, x + w / 2 - 0.11, 0.62, z];
      box(...back.slice(0, 3), f.color, ...back.slice(3), g);
      break;
    }
    case 'sofaL': {
      box(w, 0.42, 0.9, f.color, x, 0.21, z - d / 2 + 0.45, g);
      box(0.9, 0.42, d, f.color, x - w / 2 + 0.45, 0.21, z, g);
      box(w, 0.4, 0.2, f.color, x, 0.62, z - d / 2 + 0.1, g);
      break;
    }
    case 'table': {
      const h = f.low ? 0.4 : 0.76;
      box(w, 0.05, d, f.color, x, h, z, g);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, h, 0.05, '#3b2b20', x + sx * (w / 2 - 0.08), h / 2, z + sz * (d / 2 - 0.08), g);
      break;
    }
    case 'chair': {
      const c = f.color || '#1f2430', s = f.big ? 0.85 : 0.45;
      box(s, f.big ? 0.45 : 0.06, s, c, x, f.big ? 0.25 : 0.46, z, g);
      box(s, f.big ? 0.5 : 0.45, 0.08, c, x, f.big ? 0.7 : 0.72, z + (z > 8 ? 0.2 : -0.2), g);
      break;
    }
    case 'desk': box(w, 0.75, d, f.color, x, 0.375, z, g); break;
    case 'counter': box(w, 0.9, d, f.color, x, 0.45, z, g); box(w + 0.02, 0.04, d + 0.02, '#141414', x, 0.92, z, g); break;
    case 'fridge': box(w, 1.8, d, '#f3f3f3', x, 0.9, z, g); break;
    case 'wardrobe': box(w, 2.2, d, '#f6f6f4', x, 1.1, z, g); break;
    case 'cabinet': box(w, 0.8, d, f.color, x, 0.4, z, g); break;
    case 'tv': {
      if (f.monitor) { box(0.8, 0.45, 0.05, '#0d0d12', x, 1.05, z, g); box(0.76, 0.41, 0.01, '#4a6cff', x, 1.05, z + 0.03, g, { emissive: '#3346c8', emissiveIntensity: 0.8 }); }
      else { box(0.12, 0.7, 1.2, '#0d0d12', x, 1.0, z, g); }
      break;
    }
    case 'plant': {
      cyl(0.16, 0.12, 0.35, '#7a5a3a', x, 0.18, z, g);
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), mat('#3f7a3f', { flatShading: true }));
      leaf.position.set(x, 0.65, z); leaf.castShadow = true; g.add(leaf);
      break;
    }
    case 'stairs': {
      const steps = 10, sw = w, run = d / steps;
      for (let i = 0; i < steps; i++) {
        if (f.upper) { box(sw, 0.05, run, '#b9b4ab', x, 0.02, z + d / 2 - run * (i + 0.5), g); continue; }
        const h = ((i + 1) / steps) * FLOOR_HEIGHT * 0.95;
        box(sw, 0.16, run + 0.02, '#c4beb4', x, h - 0.08, z + d / 2 - run * (i + 0.5), g);
      }
      // steel rail
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(d, FLOOR_HEIGHT * 0.9), 8), mat('#d0d4d8', { metalness: 0.9, roughness: 0.25 }));
      rail.position.set(x + sw / 2, FLOOR_HEIGHT * 0.5 + 0.5, z);
      rail.rotation.x = Math.atan2(d, FLOOR_HEIGHT * 0.9);
      if (!f.upper) g.add(rail);
      break;
    }
  }
}

// ---------------------------------------------------------------- fixtures
function buildFixture(fx, g) {
  const [x, z] = fx.at;
  const grp = new THREE.Group(); g.add(grp);
  const hit = [];
  const color = fx.kind === 'strip' || fx.kind === 'exhaust' ? COOL : WARM;

  // glow halo + light pool on the floor (cheap, looks like light, no real light cost)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2;
  grp.add(halo, pool);
  let bulbMat, fan = null;

  if (fx.kind === 'light') {
    const y = fx.wallLight ? 1.9 : CEIL;
    bulbMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, emissive: color, emissiveIntensity: 0 });
    if (fx.wallLight) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.08), bulbMat);
      b.position.set(x, y, z); grp.add(b); hit.push(b);
      halo.position.set(x, y, z); halo.scale.setScalar(1.3);
      pool.position.set(x, 0.02, z + (z < 1 ? 0.8 : -0.8)); pool.scale.set(2.4, 2.4, 1);
    } else {
      // a short cord so ceiling lights read as hanging in the cutaway
      const cord = cyl(0.008, 0.008, fx.pendant ? 0.9 : 0.35, '#333', x, y + (fx.pendant ? 0.45 : 0.18) - 0.1, z, grp, 6);
      const shape = fx.pendant ? new THREE.SphereGeometry(0.2, 20, 14) : new THREE.CylinderGeometry(0.24, 0.28, 0.08, 28);
      const b = new THREE.Mesh(shape, bulbMat);
      b.position.set(x, fx.pendant ? y - 0.55 : y - 0.12, z); grp.add(b); hit.push(b, cord);
      halo.position.copy(b.position); halo.scale.setScalar(1.6);
      pool.position.set(x, 0.02, z); pool.scale.set(3.6, 3.6, 1);
    }
  } else if (fx.kind === 'lamp') {
    const h = fx.small ? 0.55 : 1.55;
    cyl(0.14, 0.16, 0.03, '#222', x, 0.02, z, grp);
    const pole = cyl(0.015, 0.015, h, '#222', x, h / 2, z, grp, 8);
    bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: WARM, emissiveIntensity: 0, transparent: true, opacity: 0.95 });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(fx.small ? 0.1 : 0.2, fx.small ? 0.14 : 0.26, fx.small ? 0.18 : 0.36, 24, 1, true), bulbMat);
    shade.material.side = THREE.DoubleSide;
    shade.position.set(x, h + 0.08, z); grp.add(shade); hit.push(shade, pole);
    halo.position.copy(shade.position); halo.scale.setScalar(fx.small ? 0.9 : 1.6);
    pool.position.set(x, 0.02, z); pool.scale.set(fx.small ? 1.6 : 2.6, fx.small ? 1.6 : 2.6, 1);
  } else if (fx.kind === 'strip') {
    const len = fx.len || 1.2, y = fx.onBed ? 1.02 : 2.3;
    bulbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: COOL, emissiveIntensity: 0 });
    const geo = fx.wall === 'x' ? new THREE.BoxGeometry(0.04, 0.04, len) : new THREE.BoxGeometry(len, 0.04, 0.04);
    const s = new THREE.Mesh(geo, bulbMat);
    s.position.set(fx.onBed ? x - 0.92 : x, y, z); grp.add(s);
    // a fat invisible hit box so the thin strip is easy to tap
    const hb = new THREE.Mesh(fx.wall === 'x' ? new THREE.BoxGeometry(0.3, 0.3, len) : new THREE.BoxGeometry(len, 0.3, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.copy(s.position); grp.add(hb); hit.push(s, hb);
    halo.position.copy(s.position); halo.scale.setScalar(len * 1.2);
    pool.position.set(s.position.x + (fx.onBed ? 0.7 : 0), 0.5, s.position.z); pool.scale.set(2, 2, 1);
  } else if (fx.kind === 'fan' || fx.kind === 'exhaust') {
    if (fx.kind === 'fan') {
      cyl(0.012, 0.012, 0.35, '#e8e8e8', x, CEIL + 0.05, z, grp, 6);
      fan = new THREE.Group(); fan.position.set(x, CEIL - 0.14, z); grp.add(fan);
      const hub = cyl(0.09, 0.11, 0.1, '#f2f2f2', 0, 0, 0, fan); hit.push(hub);
      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.13), mat('#f4f4f2'));
        blade.geometry.translate(0.38, 0, 0); blade.rotation.y = (i * Math.PI * 2) / 3; blade.castShadow = true;
        fan.add(blade); hit.push(blade);
      }
      bulbMat = hub.material = hub.material.clone();
    } else {
      fan = new THREE.Group();
      const onX = fx.wall === 'x';
      fan.position.set(x, 2.0, z); grp.add(fan);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(onX ? 0.06 : 0.36, 0.36, onX ? 0.36 : 0.06), mat('#eeeeee'));
      grp.add(frame); frame.position.copy(fan.position); hit.push(frame);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.05), mat('#9aa0a6'));
        blade.geometry.translate(0, 0.07, 0); blade.rotation.x = (i * Math.PI) / 2; fan.add(blade);
      }
      if (onX) fan.rotation.z = Math.PI / 2;
      bulbMat = frame.material = frame.material.clone();
      fan.userData.axis = onX ? 'x' : 'z';
    }
    halo.visible = pool.visible = false;
  }

  for (const m of hit) m.userData.fixture = fx.id;

  const obj = {
    fx, grp, hit, fan, spin: 0, target: 0, level: 0,
    setOn(on) { this.target = on ? 1 : 0; },
    tick(dt) {
      this.level += (this.target - this.level) * Math.min(1, dt * 6);
      const L = this.level;
      if (fan) {
        this.spin += dt * L * (fx.kind === 'fan' ? 9 : 14);
        if (fx.kind === 'fan') fan.rotation.y = this.spin;
        else fan.rotation.x = this.spin;
        bulbMat.emissive = new THREE.Color(0x7fd1ff); bulbMat.emissiveIntensity = L * 0.35;
      } else {
        bulbMat.emissiveIntensity = L * (fx.kind === 'strip' ? 4 : 2.4);
        halo.material.opacity = L * (night ? 0.75 : 0.35);
        pool.material.opacity = L * (night ? 0.55 : 0.18);
      }
    },
  };
  fixtureObjs.set(fx.id, obj);
}

// ---------------------------------------------------------------- camera moves
const camGoal = { pos: new THREE.Vector3(), target: new THREE.Vector3(), active: false };
function flyTo(pos, target) { camGoal.pos.copy(pos); camGoal.target.copy(target); camGoal.active = true; }

// distance that fits a span of `span` metres on screen, for any screen shape
function fitDist(span) {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const fitH = span / (2 * Math.tan(vfov / 2));
  return fitH / Math.min(1, camera.aspect) * 1.05;
}
const VIEW_DIR = new THREE.Vector3(0.35, 1.25, -1).normalize();
function overviewPose() {
  const y = activeFloor * FLOOR_HEIGHT;
  const target = new THREE.Vector3(5, y, 8);
  return [target.clone().addScaledVector(VIEW_DIR, fitDist(camera.aspect < 1 ? 11 : 14)), target];
}
function focusRoom(id) {
  const room = ROOMS.find(r => r.id === id);
  if (room.floor !== activeFloor) setFloor(room.floor, false);
  focusedRoom = id;
  const [x0, z0, x1, z1] = room.rect;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, span = Math.max(x1 - x0, z1 - z0, 3.5);
  const y = room.floor * FLOOR_HEIGHT;
  const target = new THREE.Vector3(wx(cx), y + 0.6, cz);
  flyTo(target.clone().addScaledVector(VIEW_DIR, fitDist(span + 1.5)), target);
  for (const r of ROOMS) r._label.visible = false;
  renderPanel();
}
function overview() {
  focusedRoom = null;
  flyTo(...overviewPose());
  for (const r of ROOMS) r._label.visible = r.floor === activeFloor;
  renderPanel();
}
function setFloor(f, move = true) {
  activeFloor = f;
  floorGroups.forEach((g, i) => { g.visible = i <= f; });
  document.querySelectorAll('[data-floor]').forEach(b => b.classList.toggle('on', +b.dataset.floor === f));
  for (const r of ROOMS) r._label.visible = !focusedRoom && r.floor === f;
  if (move) overview();
}

// ---------------------------------------------------------------- picking
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const targets = [];
  for (const o of fixtureObjs.values()) if (floorGroups[ROOMS.find(x => x.id === o.fx.room).floor].visible && ROOMS.find(x => x.id === o.fx.room).floor === activeFloor) targets.push(...o.hit);
  const fHit = ray.intersectObjects(targets, false)[0];
  if (fHit) return toggle(fHit.object.userData.fixture);
  const rHit = ray.intersectObjects(roomFloors.filter(m => ROOMS.find(x => x.id === m.userData.room).floor === activeFloor), false)[0];
  if (rHit && rHit.object.userData.room !== focusedRoom) focusRoom(rHit.object.userData.room);
});

// ---------------------------------------------------------------- data
async function toggle(id, force) {
  const next = force ?? !fixtureState.get(id);
  applyState(id, next);
  if (navigator.userActivation?.hasBeenActive && navigator.vibrate) navigator.vibrate(12);
  if (demo || !user) return;
  const { error } = await sb.from('fixtures').update({ on_state: next }).eq('owner', user.id).eq('id', id);
  if (error) { applyState(id, !next); toast('Could not save. Check your connection.'); }
}
function applyState(id, on) {
  fixtureState.set(id, on);
  fixtureObjs.get(id)?.setOn(on);
  renderPanel();
  updateCounts();
}

async function loadFixtures() {
  const { data, error } = await sb.from('fixtures').select('id,on_state,device_id,n').eq('owner', user.id);
  if (error) return toast('Could not load your house: ' + error.message);
  const have = new Set(data.map(r => r.id));
  const missing = ALL_FIXTURES.filter(f => !have.has(f.id)).map(f => ({ id: f.id, room: f.room, name: f.name, kind: f.kind }));
  if (missing.length) {
    const { error: e2 } = await sb.from('fixtures').insert(missing);
    if (e2) toast('Could not set up your house: ' + e2.message);
  }
  for (const r of data) {
    if (!fixtureState.has(r.id)) continue;
    applyState(r.id, r.on_state);
    if (r.device_id != null && r.n != null) fixtureLink.set(r.id, { device_id: r.device_id, n: r.n });
  }
  if (fixtureLink.size) {
    const { data: ch } = await sb.from('channels').select('device_id,n,reported');
    for (const c of ch || []) channelReported.set(`${c.device_id}:${c.n}`, c.reported);
  }
  renderPanel();
}

let rt = null;
function subscribe() {
  rt?.unsubscribe();
  rt = sb.channel('house-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', { event: '*', schema: 'smarthome', table: 'fixtures', filter: `owner=eq.${user.id}` }, p => {
      const r = p.new; if (r && fixtureState.has(r.id) && r.on_state !== fixtureState.get(r.id)) applyState(r.id, r.on_state);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'smarthome', table: 'channels' }, p => {
      channelReported.set(`${p.new.device_id}:${p.new.n}`, p.new.reported); renderPanel();
    })
    .subscribe(s => { if (s === 'SUBSCRIBED') loadFixtures(); });
}
// changes made while the phone slept are fetched again when it wakes
document.addEventListener('visibilitychange', () => { if (!document.hidden && user) loadFixtures(); });

// ---------------------------------------------------------------- UI
function updateCounts() {
  const on = [...fixtureState.values()].filter(Boolean).length;
  $('#count').textContent = on ? `${on} on` : 'All off';
}
function renderPanel() {
  const panel = $('#panel');
  if (!focusedRoom) { panel.classList.remove('open'); return; }
  const room = ROOMS.find(r => r.id === focusedRoom);
  panel.classList.add('open');
  $('#panel-title').textContent = room.name;
  const list = $('#panel-list'); list.innerHTML = '';
  for (const f of room.fixtures) {
    const on = fixtureState.get(f.id);
    const link = fixtureLink.get(f.id);
    let sub = { light: 'Light', fan: 'Fan', lamp: 'Lamp', strip: 'LED strip', exhaust: 'Exhaust fan' }[f.kind];
    if (link) {
      const rep = channelReported.get(`${link.device_id}:${link.n}`);
      sub += rep === on ? ' · relay confirmed' : ' · waiting for relay…';
    } else if (!demo) sub += ' · not wired yet';
    const row = document.createElement('label');
    row.className = 'row' + (on ? ' on' : '');
    row.innerHTML = `<span class="ico ${f.kind}"></span><span class="txt"><b></b><small></small></span>
      <input type="checkbox" role="switch" ${on ? 'checked' : ''}><span class="sw"></span>`;
    row.querySelector('b').textContent = f.name;
    row.querySelector('small').textContent = sub;
    row.querySelector('input').onchange = e => toggle(f.id, e.target.checked);
    list.appendChild(row);
  }
}
$('#panel-alloff').onclick = () => {
  const room = ROOMS.find(r => r.id === focusedRoom);
  for (const f of room.fixtures) if (fixtureState.get(f.id)) toggle(f.id, false);
};
$('#back').onclick = overview;
document.querySelectorAll('[data-floor]').forEach(b => b.onclick = () => { focusedRoom = null; setFloor(+b.dataset.floor); });
$('#mode').onclick = () => { night = !night; applyMood(); };
function applyMood() {
  $('#mode').textContent = night ? '☀︎' : '☾';
  $('#mode').setAttribute('aria-label', night ? 'Switch to day view' : 'Switch to night view');
  scene.background = new THREE.Color(night ? 0x0d1016 : 0xcfd8e3);
  scene.fog = new THREE.Fog(scene.background, 30, 70);
  hemi.intensity = night ? 0.55 : 1.1;
  sun.intensity = night ? 0.45 : 1.8;
  sun.color.set(night ? 0x8fa8ff : 0xfff1dd);
  renderer.toneMappingExposure = night ? 1.05 : 1.0;
  ground.material.color.set(night ? 0x14171c : 0x9aa48f);
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }

// ---------------------------------------------------------------- auth
async function startSession(u) {
  user = u; demo = false;
  $('#auth').hidden = true;
  $('#who').textContent = u.email;
  $('#signout').hidden = false;
  await loadFixtures();
  subscribe();
}
$('#auth-form').onsubmit = async e => {
  e.preventDefault();
  const email = $('#email').value.trim(), password = $('#password').value;
  const signup = $('#auth-form').dataset.mode === 'signup';
  $('#auth-go').disabled = true; $('#auth-msg').textContent = '';
  const res = signup
    ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.href.split('#')[0] } })
    : await sb.auth.signInWithPassword({ email, password });
  $('#auth-go').disabled = false;
  if (res.error) { $('#auth-msg').textContent = res.error.message; return; }
  if (signup && !res.data.session) { $('#auth-msg').textContent = 'Check your email to confirm, then log in here.'; setAuthMode('login'); return; }
  startSession(res.data.user);
};
function setAuthMode(m) {
  $('#auth-form').dataset.mode = m;
  $('#auth-go').textContent = m === 'signup' ? 'Create account' : 'Log in';
  $('#auth-switch').textContent = m === 'signup' ? 'Have an account? Log in' : 'New here? Create an account';
  $('#password').autocomplete = m === 'signup' ? 'new-password' : 'current-password';
}
$('#auth-switch').onclick = () => setAuthMode($('#auth-form').dataset.mode === 'signup' ? 'login' : 'signup');
$('#demo').onclick = () => { demo = true; $('#auth').hidden = true; $('#who').textContent = 'Demo, not saved'; };
$('#signout').onclick = async () => { await sb.auth.signOut(); location.reload(); };

// ---------------------------------------------------------------- loop
function resize() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  renderer.setSize(w, h); labels.setSize(w, h);
  camera.aspect = w / h;
  applyViewOffset();
}
let viewShift = 0, viewShiftGoal = 0;
function applyViewOffset() {
  const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
  if (viewShift > 0.001) camera.setViewOffset(w, h, 0, h * viewShift, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (camGoal.active) {
    const k = 1 - Math.pow(0.0015, dt);
    camera.position.lerp(camGoal.pos, k);
    controls.target.lerp(camGoal.target, k);
    if (camera.position.distanceTo(camGoal.pos) < 0.02) camGoal.active = false;
  }
  for (const o of fixtureObjs.values()) o.tick(dt);
  viewShiftGoal = focusedRoom && innerWidth <= 720 ? 0.17 : 0;
  if (Math.abs(viewShift - viewShiftGoal) > 0.001) { viewShift += (viewShiftGoal - viewShift) * Math.min(1, dt * 6); applyViewOffset(); }
  controls.update();
  renderer.render(scene, camera);
  labels.render(scene, camera);
});
controls.addEventListener('start', () => { camGoal.active = false; });

resize();
applyMood();
setFloor(0, false);
const [p0, t0] = overviewPose();
camera.position.copy(p0).add(new THREE.Vector3(-8, 10, -8));
controls.target.copy(t0);
overview();
updateCounts();
window.__house = { toggle, focusRoom, overview, setFloor, fixtureState }; // for testing

const { data: { session } } = await sb.auth.getSession();
if (session) startSession(session.user);
