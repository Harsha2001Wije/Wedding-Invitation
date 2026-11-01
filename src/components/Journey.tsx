import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clamp01, measureSections, onActiveChange, ramp, readingPoint, scrollState, smooth, updateScroll } from '../lib/scroll';
import { STATIONS } from '../lib/stations';
import { useInvite } from './context';
import { Envelope } from './Envelope';
import { SceneBody } from './Scenes';

// The 3D world is a separate chunk so the envelope (and every invitation
// detail on it) appears before Three.js has even downloaded.
const World = lazy(() => import('../three/World'));

class WorldBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('3D journey stopped, showing the full invitation instead:', error);
    (window as unknown as { __journeyError?: string }).__journeyError = String(error);
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function Journey({ onFail, registerJump, onActive }: { onFail: () => void; registerJump: (fn: (i: number) => void) => void; onActive: (i: number) => void }) {
  const { cfg, lang, model } = useInvite();
  const scenes = model.scenes;
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const envRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const clockDigitsRef = useRef<HTMLSpanElement>(null);
  const clockPeriodRef = useRef<HTMLSpanElement>(null);
  const lastLandedEventRef = useRef<string | null>(null);
  const [worldReady, setWorldReady] = useState(false);
  const [tone, setTone] = useState<'light' | 'dark'>(STATIONS[scenes[0]?.kind ?? 'envelope'].tone);

  const timedEvents = useMemo(() => {
    return scenes
      .map((scene, index) => {
        if (!scene.event || !scene.event.time) return null;
        const [h, m] = scene.event.time.split(':').map(Number);
        return {
          index,
          scene,
          event: scene.event,
          minutes: h * 60 + m,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [scenes]);

  const apply = useCallback(() => {
    updateScroll();
    const y = scrollState.y;
    let veil = 0;
    scenes.forEach((scene, i) => {
      const box = scrollState.sections[i];
      const el = contentRefs.current[i];
      if (!box) return;
      const local = (y - box.top) / box.span;
      const last = i === scenes.length - 1;
      if (scene.kind === 'envelope') {
        const env = envRef.current;
        if (!env) return;
        const t = Math.max(0, local);
        const set = (k: string, v: number) => env.style.setProperty(k, v.toFixed(4));
        set('--copy', 1 - ramp(t, 0.04, 0.2));
        set('--seal', smooth(ramp(t, 0.02, 0.14)));
        set('--flap', smooth(ramp(t, 0.04, 0.26)));
        set('--rise', smooth(ramp(t, 0.24, 0.48)));
        const z = ramp(t, 0.46, 0.84);
        set('--zoom', z * z);
        set('--stage', 1 - smooth(ramp(t, 0.52, 0.8)));
        set('--card', 1 - smooth(ramp(t, 0.66, 0.9)));
        env.classList.toggle('is-out', t >= 0.18);
        env.classList.toggle('is-rising', t >= 0.42);
        env.style.visibility = t > 0.95 ? 'hidden' : 'visible';
        return;
      }
      if (!el) return;
      const travel = i === 0 ? 0 : STATIONS[scene.kind].travel;
      let o = 0;
      let dy = 0;
      if (local > -0.02 && (local <= 1 || last)) {
        const fin = ramp(local, travel - 0.1, travel + 0.02);
        const fout = last ? 1 : 1 - ramp(local, 0.9, 0.995);
        o = Math.min(fin, fout);
        dy = (1 - smooth(fin)) * 16 - (1 - fout) * 10;
      }
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0)`;
      const hidden = o < 0.02;
      if (el.dataset.hidden !== String(hidden)) {
        el.dataset.hidden = String(hidden);
        el.style.visibility = hidden ? 'hidden' : 'visible';
        if (hidden) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
      }
      veil = Math.max(veil, o);
    });
    if (veilRef.current) veilRef.current.style.opacity = veil.toFixed(3);
    if (lineRef.current) lineRef.current.style.transform = `scaleX(${scrollState.global.toFixed(4)})`;

    // Steady, continuous fast-forward event clock displayed above the text box
    const N = timedEvents.length;
    const clockEl = clockRef.current;
    if (clockEl) {
      if (N === 0) {
        clockEl.style.opacity = '0';
        clockEl.style.visibility = 'hidden';
      } else {
        const points = timedEvents.map((t) => {
          const travel = t.index === 0 ? 0 : (STATIONS[t.scene.kind]?.travel ?? 0.35);
          return readingPoint(t.index, travel);
        });

        const firstIdx = timedEvents[0].index;
        const lastIdx = timedEvents[N - 1].index;
        const firstBox = scrollState.sections[firstIdx];
        const lastBox = scrollState.sections[lastIdx];

        // Never display in Hall or earlier scenes - only fade in after Poruwa begins
        const yFadeInStart = firstBox ? firstBox.top + firstBox.span * 0.12 : points[0] - 200;
        const yFirst = points[0];
        const yLast = points[N - 1];
        const yFadeOutStart = lastBox ? lastBox.top + lastBox.span * 0.82 : yLast + 50;
        const yFadeOutEnd = lastBox ? lastBox.top + lastBox.span * 0.98 : yLast + 350;

        if (y < yFadeInStart || y > yFadeOutEnd) {
          clockEl.style.opacity = '0';
          clockEl.style.visibility = 'hidden';
        } else {
          let clockOpacity = 1;
          let targetMinutes = timedEvents[0].minutes;
          let isFastForwarding = false;

          if (y < yFirst) {
            clockOpacity = ramp(y, yFadeInStart, yFirst);
            targetMinutes = timedEvents[0].minutes;
          } else if (y > yFadeOutStart) {
            clockOpacity = 1 - ramp(y, yFadeOutStart, yFadeOutEnd);
            targetMinutes = timedEvents[N - 1].minutes;
          } else {
            clockOpacity = 1;
            let k = 0;
            for (let idx = 0; idx < N - 1; idx++) {
              if (y >= points[idx]) k = idx;
            }
            const p0 = points[k];
            const p1 = points[k + 1];
            const span = Math.max(1, p1 - p0);
            const progress = clamp01((y - p0) / span);

            let u = 0;
            if (progress <= 0.16) {
              u = 0;
            } else if (progress >= 0.84) {
              u = 1;
            } else {
              u = (progress - 0.16) / 0.68;
              isFastForwarding = true;
            }

            const m0 = timedEvents[k].minutes;
            const m1 = timedEvents[k + 1].minutes;
            targetMinutes = Math.round(m0 + u * (m1 - m0));
          }

          clockEl.style.opacity = clockOpacity.toFixed(3);
          clockEl.style.visibility = clockOpacity > 0.02 ? 'visible' : 'hidden';
          clockEl.classList.toggle('is-ticking', isFastForwarding);

          // ── Event Landing Effect ──────────────────────────────────────
          // Determine which event the clock is currently "resting" on
          let currentRestEventId: string | null = null;
          if (!isFastForwarding) {
            if (y < yFirst) {
              currentRestEventId = timedEvents[0].event.id;
            } else if (y > yFadeOutStart) {
              currentRestEventId = timedEvents[N - 1].event.id;
            } else {
              let k2 = 0;
              for (let idx = 0; idx < N - 1; idx++) {
                if (y >= points[idx]) k2 = idx;
              }
              const pp0 = points[k2];
              const pp1 = points[k2 + 1];
              const prog2 = clamp01((y - pp0) / Math.max(1, pp1 - pp0));
              currentRestEventId = prog2 < 0.5 ? timedEvents[k2].event.id : timedEvents[k2 + 1].event.id;
            }
          }

          if (currentRestEventId && currentRestEventId !== lastLandedEventRef.current) {
            // Just landed on a new event — trigger the gold landing bloom on the clock digits
            lastLandedEventRef.current = currentRestEventId;
            clockEl.classList.remove('is-landed');
            void clockEl.offsetHeight; // force reflow
            clockEl.classList.add('is-landed');
          } else if (!currentRestEventId) {
            // Fast-forwarding — clear landing
            lastLandedEventRef.current = null;
            clockEl.classList.remove('is-landed');
          }
          // ─────────────────────────────────────────────────────────────

          const totalM = (targetMinutes % 1440 + 1440) % 1440;
          const h24 = Math.floor(totalM / 60);
          const mins = totalM % 60;
          const am = h24 < 12;
          const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
          const clockStr = `${h12}:${String(mins).padStart(2, '0')}`;
          const periodStr = lang === 'si' ? (am ? 'පෙ.ව.' : 'ප.ව.') : (am ? 'AM' : 'PM');

          if (clockDigitsRef.current) clockDigitsRef.current.textContent = clockStr;
          if (clockPeriodRef.current) clockPeriodRef.current.textContent = periodStr;
        }
      }
    }
  }, [scenes, timedEvents, lang]);

  // Measure on mount, resize and font load; recompute everything.
  useLayoutEffect(() => {
    const measure = () => {
      measureSections(sectionRefs.current.filter(Boolean) as HTMLElement[]);
      apply();
    };
    measure();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [apply]);

  useEffect(
    () =>
      onActiveChange((i) => {
        onActive(i);
        setTone(STATIONS[scenes[i]?.kind ?? 'envelope'].tone);
      }),
    [onActive, scenes],
  );

  useEffect(() => {
    registerJump((index) => {
      const scene = scenes[index];
      if (!scene) return;
      const travel = index === 0 ? 0 : STATIONS[scene.kind].travel;
      const top = scene.kind === 'envelope' ? 0 : readingPoint(index, travel);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const go = () => {
        scrollState.snap = true;
        window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
        apply();
        const h = document.getElementById(`${scene.domId}-h`);
        if (h) {
          h.setAttribute('tabindex', '-1');
          h.focus({ preventScroll: true });
        }
      };
      const fade = fadeRef.current;
      if (!fade || reduce) return go();
      fade.classList.add('is-on');
      window.setTimeout(() => {
        go();
        window.setTimeout(() => fade.classList.remove('is-on'), 60);
      }, 220);
    });
  }, [registerJump, scenes, apply]);

  return (
    <div className={`journey tone-${tone}`}>
      <WorldBoundary onFail={onFail}>
        <Suspense fallback={null}>
          <div className={`world${worldReady ? ' is-ready' : ''}`}>
            <World scenes={scenes} theme={cfg.theme} flags={model.flags} onReady={() => setWorldReady(true)} onFail={onFail} />
          </div>
        </Suspense>
      </WorldBoundary>
      {/* Painted backdrop shown until the 3D world is ready (and if it never is). */}
      <div className={`world-fallback${worldReady ? ' is-hidden' : ''}`} aria-hidden="true" />
      <div className="veil" ref={veilRef} aria-hidden="true" />
      <div className="progress-line" aria-hidden="true"><div ref={lineRef} /></div>
      <div className="jump-fade" ref={fadeRef} aria-hidden="true" />

      {/* Steady Fast-Forwarding Event Clock positioned above the text box */}
      <div className="journey-clock-stage" ref={clockRef} aria-hidden="true" style={{ opacity: 0, visibility: 'hidden' }}>
        <div className="journey-clock-content">
          <p className="ev-time">
            {lang === 'si' && <span className="ev-period" ref={clockPeriodRef}>පෙ.ව.</span>}
            <span className="ev-clock" ref={clockDigitsRef}>09:41</span>
            {lang !== 'si' && <span className="ev-period" ref={clockPeriodRef}>AM</span>}
          </p>
        </div>
      </div>

      <main className="scenes">
        {scenes.map((scene, i) => (
          <section
            key={scene.key}
            id={scene.domId}
            ref={(el) => (sectionRefs.current[i] = el)}
            className={`scene scene--${scene.kind}`}
            style={{ height: `calc(${scene.length} * 100svh)` }}
            aria-labelledby={scene.kind === 'envelope' ? undefined : `${scene.domId}-h`}
          >
            {scene.kind === 'envelope' ? (
              <Envelope ref={envRef} />
            ) : (
              <div className={`scene-content scene-content--${scene.kind}`} ref={(el) => (contentRefs.current[i] = el)}>
                <div className="scene-inner">
                  <SceneBody scene={scene} />
                </div>
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
