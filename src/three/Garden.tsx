import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VenueMaterials } from './materials';
import { box, catenary, columnGeometry, crossCardGeometry, hipRoofGeometry, lathe, merge, rng, tiledPlane, truncatedHipGeometry, type V3 } from './geo';
import {
  Banana, Flowers, Glow, Inst, LeafCards, Palm, Tufts, Treeline, araliyaTree, bouquet, facing, hedgeItems, jasmineStrand,
  type FlowerItem, type InstItem,
} from './nature';

// Scene 2: the entrance garden and the pavilion facade with its carved doors.

/** Two-tier Kandyan roof in Sinhala clay tiles. Long axis along z. */
export function KandyanRoof({ position, w, d, mats, tier = 1 }: { position: V3; w: number; d: number; mats: VenueMaterials; tier?: number }) {
  const g = useMemo(() => {
    const h1 = 1.9 * tier;
    const inset = 2.4 * tier;
    const lower = truncatedHipGeometry(w, d, h1, inset);
    const bw = w - inset * 2, bd = d - inset * 2;
    const band = box(bw, 0.7 * tier, bd, 1.2, [0, h1 + 0.35 * tier, 0]);
    const upperRaw = hipRoofGeometry(bd + 1.3, bw + 1.3, 2.7 * tier);
    upperRaw.rotateY(Math.PI / 2);
    upperRaw.translate(0, h1 + 0.7 * tier, 0);
    // ridge caps along the upper ridge and hips
    const ridgeLen = Math.max(0.1, bd + 1.3 - (bw + 1.3));
    const ridge = new THREE.CylinderGeometry(0.11, 0.11, ridgeLen, 10);
    ridge.rotateX(Math.PI / 2);
    ridge.translate(0, h1 + 0.7 * tier + 2.7 * tier + 0.04, 0);
    const fascia = box(w + 0.1, 0.22, d + 0.1, 1, [0, -0.08, 0]);
    return { lower, band, upper: upperRaw, ridge, fascia, top: h1 + 0.7 * tier + 2.7 * tier, ridgeLen };
  }, [w, d, tier]);
  return (
    <group position={position}>
      <mesh geometry={g.lower} material={mats.roof} castShadow receiveShadow />
      <mesh geometry={g.band} material={mats.plaster} castShadow />
      <mesh geometry={g.upper} material={mats.roof} castShadow receiveShadow />
      <mesh geometry={g.ridge} material={mats.clay} castShadow />
      <mesh geometry={g.fascia} material={mats.teak} />
      {[-1, 1].map((s) => (
        <group key={s} position={[0, g.top + 0.05, (s * g.ridgeLen) / 2]}>
          <mesh material={mats.gold} castShadow>
            <cylinderGeometry args={[0.03, 0.09, 0.5, 12]} />
          </mesh>
          <mesh material={mats.gold} position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.09, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Brass pot of plenty with a coconut-flower spray and mango leaves. */
export function PunKalasa({ position, scale = 1, mats }: { position: V3; scale?: number; mats: VenueMaterials }) {
  const g = useMemo(() => {
    const pot = lathe([[0, 0], [0.18, 0], [0.22, 0.03], [0.32, 0.18], [0.37, 0.32], [0.33, 0.47], [0.2, 0.58], [0.15, 0.63], [0.17, 0.66], [0.24, 0.7], [0.22, 0.73], [0.14, 0.72]], 40);
    const spray = crossCardGeometry();
    const sprays = [0, 1, 2].map((i) => spray.clone().scale(1.15, 1.25, 1.15).rotateY((i * Math.PI) / 3).translate(0, 0.66, 0));
    return { pot, spray: merge(sprays) };
  }, []);
  const leaves = useMemo<InstItem[]>(() => {
    const r = rng(17);
    return Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const d = new THREE.Vector3(Math.cos(a), 0.4, Math.sin(a));
      return { p: [Math.cos(a) * 0.22, 0.72, Math.sin(a) * 0.22], s: 0.36, q: facing(d, r() * 6) };
    });
  }, []);
  return (
    <group position={position} scale={scale}>
      <mesh geometry={g.pot} material={mats.brass} castShadow receiveShadow />
      <mesh geometry={g.spray} material={mats.polmal} castShadow />
      <LeafCards items={leaves} mats={mats} />
    </group>
  );
}

function Doors({ mats }: { mats: VenueMaterials }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const g = useMemo(() => ({
    leaf: box(1.7, 4.4, 0.12, 1.2),
    panel: new THREE.BoxGeometry(1.3, 1.65, 0.03),
    stud: new THREE.SphereGeometry(0.025, 10, 8),
    ring: new THREE.TorusGeometry(0.09, 0.014, 10, 32),
    boss: new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20).rotateX(Math.PI / 2),
  }), []);
  const studs = useMemo<InstItem[]>(() => {
    const out: InstItem[] = [];
    for (let i = 0; i < 7; i++) for (let j = 0; j < 2; j++) out.push({ p: [0.12 + j * 1.46, 0.35 + i * 0.62, 0.075] });
    return out;
  }, []);

  useFrame(({ camera }) => {
    // Opening follows the camera's distance to the doorway, so it tracks the
    // scroll exactly and closes again when scrolling back.
    const t = THREE.MathUtils.clamp((9 - camera.position.z) / (9 - 3.6), 0, 1);
    const open = t * t * (3 - 2 * t);
    if (left.current) left.current.rotation.y = open * 1.42;
    if (right.current) right.current.rotation.y = -open * 1.42;
    if (light.current) light.current.intensity = 4 + open * 26;
  });

  const leaf = (
    <>
      <mesh geometry={g.leaf} material={mats.teak} position={[0.85, 2.2, 0]} castShadow receiveShadow />
      {[3.2, 1.25].map((y) => (
        <mesh key={y} geometry={g.panel} material={mats.teakCarved} position={[0.85, y, 0.07]} />
      ))}
      <mesh geometry={g.boss} material={mats.brass} position={[1.55, 2.15, 0.08]} />
      <mesh geometry={g.ring} material={mats.brass} position={[1.55, 2.05, 0.1]} />
      <Inst geometry={g.stud} material={mats.brass} items={studs} />
    </>
  );
  return (
    <group position={[0, 0.45, 0.05]}>
      <group ref={left} position={[-1.7, 0, 0]}>{leaf}</group>
      <group ref={right} position={[1.7, 0, 0]}>
        <group scale={[-1, 1, 1]}>{leaf}</group>
      </group>
      <pointLight ref={light} position={[0, 3.0, -2.5]} color="#ffd29a" intensity={4} distance={16} decay={1.6} />
    </group>
  );
}

function Facade({ mats }: { mats: VenueMaterials }) {
  const g = useMemo(() => {
    const col = columnGeometry(4.6, 0.26, 20);
    return {
      plinth: box(19.2, 0.45, 4.8, 1.5, [0, 0.225, 2.0]),
      floor: tiledPlane(18.8, 4.4, 1.2),
      steps: [0, 1, 2].map((i) => box(5.6 + (2 - i) * 0.4, 0.15, 0.42, 1.2)),
      wallL: box(7.3, 6.2, 0.6, 1.5, [-5.35, 3.55, 0]),
      wallR: box(7.3, 6.2, 0.6, 1.5, [5.35, 3.55, 0]),
      lintel: box(3.4, 1.8, 0.6, 1.5, [0, 5.75, 0]),
      surroundV: box(0.26, 4.6, 0.14, 1),
      surroundH: box(4.0, 0.3, 0.16, 1),
      cornice: box(19.4, 0.18, 0.7, 1, [0, 6.55, 0.1]),
      skirting: box(19.0, 0.3, 0.68, 1, [0, 0.6, 0.02]),
      col,
      beam: box(19.2, 0.55, 0.55, 1.2, [0, 5.35, 3.55]),
      beamTrim: box(19.3, 0.08, 0.6, 1, [0, 5.05, 3.55]),
      winFrame: box(1.25, 2.1, 0.12, 1),
      winGlass: new THREE.PlaneGeometry(1.05, 1.9),
      mullion: box(0.05, 1.9, 0.05, 1),
      sill: box(1.45, 0.08, 0.26, 1),
    };
  }, []);

  const garlands = useMemo(() => {
    const out: FlowerItem[] = [];
    for (let i = 0; i < 6; i++) {
      const x0 = -8.4 + i * 2.8;
      out.push(...jasmineStrand(catenary([x0, 5.05, 3.85], [x0 + 2.8, 5.05, 3.85], 0.55, 60), 10 + i));
    }
    out.push(...jasmineStrand(catenary([-1.95, 4.95, 0.42], [1.95, 4.95, 0.42], 0.42, 70), 40));
    for (const x of [-2.2, -2.02, 2.02, 2.2]) {
      const pts: V3[] = [];
      for (let k = 0; k < 40; k++) pts.push([x, 4.9 - k * 0.09, 0.42]);
      out.push(...jasmineStrand(pts, 70 + Math.round(x * 10), null, 0.025));
    }
    return out;
  }, []);

  return (
    <group>
      <mesh geometry={g.plinth} material={mats.stone} castShadow receiveShadow />
      <mesh geometry={g.floor} material={mats.marble} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.452, 2.0]} receiveShadow />
      {g.steps.map((s, i) => (
        <mesh key={i} geometry={s} material={mats.marbleTrim} position={[0, 0.075 + i * 0.15, 4.62 + (2 - i) * 0.4]} castShadow receiveShadow />
      ))}
      <mesh geometry={g.wallL} material={mats.plaster} castShadow receiveShadow />
      <mesh geometry={g.wallR} material={mats.plaster} castShadow receiveShadow />
      <mesh geometry={g.lintel} material={mats.plaster} castShadow receiveShadow />
      <mesh geometry={g.cornice} material={mats.marbleTrim} castShadow />
      <mesh geometry={g.skirting} material={mats.stone} />
      {/* carved door surround */}
      <mesh geometry={g.surroundV} material={mats.teakCarved} position={[-1.83, 2.75, 0.33]} castShadow />
      <mesh geometry={g.surroundV} material={mats.teakCarved} position={[1.83, 2.75, 0.33]} castShadow />
      <mesh geometry={g.surroundH} material={mats.teakCarved} position={[0, 5.05, 0.33]} castShadow />
      <mesh geometry={g.surroundH} material={mats.gold} position={[0, 5.24, 0.36]} scale={[1, 0.25, 0.4]} />
      {/* windows with warm light behind them */}
      {[-6.2, -3.9, 3.9, 6.2].map((x) => (
        <group key={x} position={[x, 2.95, 0.31]}>
          <mesh geometry={g.winGlass} material={mats.windowGlow} position={[0, 0, -0.02]} />
          <mesh geometry={g.winFrame} material={mats.teak} position={[0, 0, -0.05]} scale={[1, 1, 0.5]} />
          <mesh geometry={g.mullion} material={mats.teak} position={[0, 0, 0.02]} />
          <mesh geometry={g.mullion} material={mats.teak} position={[0, 0.3, 0.02]} rotation={[0, 0, Math.PI / 2]} scale={[1, 0.56, 1]} />
          <mesh geometry={g.sill} material={mats.marbleTrim} position={[0, -1.02, 0.1]} castShadow />
          <mesh geometry={g.sill} material={mats.marbleTrim} position={[0, 1.08, 0.08]} scale={[1, 1.4, 0.7]} />
        </group>
      ))}
      {/* verandah */}
      {[-8.2, -4.6, 4.6, 8.2].map((x) => (
        <group key={x} position={[x, 0.45, 3.55]}>
          <mesh geometry={g.col.shaft} material={mats.plaster} castShadow receiveShadow />
          <mesh geometry={g.col.base} material={mats.marbleTrim} castShadow />
          <mesh geometry={g.col.cap} material={mats.plaster} castShadow />
          <mesh material={mats.goldSatin} position={[0, 4.18, 0]}>
            <torusGeometry args={[0.27, 0.025, 8, 40]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={g.beam} material={mats.plaster} castShadow receiveShadow />
      <mesh geometry={g.beamTrim} material={mats.goldSatin} />
      <PunKalasa position={[-2.7, 0.46, 1.5]} scale={1.15} mats={mats} />
      <PunKalasa position={[2.7, 0.46, 1.5]} scale={1.15} mats={mats} />
      {/* hanging brass lanterns */}
      {[-6.4, -2.8, 2.8, 6.4].map((x) => (
        <group key={x} position={[x, 4.25, 2.6]}>
          <mesh material={mats.brass} position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.9, 6]} />
          </mesh>
          <mesh material={mats.brass} position={[0, 0.2, 0]} castShadow>
            <coneGeometry args={[0.2, 0.16, 8]} />
          </mesh>
          <mesh material={mats.glass}>
            <cylinderGeometry args={[0.13, 0.13, 0.3, 8, 1, true]} />
          </mesh>
          <mesh material={mats.bulb} scale={0.06}>
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
          <mesh material={mats.brass} position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.15, 0.1, 0.04, 8]} />
          </mesh>
          <Glow position={[0, 0, 0]} size={1.2} />
        </group>
      ))}
      <Doors mats={mats} />
      <Flowers items={garlands} mats={mats} />
      <KandyanRoof position={[0, 6.66, -14.4]} w={19.6} d={38} mats={mats} />
    </group>
  );
}

function arch(z: number, seed: number) {
  const r = rng(seed);
  const flowers: FlowerItem[] = [];
  const leaves: InstItem[] = [];
  const R = 2.3;
  const dir = new THREE.Vector3();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI;
    const cx = Math.cos(a) * R, cy = Math.sin(a) * R + 1.5;
    for (let k = 0; k < 4; k++) {
      dir.set(Math.cos(a) + (r() - 0.5) * 0.8, Math.sin(a) + (r() - 0.5) * 0.8, (r() - 0.5) * 2.2).normalize();
      const roll = r();
      const kind = roll < 0.35 ? 'jasmine' : roll < 0.6 ? 'roseWhite' : roll < 0.8 ? 'roseBlush' : roll < 0.9 ? 'gypsophila' : 'frangipani';
      const d = 0.12 + r() * 0.08;
      flowers.push({ k: kind, p: [cx + dir.x * d, cy + dir.y * d, z + dir.z * d], s: (kind === 'gypsophila' ? 0.14 : 0.11) * (0.85 + r() * 0.4), q: facing(dir, r() * 6.28) });
    }
    if (i % 2 === 0) {
      dir.set(Math.cos(a) * 0.6 + (r() - 0.5), Math.sin(a) * 0.6 + (r() - 0.5), (r() - 0.5) * 2).normalize();
      leaves.push({ p: [cx + dir.x * 0.15, cy + dir.y * 0.15, z + dir.z * 0.15], s: 0.42, q: facing(dir, r() * 6.28) });
    }
  }
  for (const x of [-R, R]) {
    const b = bouquet([x, 0.55, z], 0.6, 140, seed + Math.round(x * 3));
    flowers.push(...b.flowers);
    leaves.push(...b.leaves, ...hedgeItems([x, 0.35, z], [0.9, 0.6, 0.9], seed + 5, 30));
  }
  return { flowers, leaves };
}

export function FloralArchFrame({ position, rotation = 0, scale = 1, mats }: { position: V3; rotation?: number; scale?: number; mats: VenueMaterials }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {[-2.3, 2.3].map((x) => (
        <mesh key={x} material={mats.goldSatin} position={[x, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 1.5, 10]} />
        </mesh>
      ))}
      <mesh material={mats.goldSatin} position={[0, 1.5, 0]} castShadow>
        <torusGeometry args={[2.3, 0.035, 8, 64, Math.PI]} />
      </mesh>
    </group>
  );
}
export { arch as archItems };

export function Garden({ mats }: { mats: VenueMaterials }) {
  const data = useMemo(() => {
    const r = rng(7);
    const flowers: FlowerItem[] = [];
    const leaves: InstItem[] = [];
    const hedgeBoxes: InstItem[] = [];
    const tufts: InstItem[] = [];
    for (let z = 6.2; z < 45; z += 2.0) {
      for (const side of [-1, 1]) {
        if (Math.abs(z - 30) < 1.4 || Math.abs(z - 21) < 1.4) continue;
        hedgeBoxes.push({ p: [side * 2.65, 0.34, z], s: [0.75, 0.62, 1.8] });
        leaves.push(...hedgeItems([side * 2.65, 0.36, z], [0.8, 0.66, 1.85], Math.round(z * 10) + side, 24));
        // flower bed between hedge and path edge
        const b = bouquet([side * 2.02, 0.12, z], 0.36, 26, Math.round(z * 7) + side * 3, { marigold: 3, roseBlush: 2, jasmine: 3, gypsophila: 2 }, 0.45);
        flowers.push(...b.flowers);
        leaves.push(...b.leaves);
      }
    }
    // Lawn tufts: dense at the path edges, scattered further out.
    for (let i = 0; i < 2600; i++) {
      const side = r() > 0.5 ? 1 : -1;
      const near = i < 1400;
      const x = side * (near ? 3.1 + r() * 1.8 : 3.2 + r() * 14);
      const z = 1 + r() * 46;
      tufts.push({ p: [x, 0, z], s: [0.25 + r() * 0.25, 0.18 + r() * 0.22, 0.25 + r() * 0.25], r: [0, r() * 6.28, 0] });
    }
    // Arches
    for (const [z, seed] of [[30, 31], [21, 21]] as const) {
      const a = arch(z, seed);
      flowers.push(...a.flowers);
      leaves.push(...a.leaves);
    }
    // Frangipani trees
    const trees = [
      araliyaTree([-4.8, 0, 25.5], 1.05, 3),
      araliyaTree([4.9, 0, 16.5], 1.1, 9),
      araliyaTree([5.4, 0, 36], 0.95, 12),
      araliyaTree([-5.2, 0, 10.5], 0.9, 15),
    ];
    const treeLeaves = trees.flatMap((t) => t.leaves);
    trees.forEach((t) => flowers.push(...t.flowers));
    const wood = merge(trees.map((t) => t.wood));
    return { flowers, leaves, hedgeBoxes, tufts, treeLeaves, wood };
  }, []);

  const posts = useMemo(() => {
    const out: V3[] = [];
    for (let z = 8; z < 44; z += 4.4) out.push([-1.95, 0, z], [1.95, 0, z]);
    return out;
  }, []);
  const ground = useMemo(() => ({ lawn: tiledPlane(86, 120, 3.5), path: tiledPlane(2.8, 42, 2.6), curb: box(0.16, 0.08, 42, 1) }), []);
  const lanternPost = useMemo(() => lathe([[0, 0], [0.09, 0], [0.09, 0.05], [0.05, 0.1], [0.035, 0.2], [0.03, 1.1], [0.05, 1.14], [0, 1.15]], 16), []);

  return (
    <group>
      <mesh geometry={ground.lawn} material={mats.lawn} rotation={[-Math.PI / 2, 0, 0]} position={[-16, 0, 10]} receiveShadow />
      <mesh geometry={ground.path} material={mats.flagstone} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 26]} receiveShadow />
      <mesh geometry={ground.curb} material={mats.marbleTrim} position={[-1.48, 0.04, 26]} receiveShadow />
      <mesh geometry={ground.curb} material={mats.marbleTrim} position={[1.48, 0.04, 26]} receiveShadow />
      <Inst geometry={HEDGE_CORE} material={mats.hedgeCore} items={data.hedgeBoxes} cast receive />
      <LeafCards items={data.leaves} mats={mats} />
      <LeafCards items={data.treeLeaves} mats={mats} kind="araliya" />
      <mesh geometry={data.wood} material={mats.bark} castShadow />
      <Tufts items={data.tufts} mats={mats} />

      {posts.map((p, i) => (
        <group key={i} position={p}>
          <mesh geometry={lanternPost} material={mats.brass} castShadow />
          <mesh material={mats.glass} position={[0, 1.32, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.26, 6, 1, true]} />
          </mesh>
          <mesh material={mats.bulb} position={[0, 1.3, 0]} scale={0.045}>
            <sphereGeometry args={[1, 12, 10]} />
          </mesh>
          <mesh material={mats.brass} position={[0, 1.5, 0]}>
            <coneGeometry args={[0.16, 0.12, 6]} />
          </mesh>
          <Glow position={[0, 1.32, 0]} size={1} />
        </group>
      ))}

      <FloralArchFrame position={[0, 0, 30]} mats={mats} />
      <FloralArchFrame position={[0, 0, 21]} mats={mats} />

      <Palm position={[-6.5, 0, 34]} height={8} lean={0.8} rotation={0.4} seed={1} mats={mats} />
      <Palm position={[7.5, 0, 28]} height={9} lean={-0.9} rotation={2.2} seed={2} mats={mats} />
      <Palm position={[-9, 0, 18]} height={9.5} lean={0.7} rotation={1.1} seed={3} mats={mats} />
      <Palm position={[10.5, 0, 12]} height={8.5} lean={-0.6} rotation={3.3} seed={4} mats={mats} />
      <Palm position={[-13, 0, 6]} height={10} lean={0.5} rotation={2.5} seed={5} mats={mats} />
      <Palm position={[14, 0, 40]} height={8.8} lean={-0.7} rotation={0.8} seed={6} mats={mats} />
      <Palm position={[-15, 0, 40]} height={9.2} lean={0.9} rotation={4.2} seed={8} mats={mats} />
      <Palm position={[-20, 0, 26]} height={11} lean={0.4} rotation={1.7} seed={9} mats={mats} />
      <Palm position={[19, 0, 22]} height={10.5} lean={-0.5} rotation={5.1} seed={10} mats={mats} />
      <Banana position={[-3.5, 0, 38.5]} rotation={0.4} scale={1.1} seed={2} mats={mats} />
      <Banana position={[3.6, 0, 33.2]} rotation={1.8} scale={1.2} seed={4} mats={mats} />
      <Banana position={[-3.4, 0, 15.5]} rotation={2.6} scale={1.0} seed={6} mats={mats} />
      <Banana position={[3.5, 0, 24.5]} rotation={0.9} scale={0.95} seed={8} mats={mats} />
      <Treeline center={[4, 0, 6]} radius={75} height={20} arc={Math.PI * 2} start={0} mats={mats} repeat={9} />

      <Facade mats={mats} />
      <Flowers items={data.flowers} mats={mats} />
    </group>
  );
}

const HEDGE_CORE = (() => {
  const g = new THREE.SphereGeometry(0.5, 16, 12);
  g.scale(1, 1, 1);
  return g;
})();
