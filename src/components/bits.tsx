import { useState } from 'react';
import type { WeddingEvent } from '../config/types';
import { buildIcs, downloadIcs, googleCalendarUrl } from '../lib/ics';
import { formatDate, formatTime, timeParts } from '../lib/time';
import { toWijesekara } from '../lib/wijesekara';
import { useInvite } from './context';

/** Small lotus mark used as a divider between time and title. */
export function LotusMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`lotus-mark ${className}`} viewBox="0 0 64 24" aria-hidden="true" focusable="false">
      <path d="M32 3c3.5 4.2 5 8.6 0 17-5-8.4-3.5-12.8 0-17Z" fill="currentColor" opacity=".9" />
      <path d="M32 20c-4-3.8-9.8-6-15.5-5.6 3.2 4.4 9.3 6.2 15.5 5.6Zm0 0c4-3.8 9.8-6 15.5-5.6-3.2 4.4-9.3 6.2-15.5 5.6Z" fill="currentColor" opacity=".65" />
      <path d="M2 20.5h20M42 20.5h20" stroke="currentColor" strokeWidth="1" opacity=".6" />
    </svg>
  );
}

/** A jasmine sprig drawn for the envelope and details page. */
export function JasmineSprig({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      <path d="M8 112C40 92 70 70 92 40c10-13 22-24 40-32" stroke="#6f8a5e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M52 80c-8-12-6-24 6-30 2 12-1 22-6 30Zm28-30c-12-4-18-14-14-26 10 6 14 15 14 26Zm22-14c4-12 14-18 26-16-6 10-15 15-26 16Z" fill="#7d9a6a" />
      {[[100, 30], [118, 16], [70, 58], [40, 88]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${i * 37})`}>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} rx="4.2" ry="9" cy="-8" fill="#fffdf6" stroke="#e9dcc3" strokeWidth=".8" transform={`rotate(${r})`} />
          ))}
          <circle r="2.4" fill="#f0d68a" />
        </g>
      ))}
    </svg>
  );
}

export function EventTime({ ev, compact = false }: { ev: WeddingEvent; compact?: boolean }) {
  const { lang, s } = useInvite();
  if (!ev.time) {
    return (
      <p className={`ev-time ev-time--tba${compact ? ' is-compact' : ''}`}>
        <span className="ev-tba">{s.tba}</span>
      </p>
    );
  }
  const p = timeParts(ev.time, lang);
  return (
    <>
      <p className={`ev-time${compact ? ' is-compact' : ''}`} aria-label={formatTime(ev.time, lang)}>
        {p.periodFirst && <span className="ev-period">{p.period}</span>}
        <span className="ev-clock">{p.clock}</span>
        {!p.periodFirst && <span className="ev-period">{p.period}</span>}
      </p>
    </>
  );
}

export function DirectionsLink({ venueId, className = 'btn btn--ghost' }: { venueId: string; className?: string }) {
  const { cfg, s, l } = useInvite();
  const venue = cfg.venues.find((v) => v.id === venueId);
  if (!venue) return null;
  return (
    <a className={className} href={venue.mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`${s.directions}: ${l(venue.name)}`}>
      <PinIcon /> {s.directions}
    </a>
  );
}

export function CalendarButtons({ events, className = 'btn btn--ghost' }: { events: WeddingEvent[]; className?: string }) {
  const { cfg, lang, s } = useInvite();
  const [open, setOpen] = useState(false);
  const timed = events.filter((e) => e.time);
  if (!timed.length) return null;
  const google = timed.length === 1 ? googleCalendarUrl(cfg, timed[0], lang) : null;
  const ics = () => downloadIcs(`wedding-${cfg.weddingDate}.ics`, buildIcs(cfg, timed, lang));
  return (
    <div className="cal">
      <button type="button" className={className} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CalIcon /> {s.addToCalendar}
      </button>
      {open && (
        <div className="cal-menu">
          <button type="button" className="link" onClick={ics}>
            Apple / Outlook (.ics)
          </button>
          {google ? (
            <a className="link" href={google} target="_blank" rel="noopener noreferrer">Google Calendar</a>
          ) : (
            timed.map((e) => {
              const url = googleCalendarUrl(cfg, e, lang);
              return url ? (
                <a key={e.id} className="link" href={url} target="_blank" rel="noopener noreferrer">
                  Google: {e.title[lang]}
                </a>
              ) : null;
            })
          )}
        </div>
      )}
    </div>
  );
}

export function DateLine({ ymd }: { ymd: string }) {
  const { lang } = useInvite();
  return <time dateTime={ymd}>{formatDate(ymd, lang)}</time>;
}

export function Names({ as: Tag = 'p', className = '', id }: { as?: 'h1' | 'h2' | 'p'; className?: string; id?: string }) {
  const { cfg, l, s, lang } = useInvite();
  const bride = l(cfg.couple.bride);
  const groom = l(cfg.couple.groom);
  const andWord = s.andWord;

  const displayBride = lang === 'si' ? toWijesekara(bride) : bride;
  const displayGroom = lang === 'si' ? toWijesekara(groom) : groom;
  const displayAnd = lang === 'si' ? toWijesekara(andWord) : andWord;

  return (
    <Tag className={`names ${className}`} id={id} aria-label={`${bride} ${andWord} ${groom}`}>
      <span className="names-one">{displayBride}</span>
      <span className="names-amp">{displayAnd}</span>
      <span className="names-two">{displayGroom}</span>
    </Tag>
  );
}

export const PinIcon = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="9.8" r="2.3" fill="currentColor" /></svg>
);
export const CalIcon = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" strokeWidth="1.6" /></svg>
);
export const ListIcon = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h11M9 12h11M9 17h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="5" cy="7" r="1.2" fill="currentColor" /><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="5" cy="17" r="1.2" fill="currentColor" /></svg>
);
export const SoundIcon = ({ on }: { on: boolean }) => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    {on ? (
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    ) : (
      <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    )}
  </svg>
);
export const CloseIcon = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
);
export const EditIcon = () => (
  <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
