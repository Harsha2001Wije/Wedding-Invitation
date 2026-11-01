import type { AudioConfig } from '../config/types';

// Optional ambient music. Never starts by itself: only `start()` from a click.
// With `audio.src` set, a licensed file is looped. Otherwise a soft generated
// pad plays (an original, synthesised sound, so no music file is needed).

export interface Ambient {
  start(): Promise<boolean>;
  stop(): void;
  playing(): boolean;
  dispose(): void;
}

const CHORDS = [
  [196.0, 246.94, 293.66, 369.99], // Gmaj7
  [164.81, 220.0, 261.63, 329.63], // Am7 (E bass voicing)
  [130.81, 196.0, 246.94, 329.63], // Cmaj7
  [146.83, 220.0, 293.66, 369.99], // D6
];
const PENTA = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66];

export function createAmbient(cfg: AudioConfig): Ambient {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let el: HTMLAudioElement | null = null;
  let timers: number[] = [];
  let on = false;

  const onVisibility = () => {
    if (!on) return;
    if (document.hidden) {
      ctx?.suspend();
      el?.pause();
    } else {
      ctx?.resume();
      el?.play().catch(() => undefined);
    }
  };

  function note(freq: number, at: number, dur: number, gain: number, type: OscillatorType, cutoff: number) {
    if (!ctx || !master) return;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + Math.min(2.8, dur * 0.35));
    g.gain.linearRampToValueAtTime(0, at + dur);
    f.connect(g).connect(master);
    for (const det of [-4, 4]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = det;
      o.connect(f);
      o.start(at);
      o.stop(at + dur + 0.1);
    }
  }

  function schedule() {
    if (!ctx) return;
    let i = 0;
    const chord = () => {
      if (!ctx || !on) return;
      const t = ctx.currentTime + 0.05;
      CHORDS[i % CHORDS.length].forEach((f) => note(f, t, 9.5, 0.05, 'triangle', 900));
      i++;
      timers.push(window.setTimeout(chord, 8000));
    };
    const pluck = () => {
      if (!ctx || !on) return;
      const t = ctx.currentTime + 0.05;
      note(PENTA[Math.floor(Math.random() * PENTA.length)], t, 2.6, 0.025, 'sine', 2400);
      timers.push(window.setTimeout(pluck, 2200 + Math.random() * 3800));
    };
    chord();
    timers.push(window.setTimeout(pluck, 1800));
  }

  return {
    async start() {
      try {
        if (cfg.src) {
          el ??= Object.assign(new Audio(cfg.src), { loop: true, volume: cfg.volume });
          await el.play();
        } else {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ctx ??= new AC();
          await ctx.resume();
          master = ctx.createGain();
          master.gain.value = 0;
          master.gain.linearRampToValueAtTime(cfg.volume, ctx.currentTime + 2);
          const delay = ctx.createDelay();
          delay.delayTime.value = 0.42;
          const fb = ctx.createGain();
          fb.gain.value = 0.32;
          master.connect(ctx.destination);
          master.connect(delay).connect(fb).connect(delay);
          fb.connect(ctx.destination);
          on = true;
          schedule();
        }
        on = true;
        document.addEventListener('visibilitychange', onVisibility);
        return true;
      } catch {
        on = false;
        return false;
      }
    },
    stop() {
      on = false;
      timers.forEach(clearTimeout);
      timers = [];
      if (el) el.pause();
      if (ctx && master) {
        const m = master;
        m.gain.cancelScheduledValues(ctx.currentTime);
        m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
        m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        window.setTimeout(() => m.disconnect(), 700);
      }
      document.removeEventListener('visibilitychange', onVisibility);
    },
    playing: () => on,
    dispose() {
      this.stop();
      ctx?.close().catch(() => undefined);
      ctx = null;
    },
  };
}
