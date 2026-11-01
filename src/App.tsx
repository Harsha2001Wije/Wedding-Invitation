import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invitation } from './config/invitation';
import type { InvitationConfig, L10n, Lang } from './config/types';
import { loadStoredConfig, resetStoredConfig, saveStoredConfig } from './lib/configStorage';
import { createAmbient, type Ambient } from './lib/audio';
import { readGuest } from './lib/guest';
import { buildModel } from './lib/model';
import { STRINGS } from './lib/strings';
import { Ctx, type InviteCtx } from './components/context';
import { AgendaSheet, ProgressRail, TopBar } from './components/Chrome';
import { DetailsView } from './components/DetailsView';
import { EditPanel } from './components/EditPanel';
import { Journey } from './components/Journey';
import { RsvpDialog } from './components/RsvpDialog';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const prefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function storedLang(): Lang | null {
  try {
    const v = localStorage.getItem('wedding-lang');
    return v === 'en' || v === 'si' ? v : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [cfg, setCfg] = useState<InvitationConfig>(() => loadStoredConfig(invitation));
  const [editOpen, setEditOpen] = useState(false);
  const guest = useMemo(() => readGuest(), []);
  const model = useMemo(() => buildModel(cfg, guest), [cfg, guest]);
  const webgl = useMemo(hasWebGL, []);
  const [lang, setLang] = useState<Lang>(() => storedLang() ?? cfg.languages.default);
  const [journeyBroken, setJourneyBroken] = useState(false);
  const [mode, setMode] = useState<'journey' | 'details'>(() =>
    !webgl || location.hash === '#details' ? 'details' : 'journey',
  );
  const [userChoseJourney, setUserChoseJourney] = useState(false);
  const [active, setActive] = useState(0);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [rsvp, setRsvp] = useState<{ open: boolean; focus: 'dietary' | null }>({ open: location.hash === '#rsvp', focus: null });
  const [musicOn, setMusicOn] = useState(false);
  const ambient = useRef<Ambient | null>(null);
  const jumpFn = useRef<(i: number) => void>(() => undefined);

  const updateConfig = useCallback((newCfg: InvitationConfig) => {
    saveStoredConfig(newCfg);
    setCfg(newCfg);
  }, []);

  const resetConfig = useCallback(() => {
    resetStoredConfig();
    setCfg(invitation);
  }, []);

  // Theme from config → CSS custom properties.
  useEffect(() => {
    const r = document.documentElement.style;
    const t = cfg.theme;
    r.setProperty('--ivory', t.ivory);
    r.setProperty('--pearl', t.pearl);
    r.setProperty('--gold', t.gold);
    r.setProperty('--gold-deep', t.goldDeep);
    r.setProperty('--green', t.green);
    r.setProperty('--blush', t.blush);
    r.setProperty('--ink', t.ink);
  }, [cfg.theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${cfg.couple.bride[lang]} & ${cfg.couple.groom[lang]}`;
    try {
      localStorage.setItem('wedding-lang', lang);
    } catch {
      /* ignore */
    }
  }, [lang, cfg.couple]);

  useEffect(() => () => ambient.current?.dispose(), []);

  const s = STRINGS[lang];
  const l = useCallback((v: L10n | null | undefined) => (v ? v[lang] || v.en : ''), [lang]);

  const showDetails = useCallback(() => {
    setMode('details');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const ctx: InviteCtx = useMemo(
    () => ({
      cfg,
      lang,
      s,
      l,
      model,
      guest,
      openRsvp: (focus) => setRsvp({ open: true, focus: focus ?? null }),
      openAgenda: () => setAgendaOpen(true),
      openEdit: () => setEditOpen(true),
      updateConfig,
      resetConfig,
      jumpToScene: (i) => jumpFn.current(i),
      jumpToEvent: (id) => {
        const scene = model.sceneForEvent(id);
        const i = scene ? model.scenes.indexOf(scene) : -1;
        if (i >= 0) jumpFn.current(i);
      },
      showDetails,
    }),
    [cfg, lang, s, l, model, guest, updateConfig, resetConfig, showDetails],
  );

  const toggleMusic = async () => {
    if (!ambient.current) ambient.current = createAmbient(cfg.audio);
    if (musicOn) {
      ambient.current.stop();
      setMusicOn(false);
    } else {
      setMusicOn(await ambient.current.start());
    }
  };

  const playJourney = () => {
    setJourneyBroken(false);
    setUserChoseJourney(true);
    setMode('journey');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const notice: 'reduced' | 'unavailable' | null = journeyBroken ? 'unavailable' : prefersReduced() && !userChoseJourney ? 'reduced' : null;

  return (
    <Ctx.Provider value={ctx}>
      <a className="skip" href="#main-details" onClick={(e) => { e.preventDefault(); showDetails(); }}>{s.viewDetails}</a>
      <TopBar
        active={active}
        mode={mode}
        musicOn={musicOn}
        onMusic={cfg.audio.enabled ? toggleMusic : null}
        onLang={() => setLang((x) => (x === 'en' ? 'si' : 'en'))}
        canJourney={true}
        onJourney={playJourney}
      />
      {cfg.demo && mode === 'journey' && !journeyBroken && <p className="preview-flag">{s.previewRibbon}</p>}
      {mode === 'journey' && !journeyBroken ? (
        <>
          <Journey
            onFail={() => {
              setJourneyBroken(true);
              setMode('details');
            }}
            registerJump={(fn) => (jumpFn.current = fn)}
            onActive={setActive}
          />
          <ProgressRail active={active} />
        </>
      ) : (
        <div id="main-details">
          <DetailsView notice={notice} onPlay={playJourney} />
        </div>
      )}
      <AgendaSheet open={agendaOpen} onClose={() => setAgendaOpen(false)} mode={mode} />
      <RsvpDialog open={rsvp.open} focus={rsvp.focus} onClose={() => setRsvp({ open: false, focus: null })} />
      <EditPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialConfig={cfg}
        onSave={updateConfig}
        onReset={resetConfig}
      />
    </Ctx.Provider>
  );
}
