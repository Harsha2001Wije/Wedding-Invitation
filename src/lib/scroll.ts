// A tiny scroll store shared by the DOM overlay and the 3D camera.
// It avoids React re-renders on every scroll frame: readers pull values
// in their own animation loop, and only the active scene index is pushed
// to React (for the progress indicator).

export interface SectionBox {
  top: number;
  height: number;
  /** Scroll distance over which local progress runs 0 → 1. */
  span: number;
}

export const scrollState = {
  y: 0,
  vh: 1,
  vw: 1,
  sections: [] as SectionBox[],
  active: 0,
  /** 0 → 1 progress through the active section. */
  local: 0,
  /** Set after a jump so the camera snaps instead of flying across the venue. */
  snap: false,
  /** Global progress 0 → 1 for the thin progress line. */
  global: 0,
};

type Listener = (active: number) => void;
const listeners = new Set<Listener>();

export function onActiveChange(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function measureSections(els: HTMLElement[]) {
  const vh = window.innerHeight;
  const y = window.scrollY;
  scrollState.vh = vh;
  scrollState.vw = window.innerWidth;
  scrollState.sections = els.map((el, i) => {
    const r = el.getBoundingClientRect();
    const top = r.top + y;
    const height = r.height;
    // The last section can only scroll until its bottom meets the viewport bottom.
    const span = i === els.length - 1 ? Math.max(1, height - vh) : height;
    return { top, height, span };
  });
  updateScroll();
}

export function updateScroll() {
  const y = window.scrollY;
  scrollState.y = y;
  const s = scrollState.sections;
  if (!s.length) return;
  let i = 0;
  for (let k = 0; k < s.length; k++) if (y >= s[k].top - 1) i = k;
  const box = s[i];
  scrollState.local = Math.min(1, Math.max(0, (y - box.top) / box.span));
  const max = Math.max(1, document.documentElement.scrollHeight - scrollState.vh);
  scrollState.global = Math.min(1, Math.max(0, y / max));
  if (i !== scrollState.active) {
    scrollState.active = i;
    listeners.forEach((fn) => fn(i));
  }
}

/** Scroll position where a scene's text is fully settled and readable. */
export function readingPoint(index: number, travel: number) {
  const box = scrollState.sections[index];
  if (!box) return 0;
  return Math.round(box.top + box.span * Math.min(0.92, travel + 0.08));
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const smooth = (v: number) => v * v * (3 - 2 * v);
export const smoother = (v: number) => v * v * v * (v * (v * 6 - 15) + 10);
