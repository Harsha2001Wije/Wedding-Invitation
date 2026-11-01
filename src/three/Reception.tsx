import { useMemo } from 'react';
import * as THREE from 'three';
import type { VenueMaterials } from './materials';
import { FloralArchFrame, KandyanRoof, archItems } from './Garden';
import { Chairs } from './Hall';
import { box, catenary, curtainGeometry, lathe, lotusGeometry, rng, tableclothGeometry, tiledPlane, type V3 } from './geo';
import { Bulbs, Fireflies, Flames, Flowers, Glow, Inst, LeafCards, Palm, Treeline, bouquet, facing, hedgeItems, type FlowerItem, type InstItem } from './nature';

// Scenes 6–8: reception room, dining table and the evening garden.

const FLOOR = 0.46;

function strands(list: [V3, V3, number][], step = 0.28) {
  const pts: V3[] = [];
  list.forEach(([a, b, sag]) => {
    const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / step));
    pts.push(...catenary(a, b, sag, n));
  });
  return pts;
}

function ReceptionRoom({ mats, cake, danceFloor }: { mats: VenueMaterials; cake: boolean; danceFloor: boolean }) {
  const tables: V3[] = useMemo(() => [11.6, 15.6, 19.6, 23.6].flatMap((x) => [[x, 0, -8.6], [x, 0, -13.2]] as V3[]), []);
  const g = useMemo(() => ({
    floor: tiledPlane(20, 26, 1.2),
    ceiling: tiledPlane(20, 26, 2),
    wallN: box(20.3, 6.2, 0.3, 1.5),
    wallE1: box(0.3, 6.2, 12.5, 1.5),
    wallE2: box(0.3, 6.2, 5.9, 1.5),
    wallE3: box(0.3, 1.6, 8, 1.5),
    cloth: tableclothGeometry(0.9, 0.76),
    stage: box(7.6, 0.3, 2.7, 1.2),
    sofa: (() => {
      const seat = box(2.6, 0.42, 0.85, 0.6, [0, 0.21, 0]);
      return seat;
    })(),
    sofaBack: box(2.6, 0.75, 0.22, 0.6),
    curtain: curtainGeometry(2.2, 5.4, 10, 0.6),
    stand: lathe([[0, 0], [0.11, 0], [0.11, 0.02], [0.03, 0.05], [0.015, 0.5], [0.05, 0.53], [0.09, 0.56], [0, 0.55]], 20),
    votive: new THREE.CylinderGeometry(0.035, 0.03, 0.07, 14, 1, true),
    candle: new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12),
  }), []);

  const deco = useMemo(() => {
    const flowers: FlowerItem[] = [];
    const leaves: InstItem[] = [];
    const flames: V3[] = [];
    const candles: InstItem[] = [];
    tables.forEach((t, i) => {
      const b = bouquet([t[0], 1.33, t[2]], 0.28, 70, 1000 + i, { roseWhite: 3, roseBlush: 3, jasmine: 2, gypsophila: 2 }, 0.9);
      flowers.push(...b.flowers);
      leaves.push(...b.leaves);
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1;
        const p: V3 = [t[0] + Math.cos(a) * 0.38, 0.77, t[2] + Math.sin(a) * 0.38];
        candles.push({ p: [p[0], p[1] + 0.035, p[2]] });
        flames.push([p[0], p[1] + 0.065, p[2]]);
      }
    });
    const r = rng(912);
    const dir = new THREE.Vector3();
    for (let i = 0; i < 900; i++) {
      const a = r() * Math.PI;
      const R = 2.4 + r() * 0.55;
      dir.set((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, 1).normalize();
      const roll = r();
      const k = roll < 0.4 ? 'roseWhite' : roll < 0.65 ? 'roseBlush' : roll < 0.85 ? 'jasmine' : 'gypsophila';
      flowers.push({ k, p: [17.6 + Math.cos(a) * R * 1.3, 1.0 + Math.sin(a) * R, -4.45 + r() * 0.2], s: 0.12 * (0.85 + r() * 0.4), q: facing(dir, r() * 6.28) });
      if (i % 4 === 0) leaves.push({ p: [17.6 + Math.cos(a) * R * 1.3, 1.0 + Math.sin(a) * R, -4.55], s: 0.5, q: facing(dir, r() * 6.28) });
    }
    for (const x of [14.2, 21]) {
      const b = bouquet([x, 0.85, -5.1], 0.6, 200, 913 + x);
      flowers.push(...b.flowers);
      leaves.push(...b.leaves);
    }
    if (cake) {
      const b = bouquet([24.6, 1.58, -5.6], 0.14, 30, 77);
      flowers.push(...b.flowers);
    }
    return { flowers, leaves, flames, candles };
  }, [tables, cake]);

  const chairs = useMemo(
    () =>
      tables.flatMap((t) =>
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return { p: [t[0] + Math.cos(a) * 1.3, 0, t[2] + Math.sin(a) * 1.3] as V3, r: [0, -a - Math.PI / 2, 0] as V3 };
        }),
      ),
    [tables],
  );

  const fairy = useMemo(() => {
    const list: [V3, V3, number][] = [];
    for (let z = -5.5; z > -29; z -= 2.6) list.push([[7.4, 5.9, z], [26.6, 5.9, z - 1.2], 0.9]);
    return strands(list, 0.32);
  }, []);

  return (
    <group>
      <mesh geometry={g.floor} material={mats.marble} rotation={[-Math.PI / 2, 0, 0]} position={[17, 0, -17]} receiveShadow />
      {danceFloor && (
        <mesh material={mats.teak} rotation={[-Math.PI / 2, 0, 0]} position={[17.6, 0.006, -10.9]} receiveShadow>
          <planeGeometry args={[4, 2.2]} />
        </mesh>
      )}
      <mesh geometry={g.ceiling} material={mats.plaster} rotation={[Math.PI / 2, 0, 0]} position={[17, 6.2, -17]} />
      <mesh geometry={g.wallN} material={mats.plasterWarm} position={[17, 3.1, -3.85]} receiveShadow />
      <mesh geometry={g.wallN} material={mats.plasterWarm} position={[17, 3.1, -30.15]} receiveShadow />
      <mesh geometry={g.wallE1} material={mats.plasterWarm} position={[27.15, 3.1, -23.75]} receiveShadow />
      <mesh geometry={g.wallE2} material={mats.plasterWarm} position={[27.15, 3.1, -6.65]} receiveShadow />
      <mesh geometry={g.wallE3} material={mats.plasterWarm} position={[27.15, 5.4, -13.5]} receiveShadow />
      <mesh material={mats.goldSatin} position={[27.0, 4.62, -13.5]}>
        <boxGeometry args={[0.06, 0.12, 8.1]} />
      </mesh>
      {/* stage for the couple */}
      <mesh geometry={g.stage} material={mats.marbleTrim} position={[17.6, 0.15, -5.4]} castShadow receiveShadow />
      <mesh geometry={g.sofa} material={mats.linenBlush} position={[17.6, 0.3, -5.15]} castShadow />
      <mesh geometry={g.sofaBack} material={mats.linenBlush} position={[17.6, 1.05, -4.68]} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} material={mats.goldSatin} position={[17.6 + s * 1.36, 0.75, -5.05]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.95, 16]} />
        </mesh>
      ))}
      {[13.2, 15.3, 19.9, 22].map((x) => (
        <mesh key={x} geometry={g.curtain} material={mats.drape} position={[x, 3.1, -4.1]} />
      ))}
      {tables.map((t, i) => (
        <group key={i} position={t}>
          <mesh geometry={g.cloth} material={mats.linen} castShadow receiveShadow />
          <mesh material={mats.linenBlush} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.768, 0]}>
            <circleGeometry args={[0.55, 48]} />
          </mesh>
          <mesh geometry={g.stand} material={mats.brass} position={[0, 0.77, 0]} scale={[1, 1, 1]} castShadow />
        </group>
      ))}
      <Inst geometry={g.votive} material={mats.glass} items={deco.candles} />
      <Inst geometry={g.candle} material={mats.candle} items={deco.candles.map((c) => ({ p: [c.p[0], c.p[1] - 0.012, c.p[2]] as V3 }))} />
      <Flames points={deco.flames} size={0.045} />
      <Chairs items={chairs} mats={mats} />
      {cake && (
        <group position={[24.6, 0, -5.6]}>
          <mesh geometry={g.cloth} material={mats.linen} scale={[0.6, 1, 0.6]} castShadow />
          {[0.3, 0.23, 0.16].map((r, i) => (
            <mesh key={i} material={mats.porcelain} position={[0, 0.88 + i * 0.2, 0]} castShadow>
              <cylinderGeometry args={[r, r, 0.2, 40]} />
            </mesh>
          ))}
        </group>
      )}
      <Bulbs points={fairy} mats={mats} />
      <Flowers items={deco.flowers} mats={mats} />
      <LeafCards items={deco.leaves} mats={mats} />
      <pointLight position={[17, 5.0, -11]} color="#ffd29a" intensity={24} distance={20} decay={1.4} />
    </group>
  );
}

function Dining({ mats, dinner }: { mats: VenueMaterials; dinner: boolean }) {
  const g = useMemo(() => {
    const table = box(11.8, 0.06, 1.5, 0.6);
    const skirt = (() => {
      const c = curtainGeometry(11.8, 0.74, 60, 0.98);
      return c;
    })();
    return {
      table,
      skirt,
      runner: tiledPlane(11.6, 0.42, 0.6),
      plate: lathe([[0, 0], [0.11, 0], [0.135, 0.012], [0.14, 0.016], [0, 0.008]], 32),
      glass: lathe([[0, 0], [0.035, 0], [0.006, 0.01], [0.005, 0.1], [0.03, 0.12], [0.04, 0.2], [0.038, 0.2], [0.028, 0.12], [0, 0.11]], 20),
      stick: lathe([[0, 0], [0.05, 0], [0.05, 0.01], [0.015, 0.04], [0.012, 0.2], [0.03, 0.22], [0, 0.22]], 16),
      taper: new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10),
      lantern: lathe([[0, -0.2], [0.1, -0.2], [0.18, -0.05], [0.16, 0.12], [0.08, 0.2], [0, 0.22]], 16),
    };
  }, []);
  const data = useMemo(() => {
    const plates: InstItem[] = [];
    const glasses: InstItem[] = [];
    const chairs: InstItem[] = [];
    const sticks: InstItem[] = [];
    const flames: V3[] = [];
    const flowers: FlowerItem[] = [];
    const leaves: InstItem[] = [];
    for (let x = 13.2; x <= 24.0; x += 0.9) {
      for (const side of [-1, 1]) {
        plates.push({ p: [x, 0.79, -26.5 + side * 0.48] });
        glasses.push({ p: [x + 0.2, 0.79, -26.5 + side * 0.3] });
        chairs.push({ p: [x, 0, -26.5 + side * 1.0], r: [0, side > 0 ? 0 : Math.PI, 0] });
      }
    }
    for (let x = 13.6; x <= 24; x += 1.8) {
      sticks.push({ p: [x, 0.79, -26.5] });
      flames.push([x, 1.13, -26.5]);
      const b = bouquet([x + 0.9, 0.82, -26.5], 0.2, 34, Math.round(x * 10), { roseBlush: 2, roseWhite: 2, jasmine: 2, gypsophila: 1, fern: 1 }, 0.55);
      flowers.push(...b.flowers);
      leaves.push(...b.leaves);
    }
    return { plates, glasses, chairs, sticks, flames, flowers, leaves };
  }, []);
  return (
    <group>
      <mesh geometry={g.table} material={mats.linen} position={[18.6, 0.76, -26.5]} castShadow receiveShadow />
      <mesh geometry={g.skirt} material={mats.linen} position={[18.6, 0.39, -25.75]} />
      <mesh geometry={g.skirt} material={mats.linen} position={[18.6, 0.39, -27.25]} rotation={[0, Math.PI, 0]} />
      <mesh geometry={g.runner} material={mats.linenBlush} rotation={[-Math.PI / 2, 0, 0]} position={[18.6, 0.792, -26.5]} />
      <Inst geometry={g.plate} material={mats.porcelain} items={data.plates} />
      <Inst geometry={g.glass} material={mats.glass} items={data.glasses} />
      <Inst geometry={g.stick} material={mats.brass} items={data.sticks} cast />
      <Inst geometry={g.taper} material={mats.candle} items={data.sticks.map((s) => ({ p: [s.p[0], s.p[1] + 0.32, s.p[2]] as V3 }))} />
      <Flames points={data.flames} size={0.05} />
      <Chairs items={data.chairs} mats={mats} />
      <Flowers items={data.flowers} mats={mats} />
      <LeafCards items={data.leaves} mats={mats} />
      {[14.6, 18.6, 22.6].map((x) => (
        <group key={x} position={[x, 3.4, -26.5]}>
          <mesh material={mats.brass} position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 2.6, 6]} />
          </mesh>
          <mesh geometry={g.lantern} material={mats.glass} />
          <mesh material={mats.bulb} scale={0.07}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
          <mesh material={mats.brass} position={[0, 0.23, 0]}>
            <cylinderGeometry args={[0.06, 0.09, 0.05, 12]} />
          </mesh>
          <Glow position={[0, 0, 0]} size={2} opacity={0.45} />
        </group>
      ))}
      <pointLight position={[18.6, 2.8, -25.6]} color={dinner ? '#ffc285' : '#ffdcb0'} intensity={14} distance={11} decay={1.5} />
    </group>
  );
}

function EveningGarden({ mats }: { mats: VenueMaterials }) {
  const g = useMemo(() => ({
    lawn: tiledPlane(62, 110, 3.5),
    path: tiledPlane(10, 2.3, 2.4),
    pondRim: box(5.2, 0.16, 3.0, 1.2),
    water: new THREE.PlaneGeometry(4.8, 2.6),
    pad: (() => {
      const s = new THREE.Shape();
      s.absarc(0, 0, 1, 0.25, Math.PI * 2 - 0.25, false);
      s.lineTo(0, 0);
      return new THREE.ShapeGeometry(s, 24).rotateX(-Math.PI / 2);
    })(),
    lotus: lotusGeometry(),
    lamp: lathe([[0, 0], [0.05, 0], [0.07, 0.02], [0.06, 0.035], [0.02, 0.025], [0, 0.03]], 14),
    pole: new THREE.CylinderGeometry(0.05, 0.06, 4.5, 10).translate(0, 2.25, 0),
  }), []);
  const data = useMemo(() => {
    const r = rng(321);
    const pads: InstItem[] = [];
    const blooms: InstItem[] = [];
    for (const zc of [-17.2, -9.8]) {
      for (let i = 0; i < 16; i++) {
        const x = 31.6 + r() * 4.4, z = zc + (r() - 0.5) * 2.0;
        pads.push({ p: [x, 0.09, z], s: 0.22 + r() * 0.14, r: [0, r() * 6.28, 0] });
        if (i % 3 === 0) blooms.push({ p: [x, 0.12, z], s: 0.9 + r() * 0.3, r: [0, r() * 6, 0] });
      }
    }
    const lamps: V3[] = [];
    for (let x = 28.5; x < 37; x += 0.9) lamps.push([x, 0.02, -14.85], [x, 0.02, -12.15]);
    const a = archItems(0, 88);
    // Arch flowers are generated around the origin; place them at the arch.
    const place = (p: V3): V3 => [39 - p[2] * 1.3, p[1] * 1.3, -13.5 + p[0] * 1.3];
    const flowers = a.flowers.map((f) => ({ ...f, p: place(f.p), s: (f.s as number) * 1.3, q: f.q ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2).multiply(f.q) : undefined }));
    const leaves: InstItem[] = a.leaves.map((f) => ({ ...f, p: place(f.p), s: (f.s as number) * 1.3, q: f.q ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2).multiply(f.q) : undefined }));
    // low borders along the path
    for (let x = 29; x < 36.5; x += 1.6) for (const z of [-15.6, -11.4]) leaves.push(...hedgeItems([x, 0.18, z], [1.2, 0.35, 0.45], Math.round(x * 13 + z), 26));
    const fairy = strands([
      [[29, 4.2, -18], [39, 4.6, -16.5], 1.0],
      [[29, 4.2, -9], [39, 4.6, -10.5], 1.0],
      [[39, 4.6, -16.5], [45, 4.4, -18], 0.6],
      [[39, 4.6, -10.5], [45, 4.4, -9], 0.6],
    ], 0.3);
    return { pads, blooms, lamps, flowers, leaves, fairy };
  }, []);
  return (
    <group>
      <mesh geometry={g.lawn} material={mats.lawnNight} rotation={[-Math.PI / 2, 0, 0]} position={[58, 0.004, -12]} receiveShadow />
      <mesh geometry={g.path} material={mats.flagstone} rotation={[-Math.PI / 2, 0, 0]} position={[33, 0.02, -13.5]} receiveShadow />
      {[-17.2, -9.8].map((z) => (
        <group key={z}>
          <mesh geometry={g.pondRim} material={mats.stone} position={[33.8, 0.08, z]} receiveShadow />
          <mesh geometry={g.water} material={mats.water} rotation={[-Math.PI / 2, 0, 0]} position={[33.8, 0.085, z]} />
        </group>
      ))}
      <Inst geometry={g.pad} material={mats.lotusPad} items={data.pads} />
      <Inst geometry={g.lotus} material={mats.lotus} items={data.blooms} />
      <Inst geometry={g.lamp} material={mats.clay} items={data.lamps.map((p) => ({ p }))} />
      <Flames points={data.lamps.map((p) => [p[0], p[1] + 0.035, p[2]] as V3)} size={0.045} />
      <FloralArchFrame position={[39, 0, -13.5]} rotation={-Math.PI / 2} scale={1.3} mats={mats} />
      <Flowers items={data.flowers} mats={mats} />
      <LeafCards items={data.leaves} mats={mats} />
      {[[29, -18], [29, -9], [39, -16.5], [39, -10.5], [45, -18], [45, -9]].map(([x, z], i) => (
        <mesh key={i} geometry={g.pole} material={mats.teak} position={[x, 0, z]} castShadow />
      ))}
      <Bulbs points={data.fairy} mats={mats} size={0.03} />
      <Palm position={[42, 0, -24]} height={9} lean={0.7} rotation={1.2} seed={21} mats={mats} />
      <Palm position={[45, 0, -2]} height={10} lean={-0.8} rotation={2.7} seed={22} mats={mats} />
      <Palm position={[52, 0, -29]} height={8.5} lean={0.5} rotation={0.4} seed={23} mats={mats} />
      <Palm position={[49, 0, 3]} height={11} lean={-0.4} rotation={3.6} seed={24} mats={mats} />
      <Treeline center={[40, 0, -14]} radius={34} height={16} arc={Math.PI * 1.2} start={Math.PI * -0.1} mats={mats} repeat={5} />
      <Fireflies area={[[31, 0.6, -20], [45, 3.2, -7]]} />
      <pointLight position={[35.5, 3.4, -13.5]} color="#ffc98c" intensity={30} distance={16} decay={1.6} />
      <pointLight position={[37.2, 4.2, -13.5]} color="#ffd6a8" intensity={22} distance={10} decay={1.6} />
    </group>
  );
}

export function Reception({ mats, cake, danceFloor, dinner }: { mats: VenueMaterials; cake: boolean; danceFloor: boolean; dinner: boolean }) {
  return (
    <>
      <group position={[0, FLOOR, 0]}>
        <ReceptionRoom mats={mats} cake={cake} danceFloor={danceFloor} />
        <Dining mats={mats} dinner={dinner} />
      </group>
      <KandyanRoof position={[17, 6.66, -17]} w={21} d={27.6} mats={mats} tier={0.8} />
      <EveningGarden mats={mats} />
    </>
  );
}
