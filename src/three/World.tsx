import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import hallExr from '@pmndrs/assets/hdri/hall.exr';
import type { ThemeConfig } from '../config/types';
import type { ResolvedScene } from '../lib/model';
import { scrollState, clamp01, smoother } from '../lib/scroll';
import { STATIONS, isPortrait, type Framing } from '../lib/stations';
import { Garden } from './Garden';
import { Hall } from './Hall';
import { Reception } from './Reception';
import { useVenueMaterials } from './materials';
import { QualityCtx, initialTier, settingsFor, type QualitySettings, type Tier } from './quality';

export interface WorldProps {
  scenes: ResolvedScene[];
  theme: ThemeConfig;
  flags: { cake: boolean; firstDance: boolean; meal: 'lunch' | 'dinner' };
  onReady?: () => void;
  onFail?: () => void;
}

// ─── camera path ────────────────────────────────────────────────────────────
const v = (a: [number, number, number]) => new THREE.Vector3(...a);
const DRIFT: Record<string, number> = { envelope: 3.2, default: 0.5 };
const driftOf = (kind: string) => DRIFT[kind] ?? DRIFT.default;

interface Leg {
  curve: THREE.Curve<THREE.Vector3>;
  lookFrom: THREE.Vector3;
  lookTo: THREE.Vector3;
  from: Framing;
  to: Framing;
  travel: number;
  drift: number;
  dir: THREE.Vector3;
}

/** One camera leg per scene: previous resting point → (via) → this station. */
function buildLegs(scenes: ResolvedScene[], portrait: boolean): Leg[] {
  return scenes.map((scene, i) => {
    const st = STATIONS[scene.kind];
    const to = portrait ? st.mobile : st.desktop;
    const prevScene = scenes[i - 1];
    const prevSt = prevScene ? STATIONS[prevScene.kind] : null;
    const from = prevSt ? (portrait ? prevSt.mobile : prevSt.desktop) : to;
    const dir = v(to.look).sub(v(to.pos)).normalize();
    const prevDir = v(from.look).sub(v(from.pos)).normalize();
    const start = v(from.pos).addScaledVector(prevDir, prevScene ? driftOf(prevScene.kind) : 0);
    const pts = prevSt ? [start, ...(st.via ?? []).map(v), v(to.pos)] : [v(to.pos), v(to.pos).addScaledVector(dir, 0.001)];
    const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5) : new THREE.LineCurve3(pts[0], pts[1]);
    return { curve, lookFrom: v(from.look), lookTo: v(to.look), from, to, travel: prevSt ? st.travel : 0, drift: driftOf(scene.kind), dir };
  });
}

function CameraRig({ scenes }: { scenes: ResolvedScene[] }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const portrait = isPortrait(size.width, size.height);
  const legs = useMemo(() => buildLegs(scenes, portrait), [scenes, portrait]);
  const target = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 45, sx: 0, sy: 0 });
  const current = useRef({ look: new THREE.Vector3(), fov: 45, sx: 0, sy: 0, init: false });

  useFrame((_, dt) => {
    const i = Math.min(scrollState.active, legs.length - 1);
    const leg = legs[i];
    if (!leg) return;
    const t = scrollState.local;
    const u = leg.travel > 0 ? smoother(clamp01(t / leg.travel)) : 1;
    const hold = leg.travel < 1 ? clamp01((t - leg.travel) / (1 - leg.travel)) : 0;
    const T = target.current;
    T.pos.copy(leg.curve.getPointAt(u)).addScaledVector(leg.dir, leg.drift * smoother(hold));
    T.look.lerpVectors(leg.lookFrom, leg.lookTo, smoother(clamp01(u * 1.15)));
    T.fov = THREE.MathUtils.lerp(leg.from.fov, leg.to.fov, u);
    T.sx = THREE.MathUtils.lerp(leg.from.shift[0], leg.to.shift[0], u);
    T.sy = THREE.MathUtils.lerp(leg.from.shift[1], leg.to.shift[1], u);

    const C = current.current;
    const snap = scrollState.snap || !C.init;
    const k = snap ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 6.5);
    cam.position.lerp(T.pos, k);
    C.look.lerp(T.look, k);
    C.fov += (T.fov - C.fov) * k;
    C.sx += (T.sx - C.sx) * k;
    C.sy += (T.sy - C.sy) * k;
    C.init = true;
    scrollState.snap = false;

    cam.lookAt(C.look);
    cam.fov = C.fov;
    cam.updateProjectionMatrix();
    // Off-centre frustum: the focal point sits beside the text on desktop
    // and above it on phones.
    const e = cam.projectionMatrix.elements;
    e[8] = -C.sx;
    e[9] = -C.sy;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  });
  return null;
}

// ─── light, sky and atmosphere ──────────────────────────────────────────────
type Zone = 'day' | 'indoor' | 'dusk';
const SKY = {
  day: { turbidity: 4.5, rayleigh: 1.4, mie: 0.004, g: 0.8, elevation: 32, azimuth: 28 },
  dusk: { turbidity: 7, rayleigh: 2.6, mie: 0.007, g: 0.88, elevation: 2.2, azimuth: 88 },
};

function sunDir(elevation: number, azimuth: number) {
  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

function makeSky(p: typeof SKY.day) {
  const sky = new Sky();
  sky.scale.setScalar(380);
  const u = sky.material.uniforms;
  u.turbidity.value = p.turbidity;
  u.rayleigh.value = p.rayleigh;
  u.mieCoefficient.value = p.mie;
  u.mieDirectionalG.value = p.g;
  u.sunPosition.value.copy(sunDir(p.elevation, p.azimuth));
  return sky;
}

function zoneOf(p: THREE.Vector3): Zone {
  if (p.x > 27.4) return 'dusk';
  if (p.z < 0.4) return 'indoor';
  return 'day';
}

/**
 * Decodes the embedded interior HDRI in memory. No network request is made,
 * so it works under strict content-security policies. Returns null on failure.
 */
function decodeHallHdri(): THREE.DataTexture | null {
  try {
    const b64 = (hallExr as string).split(',')[1];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const parsed = new EXRLoader().parse(bytes.buffer) as { data: Float32Array | Uint16Array; width: number; height: number; format: THREE.PixelFormat; type: THREE.TextureDataType };
    const tex = new THREE.DataTexture(parsed.data, parsed.width, parsed.height, parsed.format, parsed.type);
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  } catch (e) {
    console.warn('Interior lighting map unavailable; using a neutral room instead.', e);
    return null;
  }
}

function Atmosphere({ q }: { q: QualitySettings }) {
  const { scene, camera, gl } = useThree();
  const hall = useMemo(decodeHallHdri, []);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const zoneRef = useRef<Zone | null>(null);
  const blend = useRef(0); // 0 = day light, 1 = dusk light

  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const daySky = makeSky(SKY.day);
    const duskSky = makeSky(SKY.dusk);
    const s1 = new THREE.Scene();
    s1.add(daySky);
    const s2 = new THREE.Scene();
    s2.add(duskSky);
    let indoor: THREE.Texture;
    try {
      if (!hall) throw new Error('no hdri');
      hall.mapping = THREE.EquirectangularReflectionMapping;
      indoor = pm.fromEquirectangular(hall).texture;
    } catch {
      indoor = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    }
    const out = {
      day: pm.fromScene(s1, 0, 0.1, 1000).texture,
      dusk: pm.fromScene(s2, 0, 0.1, 1000).texture,
      indoor,
    };
    pm.dispose();
    return out;
  }, [gl, hall]);

  const sky = useMemo(() => makeSky(SKY.day), []);
  const fog = useMemo(() => new THREE.Fog(new THREE.Color('#cfd8d6'), 40, 190), []);
  const dayDir = useMemo(() => sunDir(SKY.day.elevation, SKY.day.azimuth), []);
  const duskDir = useMemo(() => sunDir(SKY.dusk.elevation + 6, SKY.dusk.azimuth), []);

  useEffect(() => {
    // Shadow camera bounds were set via props; the projection must be rebuilt.
    sun.current?.shadow.camera.updateProjectionMatrix();
    if (sun.current) scene.add(sun.current.target);
    scene.fog = fog;
    scene.add(sky);
    return () => {
      scene.remove(sky);
      scene.fog = null;
      Object.values(env).forEach((t) => t.dispose());
    };
  }, [scene, sky, fog, env]);

  const tmp = useMemo(() => ({ target: new THREE.Vector3(), fwd: new THREE.Vector3(), dir: new THREE.Vector3() }), []);

  useFrame((_, dt) => {
    const p = camera.position;
    const zone = zoneOf(p);
    if (zone !== zoneRef.current) {
      zoneRef.current = zone;
      scene.environment = env[zone];
      scene.environmentIntensity = zone === 'day' ? 0.6 : zone === 'indoor' ? 0.7 : 0.4;
    }
    // Ease the outdoor light from morning to dusk as the camera nears the evening garden.
    const want = clamp01((p.x - 20) / 8);
    blend.current += (want - blend.current) * (1 - Math.exp(-dt * 3));
    const b = blend.current;
    const u = sky.material.uniforms;
    u.turbidity.value = THREE.MathUtils.lerp(SKY.day.turbidity, SKY.dusk.turbidity, b);
    u.rayleigh.value = THREE.MathUtils.lerp(SKY.day.rayleigh, SKY.dusk.rayleigh, b);
    u.mieCoefficient.value = THREE.MathUtils.lerp(SKY.day.mie, SKY.dusk.mie, b);
    u.mieDirectionalG.value = THREE.MathUtils.lerp(SKY.day.g, SKY.dusk.g, b);
    u.sunPosition.value.copy(sunDir(THREE.MathUtils.lerp(SKY.day.elevation, SKY.dusk.elevation, b), THREE.MathUtils.lerp(SKY.day.azimuth, SKY.dusk.azimuth, b)));

    const indoor = zone === 'indoor' ? 1 : 0;
    fog.color.set('#cfd8d6').lerp(new THREE.Color('#e8dcc6'), indoor).lerp(new THREE.Color('#4a4a63'), b);
    fog.near = indoor ? 30 : THREE.MathUtils.lerp(40, 20, b);
    fog.far = indoor ? 120 : THREE.MathUtils.lerp(190, 110, b);

    if (hemi.current) {
      hemi.current.intensity = THREE.MathUtils.lerp(0.35, 0.1, b) * (indoor ? 0.45 : 1);
      hemi.current.color.set('#e6efff').lerp(new THREE.Color('#7c7fae'), b);
      hemi.current.groundColor.set('#6d6a4c').lerp(new THREE.Color('#2a2f2a'), b);
    }
    const s = sun.current;
    if (s) {
      tmp.dir.copy(dayDir).lerp(duskDir, b).normalize();
      s.intensity = THREE.MathUtils.lerp(2.4, 0.5, b);
      s.color.set('#fff1dc').lerp(new THREE.Color('#ff9d6b'), b);
      // Shadow frustum follows the camera's view, snapped to texels to avoid shimmer.
      camera.getWorldDirection(tmp.fwd);
      tmp.fwd.y = 0;
      tmp.fwd.normalize();
      tmp.target.copy(p).addScaledVector(tmp.fwd, 9);
      tmp.target.y = 0;
      const texel = 32 / q.shadowSize;
      tmp.target.x = Math.round(tmp.target.x / texel) * texel;
      tmp.target.z = Math.round(tmp.target.z / texel) * texel;
      s.target.position.copy(tmp.target);
      s.position.copy(tmp.target).addScaledVector(tmp.dir, 45);
      s.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#e6efff', '#6d6a4c', 0.55]} />
      <directionalLight
        ref={sun}
        intensity={3.2}
        color="#fff1dc"
        castShadow={q.shadows}
        shadow-mapSize-width={q.shadowSize}
        shadow-mapSize-height={q.shadowSize}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-radius={4}
      />
    </>
  );
}

class EffectsBoundary extends Component<{ onEffectsFail?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('Post-processing effects unavailable; falling back to clean direct render mode.', err);
    this.props.onEffectsFail?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Effects({ q }: { q: QualitySettings }) {
  if (!q.post) return null;
  const fx = [
    ...(q.ao ? [<N8AO key="ao" aoRadius={1.1} distanceFalloff={0.7} intensity={2.4} halfRes={q.aoHalf} quality={q.aoHalf ? 'performance' : 'medium'} />] : []),
    <Bloom key="bloom" mipmapBlur intensity={0.7} luminanceThreshold={2.6} luminanceSmoothing={0.4} />,
    ...(q.msaa === 0 ? [<SMAA key="smaa" />] : []),
    <ToneMapping key="tm" mode={ToneMappingMode.NEUTRAL} />,
    <Vignette key="vig" offset={0.28} darkness={0.42} />,
  ];
  return (
    <EffectComposer multisampling={q.msaa > 0 ? q.msaa : 0}>
      {fx}
    </EffectComposer>
  );
}

/** Pauses rendering while the tab is hidden or the envelope fully covers the scene. */
function FrameGovernor({ hasEnvelope }: { hasEnvelope: boolean }) {
  const { setFrameloop, invalidate } = useThree();
  useEffect(() => {
    let mode: 'always' | 'demand' | 'never' = 'always';
    let timer = 0;
    const apply = () => {
      const covered = hasEnvelope && scrollState.active === 0 && scrollState.local < 0.3;
      const next = document.hidden ? 'never' : covered ? 'demand' : 'always';
      if (next !== mode) {
        mode = next;
        setFrameloop(next);
        invalidate();
      }
    };
    const loop = () => {
      apply();
      timer = window.setTimeout(loop, 250);
    };
    loop();
    document.addEventListener('visibilitychange', apply);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', apply);
    };
  }, [hasEnvelope, setFrameloop, invalidate]);
  return null;
}

/** Steps quality down once if frames are consistently slow. */
function PerfWatch({ onSlow, enabled }: { onSlow: () => void; enabled: boolean }) {
  const samples = useRef<number[]>([]);
  const done = useRef(false);
  useFrame((_, dt) => {
    if (!enabled || done.current || document.hidden) return;
    if (scrollState.active === 0 && scrollState.local < 0.3) return; // envelope still covering
    samples.current.push(dt);
    if (samples.current.length < 120) return;
    const sorted = [...samples.current.slice(30)].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    done.current = true;
    if (median > 1 / 26) onSlow();
  });
  return null;
}

function Ready({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      requestAnimationFrame(() => onReady?.());
    }
  });
  return null;
}

function Venue({ theme, flags, q }: { theme: ThemeConfig; flags: WorldProps['flags']; q: QualitySettings }) {
  const { m } = useVenueMaterials(theme, q.tier === 'low');
  return (
    <>
      <Garden mats={m} />
      <Hall mats={m} />
      <Reception mats={m} cake={flags.cake} danceFloor={flags.firstDance} dinner={flags.meal === 'dinner'} />
    </>
  );
}

export default function World({ scenes, theme, flags, onReady, onFail }: WorldProps) {
  const forced = typeof location !== 'undefined' && /quality=|#q-/.test(location.search + location.hash);
  const [tier, setTier] = useState<Tier>(initialTier);
  const q = useMemo(() => settingsFor(tier), [tier]);
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, q.dpr);
  const step = () => setTier((t) => (t === 'high' ? 'medium' : 'low'));

  return (
    <QualityCtx.Provider value={q}>
      <Canvas
        key={tier}
        className="world-canvas"
        dpr={dpr}
        shadows={q.shadows ? 'soft' : false}
        camera={{ fov: 45, near: 0.08, far: 420, position: [0, 2.3, 41] }}
        gl={{ antialias: !q.post, powerPreference: 'high-performance', alpha: false, stencil: false }}
        onCreated={({ gl, scene, camera }) => {
          gl.toneMapping = q.post ? THREE.NoToneMapping : THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          if (location.hash.includes('debug')) Object.assign(window, { __three: { gl, scene, camera, tier }, __scroll: scrollState });
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            onFail?.();
          });
        }}
        aria-hidden
      >
        <CameraRig scenes={scenes} />
        <FrameGovernor hasEnvelope={scenes[0]?.kind === 'envelope'} />
        <PerfWatch onSlow={step} enabled={!forced && tier !== 'low'} />
        <Suspense fallback={null}>
          <Atmosphere q={q} />
          <Venue theme={theme} flags={flags} q={q} />
          <EffectsBoundary onEffectsFail={() => setTier('low')}>
            <Effects q={q} />
          </EffectsBoundary>
          <Ready onReady={onReady} />
        </Suspense>
      </Canvas>
    </QualityCtx.Provider>
  );
}
