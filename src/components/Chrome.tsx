import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import type { ResolvedScene } from '../lib/model';
import { formatDate, formatTime } from '../lib/time';
import { useInvite } from './context';
import { CalendarButtons, CloseIcon, DirectionsLink, EditIcon, ListIcon, SoundIcon } from './bits';

// Persistent controls: top bar, desktop progress rail, agenda sheet, and the
// shared accessible dialog shell (native <dialog>, so focus is trapped and
// Escape closes it).

export function Sheet({ open, onClose, labelledBy, children, className = '' }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.classList.add('sheet-open');
    }
    if (!open && d.open) d.close();
    if (!open) document.documentElement.classList.remove('sheet-open');
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`sheet ${className}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}

export function sceneLabel(scene: ResolvedScene, s: ReturnType<typeof useInvite>['s'], l: ReturnType<typeof useInvite>['l']) {
  if (scene.event) return l(scene.event.title);
  return { envelope: s.railOpening, arrival: s.railWelcome, hall: s.railInvitation, closing: s.railReply }[scene.kind as 'envelope'] ?? '';
}

export function TopBar({ active, mode, musicOn, onMusic, onLang, canJourney, onJourney }: {
  active: number;
  mode: 'journey' | 'details';
  musicOn: boolean;
  onMusic: (() => void) | null;
  onLang: () => void;
  canJourney: boolean;
  onJourney: () => void;
}) {
  const { cfg, s, l, model, openAgenda, openRsvp, openEdit, jumpToScene } = useInvite();
  const scene = model.scenes[active];
  const current = mode === 'journey' && scene ? sceneLabel(scene, s, l) : s.agenda;
  return (
    <header className="topbar">
      {mode === 'journey' ? (
        <button type="button" className="mono" onClick={() => jumpToScene(0)} aria-label={`${l(cfg.couple.bride)} ${s.andWord} ${l(cfg.couple.groom)}`}>
          {cfg.couple.monogram}
        </button>
      ) : canJourney ? (
        <button type="button" className="chip chip--journey" onClick={onJourney} aria-label={s.backToJourney}>
          <span className="chip-long">{s.backToJourney}</span>
          <span className="chip-short" aria-hidden="true">{s.journeyShort}</span>
        </button>
      ) : (
        <span className="mono" aria-hidden="true">{cfg.couple.monogram}</span>
      )}
      <div className="topbar-right">
        {cfg.languages.available.length > 1 && (
          <button type="button" className="chip chip--lang" onClick={onLang} aria-label={s.languageLabel} lang={s.language === 'English' ? 'en' : 'si'}>
            {s.language}
          </button>
        )}
        {onMusic && (
          <button type="button" className="icon-btn" onClick={onMusic} aria-pressed={musicOn} aria-label={musicOn ? s.musicOff : s.musicOn} title={musicOn ? s.musicOff : s.musicOn}>
            <SoundIcon on={musicOn} />
          </button>
        )}
        <button type="button" className="chip chip--edit" onClick={openEdit} aria-label={s.editInvitation} title={s.editInvitation}>
          <EditIcon />
          <span className="chip-label">{s.customize}</span>
        </button>
        <button type="button" className="chip chip--agenda" onClick={openAgenda} aria-haspopup="dialog">
          <ListIcon />
          <span className="chip-label">{current}</span>
        </button>
        <button type="button" className="chip chip--reply" onClick={() => openRsvp()} aria-haspopup="dialog">{s.rsvp}</button>
      </div>
    </header>
  );
}

export function ProgressRail({ active }: { active: number }) {
  const { s, l, model, jumpToScene } = useInvite();
  return (
    <nav className="rail" aria-label={s.progressLabel}>
      <ol>
        {model.scenes.map((scene, i) => (
          <li key={scene.key}>
            <button type="button" aria-current={i === active ? 'step' : undefined} onClick={() => jumpToScene(i)} className={i < active ? 'is-past' : ''}>
              <span className="rail-label">{sceneLabel(scene, s, l)}</span>
              <span className="rail-dot" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AgendaSheet({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: 'journey' | 'details' }) {
  const { cfg, s, l, lang, model, jumpToEvent, openRsvp, openEdit, showDetails } = useInvite();
  const hc = model.homecoming;
  const row = (ev: (typeof model.agenda)[number], nested = false) => {
    const venue = cfg.venues.find((v) => v.id === ev.venueId);
    const scene = model.sceneForEvent(ev.id);
    return (
      <li key={ev.id} className={`ag-row${nested ? ' ag-row--nested' : ''}`}>
        <p className="ag-time">
          {ev.time ? formatTime(ev.time, lang) : s.tbaShort}
        </p>
        <div className="ag-main">
          <p className="ag-title">{l(ev.title)}</p>
          {!nested && venue && ev.venueId !== cfg.mainVenueId && <p className="ag-sub">{l(venue.name)}</p>}
        </div>
        {mode === 'journey' && scene && !nested && (
          <button type="button" className="ag-go" onClick={() => { onClose(); jumpToEvent(ev.id); }} aria-label={`${s.goTo}: ${l(ev.title)}`}>
            <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        )}
      </li>
    );
  };
  return (
    <Sheet open={open} onClose={onClose} labelledBy="agenda-title" className="sheet--agenda">
      <div className="sheet-head">
        <h2 id="agenda-title">{s.agendaTitle}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={s.close}><CloseIcon /></button>
      </div>
      <p className="ag-date">{formatDate(cfg.weddingDate, lang)}</p>
      <p className="ag-tz">{s.sriLankaTime}</p>
      <ol className="ag-list">
        {model.agenda.map((ev) => (
          <Fragment key={ev.id}>
            {row(ev)}
            {model.momentsOf(ev.id).map((m) => row(m, true))}
          </Fragment>
        ))}
      </ol>
      {hc && (
        <div className="ag-hc">
          <p className="hc-tag">{s.homecomingNote}</p>
          <p className="ag-hc-title">{l(hc.title)}</p>
          <p className="ag-sub">
            {formatDate(hc.date, lang)} · {hc.time ? formatTime(hc.time, lang) : s.tbaShort}
          </p>
          <p className="ag-sub">{l(cfg.venues.find((v) => v.id === hc.venueId)?.name)}</p>
        </div>
      )}
      <div className="sheet-actions">
        <button type="button" className="btn btn--primary" onClick={() => { onClose(); openRsvp(); }}>{s.rsvpLong}</button>
        <button type="button" className="btn btn--soft" onClick={() => { onClose(); openEdit(); }}><EditIcon /> {s.editInvitation}</button>
        <CalendarButtons events={model.agenda} />
        <DirectionsLink venueId={cfg.mainVenueId} />
        {mode === 'journey' && (
          <button type="button" className="link" onClick={() => { onClose(); showDetails(); }}>{s.viewDetails}</button>
        )}
      </div>
    </Sheet>
  );
}
