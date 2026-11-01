import { useMemo } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThemeConfig } from '../config/types';

// Texture URLs (Vite fingerprints them; the one-file build inlines them).
import marbleC from './tex/marble_color.webp';
import marbleN from './tex/marble_normal.webp';
import marbleO from './tex/marble_orm.webp';
import plasterC from './tex/plaster_color.webp';
import plasterN from './tex/plaster_normal.webp';
import plasterO from './tex/plaster_orm.webp';
import teakC from './tex/teak_color.webp';
import teakN from './tex/teak_normal.webp';
import teakO from './tex/teak_orm.webp';
import reliefN from './tex/relief_normal.webp';
import reliefO from './tex/relief_orm.webp';
import roofC from './tex/roof_color.webp';
import roofN from './tex/roof_normal.webp';
import roofO from './tex/roof_orm.webp';
import grassC from './tex/grass_color.webp';
import grassN from './tex/grass_normal.webp';
import flagC from './tex/flagstone_color.webp';
import flagN from './tex/flagstone_normal.webp';
import flagO from './tex/flagstone_orm.webp';
import linenC from './tex/linen_color.webp';
import linenN from './tex/linen_normal.webp';
import barkC from './tex/bark_color.webp';
import barkN from './tex/bark_normal.webp';
import brassO from './tex/brass_orm.webp';
import waterN from './tex/water_normal.webp';
import flowersT from './tex/flowers.webp';
import frondT from './tex/palm_frond.webp';
import bananaT from './tex/banana.webp';
import leavesT from './tex/leaves.webp';
import araliyaT from './tex/araliya.webp';
import tuftT from './tex/tuft.webp';
import polmalT from './tex/polmal.webp';
import treelineT from './tex/treeline.webp';
import lotusT from './tex/lotus_petal.webp';

const URLS = [
  marbleC, marbleN, marbleO, plasterC, plasterN, plasterO, teakC, teakN, teakO, reliefN, reliefO,
  roofC, roofN, roofO, grassC, grassN, flagC, flagN, flagO, linenC, linenN, barkC, barkN, brassO, waterN,
  flowersT, frondT, bananaT, leavesT, araliyaT, tuftT, polmalT, treelineT, lotusT,
];
const COLOR = new Set([marbleC, plasterC, teakC, roofC, grassC, flagC, linenC, barkC, flowersT, frondT, bananaT, leavesT, araliyaT, tuftT, polmalT, treelineT, lotusT]);

export type FlowerKind = 'jasmine' | 'buds' | 'frangipani' | 'roseBlush' | 'roseWhite' | 'marigold' | 'gypsophila' | 'fern';
export const FLOWER_KINDS: FlowerKind[] = ['jasmine', 'buds', 'frangipani', 'roseBlush', 'roseWhite', 'marigold', 'gypsophila', 'fern'];

function pbr(
  maps: { map?: THREE.Texture; normal?: THREE.Texture; orm?: THREE.Texture },
  params: Omit<THREE.MeshStandardMaterialParameters, 'normalScale'> & { normalScale?: number } = {},
) {
  const { normalScale = 1, ...rest } = params;
  return new THREE.MeshStandardMaterial({
    map: maps.map ?? null,
    normalMap: maps.normal ?? null,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    aoMap: maps.orm ?? null,
    roughnessMap: maps.orm ?? null,
    metalnessMap: maps.orm ?? null,
    roughness: maps.orm ? 1 : 0.8,
    metalness: maps.orm ? 1 : 0,
    ...rest,
  });
}

function cutout(map: THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.65, ...extra });
}

/** Loads every texture (suspends) and builds the shared material set. */
export function useVenueMaterials(theme: ThemeConfig, lowTier: boolean) {
  const tex = useLoader(THREE.TextureLoader, URLS);
  const gl = useThree((s) => s.gl);
  return useMemo(() => {
    const aniso = Math.min(lowTier ? 4 : 8, gl.capabilities.getMaxAnisotropy());
    const T: Record<string, THREE.Texture> = {};
    URLS.forEach((u, i) => {
      const t = tex[i];
      t.colorSpace = COLOR.has(u) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = aniso;
      t.needsUpdate = true;
      T[u] = t;
    });
    const clampEdges = (t: THREE.Texture) => {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    };
    [flowersT, frondT, bananaT, leavesT, araliyaT, tuftT, polmalT, treelineT, lotusT].forEach((u) => clampEdges(T[u]));

    const ivory = new THREE.Color(theme.ivory);
    const gold = new THREE.Color(theme.gold);
    const blush = new THREE.Color(theme.blush);

    // One material per flower kind, each reading its cell of the atlas.
    const flowers = {} as Record<FlowerKind, THREE.MeshStandardMaterial>;
    FLOWER_KINDS.forEach((k, i) => {
      const t = T[flowersT].clone();
      t.repeat.set(0.25, 0.5);
      t.offset.set((i % 4) * 0.25, i < 4 ? 0.5 : 0);
      t.needsUpdate = true;
      flowers[k] = cutout(t, {
        roughness: 0.55,
        emissive: new THREE.Color(k === 'marigold' ? '#3a1c00' : '#2a2620'),
        emissiveIntensity: 0.25,
        emissiveMap: t,
      });
    });

    const brass = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d2a24c'),
      metalness: 1,
      roughness: 1,
      roughnessMap: T[brassO],
      metalnessMap: T[brassO],
    });

    const m = {
      plaster: pbr({ map: T[plasterC], normal: T[plasterN], orm: T[plasterO] }, { metalness: 0 }),
      plasterWarm: pbr({ map: T[plasterC], normal: T[plasterN], orm: T[plasterO] }, { color: new THREE.Color('#efe1c8'), metalness: 0 }),
      stone: pbr({ map: T[plasterC], normal: T[plasterN], orm: T[plasterO] }, { color: new THREE.Color('#d8ccb6'), metalness: 0, normalScale: 2 }),
      marble: pbr({ map: T[marbleC], normal: T[marbleN], orm: T[marbleO] }, { metalness: 0 }),
      marbleTrim: pbr({ map: T[marbleC], normal: T[marbleN], orm: T[marbleO] }, { metalness: 0, color: new THREE.Color('#f7f1e6') }),
      teak: pbr({ map: T[teakC], normal: T[teakN], orm: T[teakO] }, { metalness: 0 }),
      teakCarved: pbr({ map: T[teakC], normal: T[reliefN], orm: T[reliefO] }, { metalness: 0, normalScale: 1.4 }),
      roof: pbr({ map: T[roofC], normal: T[roofN], orm: T[roofO] }, { metalness: 0, normalScale: 1.3 }),
      lawn: pbr({ map: T[grassC], normal: T[grassN] }, { roughness: 0.95 }),
      lawnNight: pbr({ map: T[grassC], normal: T[grassN] }, { roughness: 0.95, color: new THREE.Color('#9fb0a0') }),
      flagstone: pbr({ map: T[flagC], normal: T[flagN], orm: T[flagO] }, { metalness: 0 }),
      linen: pbr({ map: T[linenC], normal: T[linenN] }, { color: ivory.clone().lerp(new THREE.Color('#ffffff'), 0.4), roughness: 0.92, normalScale: 0.8 }),
      linenBlush: pbr({ map: T[linenC], normal: T[linenN] }, { color: blush.clone().lerp(new THREE.Color('#ffffff'), 0.25), roughness: 0.92, normalScale: 0.8 }),
      drape: new THREE.MeshPhysicalMaterial({
        map: T[linenC],
        normalMap: T[linenN],
        color: new THREE.Color('#fffaf2'),
        roughness: 0.85,
        sheen: 0.6,
        sheenColor: new THREE.Color('#fff2dc'),
        sheenRoughness: 0.6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      }),
      bark: pbr({ map: T[barkC], normal: T[barkN] }, { roughness: 0.92 }),
      brass,
      gold: new THREE.MeshStandardMaterial({ color: gold.clone().lerp(new THREE.Color('#e7c56f'), 0.3), metalness: 1, roughness: 0.28 }),
      goldSatin: new THREE.MeshStandardMaterial({ color: new THREE.Color('#d4ad5c'), metalness: 0.95, roughness: 0.38 }),
      porcelain: new THREE.MeshStandardMaterial({ color: new THREE.Color('#fbf8f1'), roughness: 0.12 }),
      glass: new THREE.MeshStandardMaterial({ color: new THREE.Color('#e9f0f2'), roughness: 0.04, metalness: 0, transparent: true, opacity: 0.25 }),
      crystal: new THREE.MeshStandardMaterial({ color: new THREE.Color('#ffffff'), roughness: 0.02, metalness: 0.3, envMapIntensity: 2.2 }),
      windowGlow: new THREE.MeshStandardMaterial({ color: new THREE.Color('#fff1d6'), emissive: new THREE.Color('#ffdca6'), emissiveIntensity: 1.6, roughness: 0.2 }),
      bulb: new THREE.MeshStandardMaterial({ color: new THREE.Color('#fff6e2'), emissive: new THREE.Color('#ffd28a'), emissiveIntensity: lowTier ? 2 : 7, toneMapped: true }),
      fairy: new THREE.MeshBasicMaterial({ color: new THREE.Color(lowTier ? '#ffe4b0' : '#ffd696').multiplyScalar(lowTier ? 1 : 6) }),
      candle: new THREE.MeshStandardMaterial({ color: new THREE.Color('#f8f1e3'), roughness: 0.6, emissive: new THREE.Color('#5a3a12'), emissiveIntensity: 0.25 }),
      clay: new THREE.MeshStandardMaterial({ color: new THREE.Color('#9b5a3a'), roughness: 0.85 }),
      water: new THREE.MeshStandardMaterial({ color: new THREE.Color('#1d2b33'), roughness: 0.06, metalness: 0.1, normalMap: T[waterN], normalScale: new THREE.Vector2(0.35, 0.35) }),
      lotusPad: new THREE.MeshStandardMaterial({ color: new THREE.Color('#3f6b38'), roughness: 0.45, side: THREE.DoubleSide }),
      lotus: cutout(T[lotusT], { alphaTest: 0.3, roughness: 0.5, emissive: new THREE.Color('#2b1418'), emissiveIntensity: 0.3, emissiveMap: T[lotusT] }),
      hedgeCore: new THREE.MeshStandardMaterial({ color: new THREE.Color('#2d4a24'), roughness: 0.9 }),
      leaves: cutout(T[leavesT], { roughness: 0.55 }),
      araliya: cutout(T[araliyaT], { roughness: 0.6 }),
      frond: cutout(T[frondT], { roughness: 0.6 }),
      banana: cutout(T[bananaT], { roughness: 0.55 }),
      tuft: cutout(T[tuftT], { roughness: 0.9 }),
      polmal: cutout(T[polmalT], { roughness: 0.6, emissive: new THREE.Color('#3a3018'), emissiveIntensity: 0.3, emissiveMap: T[polmalT] }),
      treeline: cutout(T[treelineT], { alphaTest: 0.35, roughness: 1, fog: true }),
      cushion: new THREE.MeshStandardMaterial({ color: new THREE.Color('#f6eedf'), roughness: 0.8 }),
      plasterCarved: pbr({ normal: T[reliefN], orm: T[reliefO] }, { color: new THREE.Color('#f8f2e6'), metalness: 0, normalScale: 1.2 }),
      goldCarved: new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9b064'), metalness: 0.95, roughness: 0.34, normalMap: T[reliefN], aoMap: T[reliefO], normalScale: new THREE.Vector2(1.2, 1.2) }),
      sash: new THREE.MeshStandardMaterial({ color: blush.clone(), roughness: 0.7 }),
      flowers,
    };

    // Architecture materials tile at real-world scale: set repeat to 1 (UVs are in metres / size).
    return { m, T };
  }, [tex, gl, theme, lowTier]);
}

export type VenueMaterials = ReturnType<typeof useVenueMaterials>['m'];
