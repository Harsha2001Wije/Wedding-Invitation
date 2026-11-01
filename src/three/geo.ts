import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Geometry helpers for the realistic venue: real-world-scaled UVs so textures
// keep their size on any surface, mouldings, fluted columns, fabric, chairs.

export type V3 = [number, number, number];

/** Deterministic random numbers so the venue is identical on every device. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _n = new THREE.Vector3();
const _t = new THREE.Vector3();
const _b = new THREE.Vector3();
const _p = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Replaces UVs with per-face planar projection in metres / `size`.
 * For sloped faces v runs up the slope (roof tiles point the right way).
 */
export function planarUV(geo: THREE.BufferGeometry, size = 1, offset: [number, number] = [0, 0]) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    _n.subVectors(c, b).cross(_p.subVectors(a, b)).normalize();
    if (Math.abs(_n.y) > 0.98) {
      _t.set(1, 0, 0);
      _b.set(0, 0, -1);
    } else {
      _t.crossVectors(UP, _n).normalize();
      _b.crossVectors(_n, _t).normalize();
    }
    for (let k = 0; k < 3; k++) {
      _p.fromBufferAttribute(pos, i + k);
      uv[(i + k) * 2] = _p.dot(_t) / size + offset[0];
      uv[(i + k) * 2 + 1] = _p.dot(_b) / size + offset[1];
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** A box of real size with UVs in metres (textures don't stretch). */
export function box(w: number, h: number, d: number, size = 1, at: V3 = [0, 0, 0]) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(...at);
  return planarUV(g, size);
}

/** Merge geometries keeping uv when every part has one. */
export function merge(geos: THREE.BufferGeometry[]) {
  const withUV = geos.every((g) => g.attributes.uv);
  const anyNonIndexed = geos.some((g) => !g.index);
  const prepared = geos.map((g0) => {
    const g = anyNonIndexed && g0.index ? g0.toNonIndexed() : g0;
    for (const name of Object.keys(g.attributes)) {
      if (name === 'position' || name === 'normal' || (withUV && name === 'uv')) continue;
      g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    return g;
  });
  const out = mergeGeometries(prepared);
  if (!out) throw new Error('merge failed');
  return out;
}

/** Lathe from [radius, height] pairs with UV v in metres. */
export function lathe(profile: [number, number][], segments = 32) {
  const g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments);
  return g;
}

/** Classical column: lathe base and capital, fluted shaft. */
export function columnGeometry(height: number, radius: number, flutes = 20) {
  const shaftH = height * 0.86;
  const baseH = height * 0.06;
  const shaft = new THREE.CylinderGeometry(radius * 0.92, radius, shaftH, flutes * 4, 8, true);
  const pos = shaft.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const r = Math.hypot(x, z);
    const k = 1 - 0.045 * Math.max(0, Math.cos(a * flutes));
    pos.setX(i, (x / r) * r * k);
    pos.setZ(i, (z / r) * r * k);
  }
  shaft.computeVertexNormals();
  shaft.translate(0, baseH + shaftH / 2, 0);
  const R = radius;
  const base = lathe([[0, 0], [R * 1.45, 0], [R * 1.45, baseH * 0.35], [R * 1.3, baseH * 0.45], [R * 1.22, baseH * 0.7], [R * 1.08, baseH * 0.85], [R * 1.02, baseH], [0, baseH]], 40);
  const capY = baseH + shaftH;
  const capH = height - capY;
  const cap = lathe([[0, capY], [R * 0.95, capY], [R * 1.05, capY + capH * 0.15], [R * 0.98, capY + capH * 0.25], [R * 1.3, capY + capH * 0.65], [R * 1.42, capY + capH * 0.7], [R * 1.42, height], [0, height]], 40);
  return { shaft, base, cap };
}

/** Pleated fabric strip hanging along a catenary (drapes, swags, valances). */
export function swagGeometry(a: V3, b: V3, sag: number, depth: number, pleats = 9, segs = 48) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const rows = 6;
  const dir = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]).normalize();
  const side = new THREE.Vector3().crossVectors(dir, UP).normalize();
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const sagT = sag * 4 * t * (1 - t);
    for (let j = 0; j <= rows; j++) {
      const s = j / rows;
      const drop = sagT * (0.35 + 0.65 * s) + depth * s * (0.3 + 0.7 * Math.sin(Math.PI * t));
      const fold = Math.sin(t * Math.PI * pleats * 2) * 0.05 * (0.3 + s);
      pos.push(a[0] + (b[0] - a[0]) * t + side.x * fold, a[1] + (b[1] - a[1]) * t - drop, a[2] + (b[2] - a[2]) * t + side.z * fold);
      uv.push((t * len) / 0.6, s * 2);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < rows; j++) {
      const p = i * (rows + 1) + j;
      idx.push(p, p + rows + 1, p + 1, p + 1, p + rows + 1, p + rows + 2);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Straight curtain panel with vertical pleats, gathered slightly at the top. */
export function curtainGeometry(width: number, height: number, pleats = 8, gather = 0.75) {
  const g = new THREE.PlaneGeometry(width, height, pleats * 6, 10);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const v = (y + height / 2) / height;
    const k = gather + (1 - gather) * (1 - v);
    pos.setX(i, x * k);
    pos.setZ(i, Math.sin((x / width + 0.5) * Math.PI * 2 * pleats) * 0.06 * (0.6 + 0.4 * (1 - v)));
    uv.setXY(i, (x + width / 2) / 0.6, y / 0.6);
  }
  g.computeVertexNormals();
  return g;
}

/** Floor-length round tablecloth with soft folds. */
export function tableclothGeometry(radius: number, height: number) {
  const prof: [number, number][] = [[0, height + 0.005], [radius * 0.98, height + 0.005], [radius + 0.02, height - 0.02], [radius + 0.06, height * 0.6], [radius + 0.1, 0.01]];
  const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 96);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < radius * 0.99) continue;
    const a = Math.atan2(z, x);
    const fall = 1 - y / height;
    const k = 1 + Math.sin(a * 22) * 0.025 * fall + Math.sin(a * 9 + 1) * 0.015 * fall;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return planarUV(g, 0.5);
}

/** Gold Chiavari chair, the classic Sri Lankan wedding chair (merged). */
export function chiavariGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const rod = (x: number, y0: number, y1: number, z: number, r = 0.014, tiltX = 0) => {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, 8);
    g.translate(0, (y1 - y0) / 2, 0);
    g.rotateX(tiltX);
    g.translate(x, y0, z);
    parts.push(g);
  };
  const w = 0.2, d = 0.2;
  // legs
  rod(-w, 0, 0.46, -d);
  rod(w, 0, 0.46, -d);
  rod(-w, 0, 0.92, d, 0.015, -0.06);
  rod(w, 0, 0.92, d, 0.015, -0.06);
  // back spindles
  for (let i = 0; i < 4; i++) rod(-w * 0.75 + i * w * 0.5, 0.5, 0.88, d + 0.02, 0.008, -0.06);
  // rails
  const rail = (y: number, z: number, horiz = true) => {
    const g = new THREE.CylinderGeometry(0.011, 0.011, w * 2, 8);
    g.rotateZ(Math.PI / 2);
    g.translate(0, y, z);
    if (horiz) parts.push(g);
  };
  rail(0.47, -d);
  rail(0.47, d);
  rail(0.68, d + 0.015);
  rail(0.88, d + 0.03);
  rail(0.15, -d);
  rail(0.15, d);
  const side = (x: number) => {
    const g = new THREE.CylinderGeometry(0.011, 0.011, d * 2, 8);
    g.rotateX(Math.PI / 2);
    g.translate(x, 0.47, 0);
    parts.push(g);
  };
  side(-w);
  side(w);
  return merge(parts);
}

/** A cupped card for flowers and leaves (slightly bowl-shaped quad). */
export function cardGeometry(cup = 0.18) {
  const g = new THREE.PlaneGeometry(1, 1, 2, 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, -cup * (1 - (x * x + y * y) * 2));
  }
  g.computeVertexNormals();
  return g;
}

/** Two crossed quads standing on y = 0 (grass tufts, coconut-flower sprays). */
export function crossCardGeometry() {
  const a = new THREE.PlaneGeometry(1, 1);
  a.translate(0, 0.5, 0);
  const b = a.clone().rotateY(Math.PI / 2);
  return merge([a, b]);
}

/** A curved, gently folded ribbon (palm fronds, banana leaves). UV u along length. */
export function ribbonGeometry(length: number, width: number, droop: number, lift: number, fold = 0.12, segs = 16) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * length;
    const y = Math.sin(t * Math.PI * 0.5) * lift - droop * t * t;
    for (let j = 0; j <= 2; j++) {
      const s = j / 2 - 0.5;
      pos.push(x, y - Math.abs(s) * fold * width * (1 - t * 0.5), s * width);
      uv.push(t, j / 2);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < 2; j++) {
      const p = i * 3 + j;
      idx.push(p, p + 3, p + 1, p + 1, p + 3, p + 4);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Hipped roof with real slopes; long axis along x when w > d. */
export function hipRoofGeometry(w: number, d: number, h: number) {
  const r = Math.max(0, (w - d) / 2);
  const hw = w / 2, hd = d / 2;
  const v = [-hw, 0, hd, hw, 0, hd, hw, 0, -hd, -hw, 0, -hd, -r, h, 0, r, h, 0];
  const idx = [0, 1, 5, 0, 5, 4, 2, 3, 4, 2, 4, 5, 1, 2, 5, 3, 0, 4];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  return planarUV(g, 2.4);
}

/** Truncated hip (the lower tier of a Kandyan roof). */
export function truncatedHipGeometry(w: number, d: number, h: number, inset: number) {
  const hw = w / 2, hd = d / 2, iw = hw - inset, id = hd - inset;
  const v = [-hw, 0, hd, hw, 0, hd, hw, 0, -hd, -hw, 0, -hd, -iw, h, id, iw, h, id, iw, h, -id, -iw, h, -id];
  const idx = [0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  return planarUV(g, 2.4);
}

/** Points along a hanging curve between a and b. */
export function catenary(a: V3, b: V3, sag: number, n: number): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
  }
  return out;
}

/** Real lotus bloom built from curved, textured petals. */
export function lotusGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const petal = (len: number, wid: number) => {
    const g = new THREE.PlaneGeometry(wid, len, 4, 8);
    g.translate(0, len / 2, 0);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) / len;
      const taper = Math.sin(Math.PI * Math.min(1, y * 0.95 + 0.05)) ** 0.7;
      pos.setX(i, x * taper);
      pos.setZ(i, (x / wid) ** 2 * wid * 0.9 - y * y * len * 0.25);
    }
    g.computeVertexNormals();
    return g;
  };
  const rings = [
    { n: 9, len: 0.3, wid: 0.15, tilt: 1.15 },
    { n: 8, len: 0.27, wid: 0.13, tilt: 0.75, off: 0.35 },
    { n: 6, len: 0.2, wid: 0.11, tilt: 0.35, off: 0.15 },
  ];
  for (const r of rings) {
    for (let i = 0; i < r.n; i++) {
      const g = petal(r.len, r.wid);
      g.rotateX(-(Math.PI / 2 - r.tilt));
      g.rotateY((i / r.n) * Math.PI * 2 + (r.off ?? 0));
      parts.push(g);
    }
  }
  const pod = new THREE.CylinderGeometry(0.05, 0.035, 0.05, 16);
  pod.translate(0, 0.04, 0);
  parts.push(pod);
  return merge(parts);
}

/** Ground/wall plane with UVs tiled every `tile` metres. */
export function tiledPlane(w: number, h: number, tile: number, segX = 1, segY = 1) {
  const g = new THREE.PlaneGeometry(w, h, segX, segY);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
  return g;
}
