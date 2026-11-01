import type { SceneKind } from '../config/types';

// Camera "stations": where the camera rests while each scene's text is read.
// Separate framings for portrait phones and wide screens, so the Poruwa,
// doorway and lamp stay in view instead of being cropped.
//
// World layout (metres): garden path along +z → hall facade at z = 0 →
// main hall along −z with the Poruwa at z = −26 → reception room to the
// east (+x) through an arched opening → evening garden beyond x = 27.

export type V3 = [number, number, number];

export interface Framing {
  pos: V3;
  look: V3;
  fov: number;
  /** Shift of the image centre in NDC (−1…1), leaving room for the text. */
  shift: [number, number];
}

export interface Station {
  desktop: Framing;
  mobile: Framing;
  /** Waypoints travelled through on the way in (e.g. through the doorway). */
  via?: V3[];
  /** Portion of the scene's scroll used for camera travel; the rest is reading time. */
  travel: number;
  /** Text colour treatment for this scene's backdrop. */
  tone: 'light' | 'dark';
}

const D = (pos: V3, look: V3, shift: [number, number] = [0.34, 0], fov = 44): Framing => ({ pos, look, fov, shift });
const M = (pos: V3, look: V3, shift: [number, number] = [0, 0.3], fov = 60): Framing => ({ pos, look, fov, shift });

export const STATIONS: Record<SceneKind, Station> = {
  envelope: {
    desktop: D([0, 2.3, 41], [0, 2.7, 0], [0, 0.04]),
    mobile: M([0, 2.4, 42], [0, 3.0, 0], [0, 0.12]),
    travel: 0.55,
    tone: 'dark',
  },
  arrival: {
    desktop: D([0, 2.5, 19], [0, 4.4, 0], [0.3, 0.02]),
    mobile: M([0, 2.5, 19.5], [0, 4.6, 0], [0, 0.22]),
    via: [[0, 2.1, 28]],
    travel: 0.4,
    tone: 'dark',
  },
  hall: {
    desktop: D([0, 1.9, -5.5], [0, 2.3, -26], [0.3, 0.02]),
    mobile: M([0, 2.0, -4.5], [0, 2.5, -26], [0, 0.26]),
    via: [[0, 1.85, 9], [0, 1.75, 2.6], [0, 1.8, -1.5]],
    travel: 0.5,
    tone: 'dark',
  },
  poruwa: {
    desktop: D([-0.6, 2.05, -17.2], [0.4, 1.95, -26], [0.36, 0]),
    mobile: M([0, 2.2, -15.8], [0, 2.35, -26], [0, 0.27]),
    travel: 0.36,
    tone: 'dark',
  },
  oilLamp: {
    desktop: D([1.0, 1.55, -18.6], [3.9, 1.25, -21.6], [0.38, 0], 40),
    mobile: M([1.9, 1.7, -18.3], [3.85, 1.5, -21.7], [0, 0.3], 56),
    via: [[0.6, 1.8, -17.6]],
    travel: 0.38,
    tone: 'dark',
  },
  reception: {
    desktop: D([9.6, 2.5, -19.5], [18.5, 1.0, -11], [0.3, 0]),
    mobile: M([9.6, 2.7, -18.5], [18, 1.3, -11], [0, 0.28]),
    via: [[2.6, 2.0, -15.8], [6.8, 2.2, -15.4]],
    travel: 0.42,
    tone: 'dark',
  },
  meal: {
    desktop: D([11.2, 2.6, -22.6], [19.5, 0.9, -26.6], [0.32, 0]),
    mobile: M([11.6, 2.7, -23.4], [19, 0.9, -26.8], [0, 0.28]),
    travel: 0.38,
    tone: 'dark',
  },
  closing: {
    desktop: D([30.2, 1.8, -13.5], [39, 2.6, -13.5], [0.3, 0.02]),
    mobile: M([29.4, 1.9, -13.5], [39, 3.4, -13.5], [0, 0.26]),
    via: [[19, 2.1, -18], [23.5, 2.05, -13.4], [27.2, 1.85, -13.5]],
    travel: 0.45,
    tone: 'light',
  },
};

export const isPortrait = (w: number, h: number) => w / h < 0.9;
