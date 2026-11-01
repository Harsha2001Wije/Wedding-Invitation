import { createContext, useContext } from 'react';

// Rendering quality tiers. The journey starts at a tier suited to the device
// and steps down automatically if frames take too long.
//
// high   – desktop: MSAA, ambient occlusion, soft shadows 2048, bloom
// medium – phones/tablets: half-res AO, shadows 1024, bloom, SMAA
// low    – weak devices: no post-processing or shadows, glow sprites instead

export type Tier = 'high' | 'medium' | 'low';

export interface QualitySettings {
  tier: Tier;
  dpr: number;
  shadows: boolean;
  shadowSize: number;
  post: boolean;
  ao: boolean;
  aoHalf: boolean;
  msaa: number;
  /** Fraction of decorative instances (flowers, grass) to keep. */
  density: number;
}

export function settingsFor(tier: Tier): QualitySettings {
  if (tier === 'high') return { tier, dpr: 1.75, shadows: true, shadowSize: 2048, post: true, ao: true, aoHalf: false, msaa: 4, density: 1 };
  if (tier === 'medium') return { tier, dpr: 1.5, shadows: true, shadowSize: 1024, post: true, ao: true, aoHalf: true, msaa: 0, density: 0.75 };
  return { tier, dpr: 1, shadows: false, shadowSize: 512, post: false, ao: false, aoHalf: true, msaa: 0, density: 0.5 };
}

export function initialTier(): Tier {
  if (typeof window === 'undefined') return 'medium';
  const forced = new URLSearchParams(location.search).get('quality') ?? location.hash.replace('#q-', '');
  if (forced === 'high' || forced === 'medium' || forced === 'low') return forced;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  const touch = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 760;
  if (cores <= 4 || mem <= 3) return 'low';
  if (touch || small) return 'medium';
  return 'high';
}

export const QualityCtx = createContext<QualitySettings>(settingsFor('medium'));
export const useQuality = () => useContext(QualityCtx);
