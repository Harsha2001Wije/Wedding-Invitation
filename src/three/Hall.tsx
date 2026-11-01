import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VenueMaterials } from './materials';
import { PunKalasa } from './Garden';
import { box, catenary, chiavariGeometry, columnGeometry, curtainGeometry, hipRoofGeometry, lathe, lotusGeometry, rng, swagGeometry, tiledPlane, type V3 } from './geo';
import { Bulbs, Flames, Flowers, Glow, Inst, LeafCards, bouquet, facing, jasmineStrand, type FlowerItem, type InstItem } from './nature';

// Scenes 3–5: the main hall, the Poruwa and the brass oil lamp.
// Floor level is y = 0.46; everything sits in a group at that height.

const FLOOR = 0.46;
const CHAIR = chiavariGeometry();
const CUSHION = (() => {
  const g = new THREE.BoxGeometry(0.42, 0.05, 0.4, 2, 1, 2);
  g.translate(0, 0.5, 0);
  return g;
})();
const CRYSTAL = new THREE.OctahedronGeometry(1, 0).scale(0.6, 1.4, 0.6);

export function chairRows(rows: { x: number; z: number; ry?: number }[]) {
  return rows.map(({ x, z, ry = 0 }) => ({ p: [x, 0, z] as V3, r: [0, ry, 0] as V3 }));
}

export function Chairs({ items, mats }: { items: InstItem[]; mats: VenueMaterials }) {
  return (
    <>
      <Inst geometry={CHAIR} material={mats.goldSatin} items={items} cast />
      <Inst geometry={CUSHION} material={mats.cushion} items={items} />
    </>
  );
}

function Chandelier({ position, mats }: { position: V3; mats: VenueMaterials }) {
  const g = useMemo(() => {
    const crystals: InstItem[] = [];
    const bulbs: V3[] = [];
    for (let ring = 0; ring < 2; ring++) {
      const R = ring ? 0.45 : 0.78;
      const n = ring ? 14 : 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        for (let k = 0; k < (ring ? 4 : 6); k++) crystals.push({ p: [Math.cos(a) * R, -0.06 - k * 0.075 + ring * 0.22, Math.sin(a) * R], s: 0.022 });
      }
      for (let i = 0; i < (ring ? 6 : 10); i++) {
        const a = (i / (ring ? 6 : 10)) * Math.PI * 2;
        bulbs.push([Math.cos(a) * R, 0.1 + ring * 0.24, Math.sin(a) * R]);
      }
    }
    return { crystals, bulbs };
  }, []);
  return (
    <group position={position}>
      <mesh material={mats.brass} position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.3, 6]} />
      </mesh>
      <mesh material={mats.brass} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.028, 10, 48]} />
      </mesh>
      <mesh material={mats.brass} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.22, 0]}>
        <torusGeometry args={[0.45, 0.024, 10, 40]} />
      </mesh>
      <Inst geometry={CRYSTAL} material={mats.crystal} items={g.crystals} />
      <Bulbs points={g.bulbs} mats={mats} size={0.03} />
      <Glow position={[0, 0.1, 0]} size={2.6} opacity={0.35} />
    </group>
  );
}

function Interior({ mats }: { mats: VenueMaterials }) {
  const g = useMemo(() => {
    const col = columnGeometry(6.2, 0.25, 20);
    return {
      floor: tiledPlane(14, 32, 1.2),
      runner: tiledPlane(1.9, 23, 0.6),
      wallL: box(0.3, 6.2, 32, 1.5),
      wallRBack: box(0.3, 6.2, 12.5, 1.5),
      wallRFront: box(0.3, 6.2, 11.5, 1.5),
      wallRTop: box(0.3, 1.6, 8, 1.5),
      wallBack: box(14.6, 6.2, 0.3, 1.5),
      dadoL: box(0.04, 1.1, 32, 1.2),
      skirt: box(0.06, 0.16, 32, 1),
      ceiling: tiledPlane(14.6, 32.4, 2),
      beam: box(14, 0.32, 0.4, 1.2),
      crown: box(0.22, 0.2, 32, 1),
      col,
      curtain: curtainGeometry(1.0, 3.6, 6, 0.7),
      swagLong: swagGeometry([0, 0, 0], [0, 0, -6], 0.65, 0.35, 7),
      swagCross: swagGeometry([-5.9, 0, 0], [5.9, 0, 0], 0.9, 0.25, 12),
      pedestal: lathe([[0, 0], [0.2, 0], [0.2, 0.03], [0.06, 0.08], [0.03, 0.14], [0.025, 0.8], [0.06, 0.86], [0.12, 0.9], [0.13, 0.93], [0, 0.91]], 24),
      winGlass: new THREE.PlaneGeometry(1.4, 2.6),
      winFrame: box(0.08, 2.8, 1.6, 1),
    };
  }, []);

  const chairs = useMemo(() => {
    const out: { x: number; z: number }[] = [];
    for (let row = 0; row < 9; row++) for (const side of [-1, 1]) for (let k = 0; k < 6; k++) out.push({ x: side * (1.45 + k * 0.78), z: -7 - row * 1.35 });
    return chairRows(out);
  }, []);

  const deco = useMemo(() => {
    const flowers: FlowerItem[] = [];
    const leaves: InstItem[] = [];
    for (let row = 0; row < 9; row += 2) {
      for (const side of [-1, 1]) {
        const b = bouquet([side * 1.05, 0.98, -6.6 - row * 1.35], 0.34, 85, 100 + row * 7 + side);
        flowers.push(...b.flowers);
        leaves.push(...b.leaves);
        // trailing jasmine from each pedestal
        flowers.push(...jasmineStrand(catenary([side * 1.05, 0.95, -6.6 - row * 1.35], [side * 1.05, 0.35, -6.4 - row * 1.35], 0.05, 12), 300 + row + side, null, 0.02));
      }
    }
    // Garland swags along the side walls
    for (let z = -2; z > -30; z -= 4) for (const x of [-6.75, 6.75]) {
      if (x > 0 && z < -11 && z > -20) continue;
      flowers.push(...jasmineStrand(catenary([x, 5.4, z], [x, 5.4, z - 4], 0.7, 40), 400 + Math.round(z * 3 + x), 'roseBlush'));
    }
    return { flowers, leaves };
  }, []);

  return (
    <group>
      <mesh geometry={g.floor} material={mats.marble} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -16]} receiveShadow />
      <mesh geometry={g.runner} material={mats.linen} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -11.5]} receiveShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.goldSatin} rotation={[-Math.PI / 2, 0, 0]} position={[s * 0.98, 0.008, -11.5]}>
          <planeGeometry args={[0.06, 23]} />
        </mesh>
      ))}
      {/* walls with dado, skirting and crown moulding */}
      <mesh geometry={g.wallL} material={mats.plasterWarm} position={[-7.15, 3.1, -16]} receiveShadow />
      <mesh geometry={g.wallRBack} material={mats.plasterWarm} position={[7.15, 3.1, -25.75]} receiveShadow />
      <mesh geometry={g.wallRFront} material={mats.plasterWarm} position={[7.15, 3.1, -5.75]} receiveShadow />
      <mesh geometry={g.wallRTop} material={mats.plasterWarm} position={[7.15, 5.4, -15.5]} receiveShadow />
      <mesh geometry={g.wallBack} material={mats.plasterWarm} position={[0, 3.1, -32.15]} receiveShadow />
      <mesh geometry={g.dadoL} material={mats.marbleTrim} position={[-6.98, 0.55, -16]} />
      <mesh geometry={g.skirt} material={mats.teak} position={[-6.96, 0.08, -16]} />
      <mesh geometry={g.crown} material={mats.marbleTrim} position={[-6.9, 6.05, -16]} />
      <mesh geometry={g.crown} material={mats.marbleTrim} position={[6.9, 6.05, -16]} />
      <mesh material={mats.goldSatin} position={[6.98, 4.62, -15.5]}>
        <boxGeometry args={[0.06, 0.12, 8.1]} />
      </mesh>
      {/* ceiling and coffers */}
      <mesh geometry={g.ceiling} material={mats.plaster} rotation={[Math.PI / 2, 0, 0]} position={[0, 6.2, -16]} />
      {[-3, -9, -15, -21, -27].map((z) => (
        <group key={z}>
          <mesh geometry={g.beam} material={mats.plaster} position={[0, 6.04, z]} />
          <mesh material={mats.goldSatin} position={[0, 5.875, z]}>
            <boxGeometry args={[14, 0.025, 0.42]} />
          </mesh>
        </group>
      ))}
      {/* tall windows with sheer curtains */}
      {[-5, -11, -17, -23].map((z) => (
        <group key={z} position={[-6.98, 2.9, z]}>
          <mesh geometry={g.winGlass} material={mats.windowGlow} rotation={[0, Math.PI / 2, 0]} />
          <mesh geometry={g.winFrame} material={mats.teak} position={[0.02, 0, 0]} scale={[1, 1, 1]} visible={false} />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={g.curtain} material={mats.drape} rotation={[0, Math.PI / 2, 0]} position={[0.18, 0.4, s * 0.95]} />
          ))}
          <mesh material={mats.brass} position={[0.2, 2.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 2.4, 8]} />
          </mesh>
        </group>
      ))}
      {/* columns */}
      {[-4, -10, -21, -27].flatMap((z) =>
        [-6.3, 6.3].map((x) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh geometry={g.col.shaft} material={mats.plaster} castShadow receiveShadow />
            <mesh geometry={g.col.base} material={mats.marbleTrim} />
            <mesh geometry={g.col.cap} material={mats.plaster} />
            <mesh material={mats.goldSatin} position={[0, 5.62, 0]}>
              <torusGeometry args={[0.26, 0.022, 8, 40]} />
            </mesh>
          </group>
        )),
      )}
      {/* pleated ceiling drapes */}
      {[-1, 1].flatMap((s) => [0, 1, 2, 3, 4].map((i) => <mesh key={`${s}${i}`} geometry={g.swagLong} material={mats.drape} position={[s * 5.9, 5.95, -1 - i * 6]} />))}
      {[-4, -10, -16, -22].map((z) => (
        <mesh key={z} geometry={g.swagCross} material={mats.drape} position={[0, 5.95, z]} />
      ))}
      <Chandelier position={[0, 4.55, -7]} mats={mats} />
      <Chandelier position={[0, 4.55, -15]} mats={mats} />
      <Chairs items={chairs} mats={mats} />
      {[0, 2, 4, 6, 8].flatMap((row) => [-1, 1].map((side) => <mesh key={`${row}${side}`} geometry={g.pedestal} material={mats.brass} position={[side * 1.05, 0, -6.6 - row * 1.35]} castShadow />))}
      <Flowers items={deco.flowers} mats={mats} />
      <LeafCards items={deco.leaves} mats={mats} />
      <pointLight position={[0, 4.4, -7]} color="#ffd9a6" intensity={16} distance={14} decay={1.4} />
      <pointLight position={[0, 4.4, -15]} color="#ffd9a6" intensity={16} distance={14} decay={1.4} />
    </group>
  );
}

function Poruwa({ mats }: { mats: VenueMaterials }) {
  const g = useMemo(() => {
    const col = columnGeometry(2.75, 0.1, 16);
    return {
      tier1: box(4.4, 0.36, 4.4, 1.2),
      band1: box(4.42, 0.2, 4.42, 0.22),
      lip1: box(4.52, 0.06, 4.52, 1.2),
      tier2: box(3.4, 0.3, 3.4, 1.2),
      band2: box(3.42, 0.16, 3.42, 0.18),
      lip2: box(3.5, 0.05, 3.5, 1.2),
      step: box(1.8, 0.18, 0.8, 1.2),
      col,
      beam: box(3.1, 0.18, 0.18, 0.18),
      roof: hipRoofGeometry(3.9, 3.9, 1.15),
      ceiling: curtainGeometry(2.9, 2.9, 10, 1),
      valance: [0, 1, 2, 3].map(() => swagGeometry([-1.45, 0, 0], [1.45, 0, 0], 0.18, 0.18, 6)),
      drape: curtainGeometry(1.8, 5.6, 9, 0.6),
      lotus: lotusGeometry(),
      bowl: lathe([[0, 0], [0.12, 0], [0.2, 0.06], [0.24, 0.14], [0.22, 0.15], [0, 0.08]], 32),
    };
  }, []);

  const deco = useMemo(() => {
    const r = rng(404);
    const flowers: FlowerItem[] = [];
    const leaves: InstItem[] = [];
    const corners: [number, number][] = [[-1.4, -1.4], [1.4, -1.4], [1.4, 1.4], [-1.4, 1.4]];
    // Jasmine bud strings spiralling up the pillars
    for (const [x, z] of corners) {
      const pts: V3[] = [];
      for (let k = 0; k < 110; k++) {
        const a = k * 0.35;
        pts.push([x + Math.cos(a) * 0.13, 0.75 + k * 0.024, z + Math.sin(a) * 0.13]);
      }
      flowers.push(...jasmineStrand(pts, 500 + x * 10 + z, null, 0.02));
    }
    // Garlands between pillar tops
    const top = 3.32;
    const edges: [V3, V3][] = [
      [[-1.4, top, 1.4], [1.4, top, 1.4]],
      [[-1.4, top, -1.4], [-1.4, top, 1.4]],
      [[1.4, top, -1.4], [1.4, top, 1.4]],
      [[-1.4, top, -1.4], [1.4, top, -1.4]],
    ];
    edges.forEach(([a, b], i) => {
      flowers.push(...jasmineStrand(catenary(a, b, 0.55, 70), 520 + i, 'roseBlush', 0.04));
      flowers.push(...jasmineStrand(catenary(a, b, 0.32, 60), 530 + i, 'roseWhite', 0.035));
    });
    // Corner tassels
    for (const [x, z] of corners) {
      const pts: V3[] = [];
      for (let k = 0; k < 18; k++) pts.push([x * 1.02, top - k * 0.07, z * 1.02]);
      flowers.push(...jasmineStrand(pts, 540 + x + z, 'roseBlush', 0.03));
    }
    // Traditional jasmine and marigold borders on both tiers
    for (const [half, y, , kinds] of [[2.2, 0.38, 600, ['jasmine', 'marigold']], [1.7, 0.67, 620, ['jasmine', 'roseBlush']]] as const) {
      for (let i = 0; i < 140; i++) {
        const t = (i / 140) * 4;
        const side = Math.floor(t);
        const u = (t % 1) * 2 - 1;
        const p: V3 = side === 0 ? [u * half, y, half] : side === 1 ? [half, y, -u * half] : side === 2 ? [-u * half, y, -half] : [-half, y, u * half];
        if (side === 0 && Math.abs(u * half) < 0.95 && half > 2) continue;
        const k = kinds[i % 2];
        const out = new THREE.Vector3(p[0], 0.6, p[2]).normalize();
        flowers.push({ k: k as FlowerItem['k'], p, s: k === 'marigold' ? 0.1 : 0.08, q: facing(out, r() * 6.28) });
      }
    }
    // Floral arch backdrop
    const dir = new THREE.Vector3();
    for (let i = 0; i < 1100; i++) {
      const a = r() * Math.PI;
      const R = 3.3 + r() * 0.5;
      dir.set((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, 1).normalize();
      const roll = r();
      const k = roll < 0.4 ? 'roseWhite' : roll < 0.65 ? 'jasmine' : roll < 0.85 ? 'roseBlush' : roll < 0.93 ? 'gypsophila' : 'frangipani';
      flowers.push({ k, p: [Math.cos(a) * R, 1.5 + Math.sin(a) * R, -3.9 + r() * 0.25], s: 0.12 * (0.85 + r() * 0.4), q: facing(dir, r() * 6.28) });
      if (i % 4 === 0) leaves.push({ p: [Math.cos(a) * R, 1.5 + Math.sin(a) * R, -4.05], s: 0.5, q: facing(dir, r() * 6.28) });
    }
    for (const x of [-3.3, 3.3]) {
      const b = bouquet([x, 0.55, -3.7], 0.8, 260, 650 + x);
      flowers.push(...b.flowers);
      leaves.push(...b.leaves);
    }
    return { flowers, leaves };
  }, []);

  const corners: [number, number][] = [[-1.4, -1.4], [1.4, -1.4], [1.4, 1.4], [-1.4, 1.4]];
  return (
    <group position={[0, 0, -26]}>
      <mesh geometry={g.tier1} material={mats.marble} position={[0, 0.18, 0]} castShadow receiveShadow />
      <mesh geometry={g.band1} material={mats.plasterCarved} position={[0, 0.17, 0]} scale={[1, 1, 1]} />
      <mesh geometry={g.lip1} material={mats.marbleTrim} position={[0, 0.36, 0]} receiveShadow />
      <mesh geometry={g.tier2} material={mats.marble} position={[0, 0.54, 0]} castShadow receiveShadow />
      <mesh geometry={g.band2} material={mats.goldCarved} position={[0, 0.53, 0]} />
      <mesh geometry={g.lip2} material={mats.marbleTrim} position={[0, 0.69, 0]} receiveShadow />
      <mesh geometry={g.step} material={mats.marbleTrim} position={[0, 0.09, 2.6]} castShadow receiveShadow />
      <mesh material={mats.linen} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.717, 0]} receiveShadow>
        <planeGeometry args={[2.7, 2.7]} />
      </mesh>
      {corners.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0.72, z]}>
          <mesh geometry={g.col.shaft} material={mats.plaster} castShadow />
          <mesh geometry={g.col.base} material={mats.goldSatin} />
          <mesh geometry={g.col.cap} material={mats.goldSatin} />
        </group>
      ))}
      {/* canopy: frame, pleated fabric ceiling, scalloped valance, roof */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
          <mesh geometry={g.beam} material={mats.plasterCarved} position={[0, 3.56, 1.45]} castShadow />
          <mesh geometry={g.valance[i]} material={mats.drape} position={[0, 3.47, 1.56]} />
          <mesh material={mats.goldSatin} position={[0, 3.66, 1.55]}>
            <boxGeometry args={[3.2, 0.03, 0.03]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={g.ceiling} material={mats.drape} rotation={[Math.PI / 2, 0, 0]} position={[0, 3.46, 0]} />
      <mesh geometry={g.roof} material={mats.plaster} position={[0, 3.65, 0]} castShadow />
      <mesh geometry={g.lotus} material={mats.goldSatin} position={[0, 4.78, 0]} scale={0.7} />
      {corners.map(([x, z]) => (
        <PunKalasa key={`${x}${z}`} position={[x * 1.33, 0.37, z * 1.33]} scale={0.9} mats={mats} />
      ))}
      {[-0.68, 0.68].map((x) => (
        <group key={x} position={[x, 0.18, 2.62]}>
          <mesh geometry={g.bowl} material={mats.brass} castShadow />
          <mesh geometry={g.lotus} material={mats.lotus} position={[0, 0.1, 0]} scale={0.85} />
        </group>
      ))}
      {[-4.6, -2.7, 2.7, 4.6].map((x) => (
        <mesh key={x} geometry={g.drape} material={mats.drape} position={[x, 2.85, -5.6]} />
      ))}
      <Flowers items={deco.flowers} mats={mats} />
      <LeafCards items={deco.leaves} mats={mats} />
      <pointLight position={[0, 5.2, 3.5]} color="#ffe2b8" intensity={22} distance={14} decay={1.5} />
      <Glow position={[0, 2.6, -3.6]} size={7} opacity={0.2} />
    </group>
  );
}

function OilLamp({ mats }: { mats: VenueMaterials }) {
  const light = useRef<THREE.PointLight>(null);
  const g = useMemo(() => ({
    // Tall brass standing lamp (pahana): base, ringed stem, wide dish, finial.
    lamp: lathe([
      [0, 0], [0.34, 0], [0.36, 0.04], [0.3, 0.1], [0.16, 0.2], [0.09, 0.26], [0.1, 0.3], [0.06, 0.34],
      [0.05, 0.6], [0.09, 0.63], [0.05, 0.66], [0.045, 0.95], [0.085, 0.98], [0.045, 1.01], [0.045, 1.2],
      [0.1, 1.24], [0.3, 1.3], [0.34, 1.34], [0.3, 1.355], [0.06, 1.32], [0.04, 1.36], [0.04, 1.48],
      [0.07, 1.52], [0.05, 1.57], [0.02, 1.62], [0, 1.64],
    ], 48),
    dais: lathe([[0, 0.24], [0.84, 0.24], [0.9, 0.2], [0.92, 0.02], [0, 0.02]], 48),
    wick: new THREE.CylinderGeometry(0.008, 0.008, 0.04, 6),
  }), []);
  const wicks = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    return [Math.cos(a) * 0.3, 1.58, Math.sin(a) * 0.3] as V3;
  }), []);
  const ring = useMemo(() => {
    const r = rng(808);
    const out: FlowerItem[] = [];
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      const rr = 0.78 + r() * 0.1;
      const dir = new THREE.Vector3(Math.cos(a), 1.2, Math.sin(a)).normalize();
      const k = i % 3 === 0 ? 'marigold' : i % 3 === 1 ? 'jasmine' : 'buds';
      out.push({ k, p: [Math.cos(a) * rr, 0.27, Math.sin(a) * rr], s: k === 'marigold' ? 0.1 : 0.075, q: facing(dir, r() * 6.28) });
    }
    return out;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.intensity = 6 + Math.sin(t * 9.1) * 0.5 + Math.sin(t * 15.7) * 0.35;
  });
  return (
    <group position={[3.9, 0, -21.6]}>
      <mesh geometry={g.dais} material={mats.linen} castShadow receiveShadow />
      <mesh material={mats.goldSatin} position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.87, 0.012, 6, 64]} />
      </mesh>
      <mesh geometry={g.lamp} material={mats.brass} position={[0, 0.24, 0]} castShadow receiveShadow />
      <Inst geometry={g.wick} material={mats.teak} items={wicks.map((p) => ({ p: [p[0], p[1] - 0.01, p[2]] as V3 }))} />
      <Flames points={wicks} size={0.11} />
      {wicks.map((p, i) => (
        <Glow key={i} position={[p[0], p[1] + 0.05, p[2]]} size={0.3} opacity={0.6} color="#ffc977" />
      ))}
      <Flowers items={ring} mats={mats} />
      <pointLight ref={light} position={[0, 1.95, 0.25]} color="#ffb766" intensity={6} distance={6} decay={1.6} />
    </group>
  );
}

export function Hall({ mats }: { mats: VenueMaterials }) {
  return (
    <group position={[0, FLOOR, 0]}>
      <Interior mats={mats} />
      <Poruwa mats={mats} />
      <OilLamp mats={mats} />
    </group>
  );
}
