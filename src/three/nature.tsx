import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOWER_KINDS, type FlowerKind, type VenueMaterials } from './materials';
import { useQuality } from './quality';
import { cardGeometry, crossCardGeometry, merge, ribbonGeometry, rng, type V3 } from './geo';

// Plants, flowers, flames and lights for the realistic venue.

export interface InstItem {
  p: V3;
  s?: number | V3;
  r?: V3;
  q?: THREE.Quaternion;
  c?: THREE.ColorRepresentation;
}
export interface FlowerItem extends InstItem {
  k: FlowerKind;
}

const _o = new THREE.Object3D();
const _c = new THREE.Color();
const Z = new THREE.Vector3(0, 0, 1);

export function Inst({ geometry, material, items, cast = false, receive = false }: { geometry: THREE.BufferGeometry; material: THREE.Material; items: InstItem[]; cast?: boolean; receive?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    items.forEach((it, i) => {
      _o.position.set(...it.p);
      const s = it.s ?? 1;
      if (typeof s === 'number') _o.scale.setScalar(s);
      else _o.scale.set(...s);
      if (it.q) _o.quaternion.copy(it.q);
      else _o.rotation.set(...(it.r ?? [0, 0, 0]));
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
      if (it.c !== undefined) m.setColorAt(i, _c.set(it.c));
    });
    m.count = items.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={cast} receiveShadow={receive} />;
}

const CARD = cardGeometry(0.16);
const LEAF_CARD = cardGeometry(0.1);
const CROSS = crossCardGeometry();

/** Card orientation facing `dir` with a random roll. */
export function facing(dir: THREE.Vector3, roll: number) {
  const q = new THREE.Quaternion().setFromUnitVectors(Z, dir.clone().normalize());
  return q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, roll));
}

/** All flowers of an area, drawn with one instanced mesh per flower kind. */
export function Flowers({ items, mats }: { items: FlowerItem[]; mats: VenueMaterials }) {
  const { density } = useQuality();
  const groups = useMemo(() => {
    const g = new Map<FlowerKind, InstItem[]>();
    const keep = Math.max(0.35, density);
    items.forEach((it, i) => {
      if (keep < 1 && ((i * 2654435761) % 1000) / 1000 > keep && it.k !== 'roseBlush') return;
      if (!g.has(it.k)) g.set(it.k, []);
      g.get(it.k)!.push(it);
    });
    return g;
  }, [items, density]);
  return (
    <>
      {FLOWER_KINDS.map((k) => (groups.get(k) ? <Inst key={k} geometry={CARD} material={mats.flowers[k]} items={groups.get(k)!} /> : null))}
    </>
  );
}

export function LeafCards({ items, mats, kind = 'leaves' }: { items: InstItem[]; mats: VenueMaterials; kind?: 'leaves' | 'araliya' }) {
  return <Inst geometry={LEAF_CARD} material={mats[kind]} items={items} />;
}

// ─── flower arrangement generators ──────────────────────────────────────────
type Mix = Partial<Record<FlowerKind, number>>;
const WEDDING_MIX: Mix = { jasmine: 4, roseWhite: 3, roseBlush: 2, gypsophila: 2, frangipani: 1 };

function pick(r: () => number, mix: Mix): FlowerKind {
  const entries = Object.entries(mix) as [FlowerKind, number][];
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [k, w] of entries) {
    x -= w;
    if (x <= 0) return k;
  }
  return entries[0][0];
}

const SIZE: Record<FlowerKind, number> = { jasmine: 0.07, buds: 0.08, frangipani: 0.1, roseBlush: 0.11, roseWhite: 0.11, marigold: 0.1, gypsophila: 0.12, fern: 0.22 };

/** Dome-shaped arrangement: flowers face outwards, leaves tucked underneath. */
export function bouquet(center: V3, radius: number, count: number, seed: number, mix: Mix = WEDDING_MIX, flat = 0.8, scale = 1) {
  const r = rng(seed);
  const flowers: FlowerItem[] = [];
  const leaves: InstItem[] = [];
  const dir = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const u = r() * Math.PI * 2;
    const v = Math.acos(1 - r() * 1.15);
    dir.set(Math.sin(v) * Math.cos(u), Math.cos(v) * flat, Math.sin(v) * Math.sin(u)).normalize();
    const k = pick(r, mix);
    const rr = radius * (0.88 + r() * 0.16);
    flowers.push({ k, p: [center[0] + dir.x * rr, center[1] + dir.y * rr, center[2] + dir.z * rr], s: SIZE[k] * scale * (0.85 + r() * 0.35), q: facing(dir, r() * 6.28) });
  }
  for (let i = 0; i < count / 6; i++) {
    const u = r() * Math.PI * 2;
    dir.set(Math.cos(u), -0.1 + r() * 0.3, Math.sin(u));
    leaves.push({ p: [center[0] + dir.x * radius * 0.95, center[1] + dir.y * radius * 0.5, center[2] + dir.z * radius * 0.95], s: radius * 0.9, q: facing(dir.clone().add(new THREE.Vector3(0, 0.6, 0)), r() * 6.28) });
  }
  return { flowers, leaves };
}

/** Jasmine strand along points (a classic Sinhala decoration), with accents. */
export function jasmineStrand(points: V3[], seed: number, accent: FlowerKind | null = 'roseBlush', thickness = 0.035) {
  const r = rng(seed);
  const out: FlowerItem[] = [];
  const dir = new THREE.Vector3();
  points.forEach((p, i) => {
    for (let k = 0; k < 2; k++) {
      dir.set(r() - 0.5, r() - 0.3, r() - 0.5).normalize();
      const kind: FlowerKind = accent && i % 9 === 0 && k === 0 ? accent : r() < 0.55 ? 'buds' : 'jasmine';
      out.push({ k: kind, p: [p[0] + dir.x * thickness, p[1] + dir.y * thickness, p[2] + dir.z * thickness], s: SIZE[kind] * (kind === 'buds' ? 0.8 : 0.85), q: facing(dir, r() * 6.28) });
    }
  });
  return out;
}

// ─── plants ─────────────────────────────────────────────────────────────────
/** Coconut palm: ringed bark trunk, textured fronds, coconuts. */
export function Palm({ position, height = 8, lean = 0.6, rotation = 0, seed = 1, mats }: { position: V3; height?: number; lean?: number; rotation?: number; seed?: number; mats: VenueMaterials }) {
  const g = useMemo(() => {
    const r = rng(seed);
    const parts: THREE.BufferGeometry[] = [];
    const segs = 10;
    let top = new THREE.Vector3();
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const h = height / segs;
      const rad = 0.19 - t0 * 0.06;
      const c = new THREE.CylinderGeometry(rad * 0.94, rad, h * 1.03, 12, 1, true);
      const uv = c.attributes.uv as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) uv.setY(k, (uv.getY(k) + i) * (h / 0.9));
      const x = Math.sin(t0 * 1.3) * lean;
      c.rotateZ(-Math.cos(t0 * 1.3) * lean * 0.16);
      c.translate(x, h * (i + 0.5), 0);
      parts.push(c);
      top = new THREE.Vector3(x, h * (i + 1), 0);
    }
    const trunk = merge(parts);
    const fronds: THREE.BufferGeometry[] = [];
    const n = 15;
    for (let i = 0; i < n; i++) {
      const outer = i < 10;
      const f = ribbonGeometry(outer ? 3.3 + r() * 0.6 : 2.4, 1.15, outer ? 1.5 + r() * 0.6 : 0.4, outer ? 0.7 : 1.4, 0.22);
      f.rotateZ(outer ? 0.1 + r() * 0.15 : 0.7 + r() * 0.3);
      f.rotateY((i / n) * Math.PI * 2 * (outer ? 1 : 0.7) + r() * 0.4);
      f.translate(top.x, top.y - 0.08, top.z);
      fronds.push(f);
    }
    const nuts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 6; k++) {
      const s = new THREE.SphereGeometry(0.14, 10, 8);
      s.scale(1, 1.15, 1);
      s.translate(top.x + Math.cos(k * 1.1) * 0.2, top.y - 0.3 - (k % 2) * 0.12, Math.sin(k * 1.1) * 0.2);
      nuts.push(s);
    }
    return { trunk, fronds: merge(fronds), nuts: merge(nuts) };
  }, [height, lean, seed]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh geometry={g.trunk} material={mats.bark} castShadow receiveShadow />
      <mesh geometry={g.fronds} material={mats.frond} castShadow />
      <mesh geometry={g.nuts} material={mats.teak} castShadow />
    </group>
  );
}

export function Banana({ position, rotation = 0, scale = 1, seed = 5, mats }: { position: V3; rotation?: number; scale?: number; seed?: number; mats: VenueMaterials }) {
  const g = useMemo(() => {
    const r = rng(seed);
    const leaves: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const f = ribbonGeometry(2.0 + r() * 0.6, 0.62, 0.7 + r() * 0.5, 1.2, 0.08, 14);
      f.rotateZ(0.55 + r() * 0.5);
      f.rotateY((i / 7) * Math.PI * 2 + r());
      f.translate(0, 1.1 + r() * 0.3, 0);
      leaves.push(f);
    }
    const stem = new THREE.CylinderGeometry(0.09, 0.15, 1.3, 12);
    stem.translate(0, 0.65, 0);
    return { leaves: merge(leaves), stem };
  }, [seed]);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh geometry={g.stem} material={mats.hedgeCore} castShadow />
      <mesh geometry={g.leaves} material={mats.banana} castShadow />
    </group>
  );
}

/** Frangipani (araliya) tree: forked branches, leaf whorls and blossoms. */
export function araliyaTree(position: V3, scale: number, seed: number) {
  const r = rng(seed);
  const wood: THREE.BufferGeometry[] = [];
  const leaves: InstItem[] = [];
  const flowers: FlowerItem[] = [];
  const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const to = from.clone().addScaledVector(dir, len);
    const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, len * 0.12, 0)), to);
    wood.push(new THREE.TubeGeometry(curve, 6, rad, 7));
    if (depth === 0) {
      const up = new THREE.Vector3(0, 1, 0).add(new THREE.Vector3(r() - 0.5, 0, r() - 0.5).multiplyScalar(0.5));
      leaves.push({ p: [to.x, to.y + 0.05, to.z], s: 1.0 * scale, q: facing(up, r() * 6.28) });
      for (let k = 0; k < 7; k++) {
        const d = new THREE.Vector3(r() - 0.5, 0.9, r() - 0.5).normalize();
        flowers.push({ k: 'frangipani', p: [to.x + d.x * 0.16, to.y + 0.12 + r() * 0.08, to.z + d.z * 0.16], s: SIZE.frangipani * 1.1, q: facing(d, r() * 6.28) });
      }
      return;
    }
    const n = 2 + (r() > 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const nd = dir.clone().add(new THREE.Vector3(r() - 0.5, 0.25, r() - 0.5).multiplyScalar(1.3)).normalize();
      grow(to, nd, len * 0.72, rad * 0.7, depth - 1);
    }
  };
  grow(new THREE.Vector3(...position), new THREE.Vector3(0, 1, 0), 1.3 * scale, 0.11 * scale, 3);
  return { wood: merge(wood), leaves, flowers };
}

/** Sculpted hedge: dark core covered with leaf cards. */
export function hedgeItems(center: V3, size: V3, seed: number, density = 22) {
  const r = rng(seed);
  const out: InstItem[] = [];
  const area = 2 * (size[0] * size[1] + size[2] * size[1] + size[0] * size[2]);
  const n = Math.round(area * density);
  const d = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const face = r();
    const u = r() - 0.5, v = r() - 0.5;
    let p: V3;
    if (face < 0.4) {
      d.set(0, 1, 0);
      p = [u * size[0], size[1] / 2, v * size[2]];
    } else if (face < 0.7) {
      const s = r() > 0.5 ? 1 : -1;
      d.set(s, 0, 0);
      p = [(s * size[0]) / 2, v * size[1], u * size[2]];
    } else {
      const s = r() > 0.5 ? 1 : -1;
      d.set(0, 0, s);
      p = [u * size[0], v * size[1], (s * size[2]) / 2];
    }
    d.add(new THREE.Vector3(r() - 0.5, r() - 0.3, r() - 0.5).multiplyScalar(0.9)).normalize();
    out.push({ p: [center[0] + p[0], center[1] + p[1], center[2] + p[2]], s: 0.42 + r() * 0.2, q: facing(d, r() * 6.28) });
  }
  return out;
}

export function Tufts({ items, mats }: { items: InstItem[]; mats: VenueMaterials }) {
  const { density } = useQuality();
  const kept = useMemo(() => (density >= 1 ? items : items.filter((_, i) => (i % 100) / 100 < density)), [items, density]);
  return <Inst geometry={CROSS} material={mats.tuft} items={kept} />;
}

/** A ring of distant forest at the edge of the world. */
export function Treeline({ center, radius, height, arc, start, mats, repeat = 6 }: { center: V3; radius: number; height: number; arc: number; start: number; mats: VenueMaterials; repeat?: number }) {
  const mat = useMemo(() => {
    const m = mats.treeline.clone();
    const t = m.map!.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(repeat, 1);
    t.needsUpdate = true;
    m.map = t;
    return m;
  }, [mats, repeat]);
  return (
    <mesh position={[center[0], center[1] + height / 2 - 0.5, center[2]]}>
      <cylinderGeometry args={[radius, radius, height, 64, 1, true, start, arc]} />
      <primitive object={mat} attach="material" side={THREE.BackSide} />
    </mesh>
  );
}

// ─── flames & small lights ─────────────────────────────────────────────────
const flameVert = /* glsl */ `
attribute float aSeed;
varying vec2 vUv;
varying float vSeed;
uniform float uTime;
void main() {
  vUv = uv;
  vSeed = aSeed;
  vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float sc = length(instanceMatrix[0].xyz);
  float flick = 1.0 + 0.07 * sin(uTime * 11.0 + aSeed * 7.0) + 0.05 * sin(uTime * 17.3 + aSeed * 3.0);
  vec2 off = vec2(position.x, position.y * flick);
  off.x += sin(uTime * 3.1 + aSeed * 5.0) * 0.06 * position.y * position.y;
  c.xy += off * sc;
  gl_Position = projectionMatrix * c;
}`;
const flameFrag = /* glsl */ `
varying vec2 vUv;
varying float vSeed;
uniform float uBoost;
void main() {
  float y = vUv.y;
  float x = (vUv.x - 0.5) * 2.0;
  float w = 0.62 * pow(max(0.0, 1.0 - y), 0.85) * smoothstep(0.0, 0.2, y);
  float body = 1.0 - smoothstep(w * 0.55, w, abs(x));
  float core = 1.0 - smoothstep(0.0, w * 0.5, abs(x));
  core *= 1.0 - smoothstep(0.15, 0.6, y);
  vec3 col = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.82, 0.45), y < 0.5 ? 0.6 : 1.0 - y);
  col = mix(col, vec3(1.0, 0.97, 0.88), core);
  float blue = (1.0 - smoothstep(0.0, 0.12, y)) * body * 0.6;
  col = mix(col, vec3(0.35, 0.45, 1.0), blue);
  float a = body * (1.0 - smoothstep(0.75, 1.0, y));
  gl_FragColor = vec4(col * uBoost * a, a);
}`;

const FLAME_GEO = (() => {
  const g = new THREE.PlaneGeometry(0.5, 1, 1, 6);
  g.translate(0, 0.5, 0);
  return g;
})();

/** Instanced, camera-facing flames with gentle flicker (no particles). */
export function Flames({ points, size = 0.05 }: { points: V3[]; size?: number }) {
  const { post } = useQuality();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: flameVert,
        fragmentShader: flameFrag,
        uniforms: { uTime: { value: 0 }, uBoost: { value: post ? 4.5 : 1.4 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [post],
  );
  const geo = useMemo(() => {
    const g = FLAME_GEO.clone();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(points.map((_, i) => i * 1.37)), 1));
    return g;
  }, [points]);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
  });
  return <Inst geometry={geo} material={mat} items={points.map((p) => ({ p, s: size }))} />;
}

/** Tiny bright bulbs (fairy lights) that bloom in post-processing. */
export function Bulbs({ points, mats, size = 0.025 }: { points: V3[]; mats: VenueMaterials; size?: number }) {
  return <Inst geometry={BULB} material={mats.fairy} items={points.map((p) => ({ p, s: size }))} />;
}
const BULB = new THREE.SphereGeometry(1, 8, 6);

// Soft glow sprites, used only when post-processing bloom is off.
let glowTex: THREE.Texture | null = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,236,200,0.5)');
  grd.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

export function Glow({ position, size = 1, opacity = 0.6, color = '#ffdca8' }: { position: V3; size?: number; opacity?: number; color?: string }) {
  const { post } = useQuality();
  if (post) return null;
  return (
    <sprite position={position} scale={[size, size, size]}>
      <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  );
}

export function Fireflies({ count = 40, area }: { count?: number; area: [V3, V3] }) {
  const { post } = useQuality();
  const base = useMemo(() => {
    const r = rng(55);
    return Array.from({ length: count }, () => [
      area[0][0] + r() * (area[1][0] - area[0][0]),
      area[0][1] + r() * (area[1][1] - area[0][1]),
      area[0][2] + r() * (area[1][2] - area[0][2]),
      r() * 10,
    ]);
  }, [count, area]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.25;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    base.forEach(([x, y, z, o], i) => pos.setXYZ(i, x + Math.sin(t + o) * 0.6, y + Math.sin(t * 1.3 + o * 2) * 0.25, z + Math.cos(t * 0.8 + o) * 0.6));
    pos.needsUpdate = true;
  });
  return (
    <points geometry={geo}>
      <pointsMaterial map={glowTexture()} color={new THREE.Color('#fff0b0').multiplyScalar(post ? 3 : 1)} size={0.12} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}
