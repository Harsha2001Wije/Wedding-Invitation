import { useState } from 'react';
import { formatDate, formatTime } from '../lib/time';
import { toWijesekara } from '../lib/wijesekara';
import { useInvite } from './context';
import { CalendarButtons, DateLine, DirectionsLink, EditIcon, JasmineSprig, LotusMark, Names } from './bits';
import { EventClock } from './EventClock';
import { Contacts } from './RsvpDialog';

// The whole invitation on one calm page. Used for the "View invitation
// details" shortcut, for reduced motion, and whenever WebGL is unavailable.
// It needs no images: if configured posters fail to load they are dropped.

function Poster({ src }: { src?: string }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return null;
  return <img className="details-poster" src={src} alt="" loading="lazy" decoding="async" onError={() => setOk(false)} />;
}

export function DetailsView({ notice, onPlay }: { notice: 'reduced' | 'unavailable' | null; onPlay: (() => void) | null }) {
  const { cfg, s, l, lang, model, openRsvp, openEdit } = useInvite();
  const venue = cfg.venues.find((v) => v.id === cfg.mainVenueId);
  const hc = model.homecoming;
  const hcVenue = hc ? cfg.venues.find((v) => v.id === hc.venueId) : null;
  const f = cfg.families;
  return (
    <main className="details">
      {notice && (
        <p className="details-notice">
          {notice === 'reduced' ? s.reducedMotionNote : s.journeyUnavailable}
          {onPlay && <> <button type="button" className="link" onClick={onPlay}>{s.playJourney}</button></>}
        </p>
      )}
      <header className="details-head">
        <Poster src={cfg.assets.posters.envelope} />
        <JasmineSprig className="details-sprig details-sprig--a" />
        <JasmineSprig className="details-sprig details-sprig--b" />
        <Names as="h1" className="names--hero" />
        <p className="details-opening">{l(cfg.copy.opening)}</p>
        <p className="details-date"><DateLine ymd={cfg.weddingDate} /></p>
        {venue && <p className="details-venue">{l(venue.name)}<br />{l(venue.address)}</p>}
        <div className="actions actions--center">
          <button type="button" className="btn btn--primary" onClick={() => openRsvp()}>{s.rsvpLong}</button>
          <button type="button" className="btn btn--soft" onClick={() => openEdit()}>
            <EditIcon /> {s.editInvitation}
          </button>
          <DirectionsLink venueId={cfg.mainVenueId} />
          <CalendarButtons events={model.agenda} />
        </div>
        <p className="deadline">{s.rsvpBy} <strong>{formatDate(cfg.rsvp.deadline, lang, false)}</strong></p>
      </header>

      <section className="details-block details-invite" aria-labelledby="d-invite">
        <LotusMark />
        <h2 id="d-invite" className="invite-lead">{l(cfg.copy.invitation)}</h2>
        {f && (
          <div className="families">
            <p className="families-label">{s.familiesHeading}</p>
            <div className="families-grid">
              <p>
                <span className="families-name" aria-label={l(cfg.couple.bride)}>
                  {lang === 'si' ? toWijesekara(l(cfg.couple.bride)) : l(cfg.couple.bride)}
                </span>
                <span className="families-line">{l(f.bride.parents)}</span>
                {f.bride.from && <span className="families-from">{l(f.bride.from)}</span>}
              </p>
              <p>
                <span className="families-name" aria-label={l(cfg.couple.groom)}>
                  {lang === 'si' ? toWijesekara(l(cfg.couple.groom)) : l(cfg.couple.groom)}
                </span>
                <span className="families-line">{l(f.groom.parents)}</span>
                {f.groom.from && <span className="families-from">{l(f.groom.from)}</span>}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="details-block" aria-labelledby="d-agenda">
        <h2 id="d-agenda" className="details-h">{s.agendaTitle}</h2>
        <p className="ag-tz">{formatDate(cfg.weddingDate, lang)}. {s.sriLankaTime}.</p>
        <ol className="timeline">
          {model.agenda.map((ev) => (
            <li key={ev.id} className="timeline-item">
              <div className="timeline-time"><EventClock ev={ev} compact /></div>
              <div className="timeline-body">
                <h3 className="ev-title ev-title--small">{l(ev.title)}</h3>
                <p className="ev-desc">{l(ev.description)}</p>
                {model.momentsOf(ev.id).length > 0 && (
                  <ul className="moments-list">
                    {model.momentsOf(ev.id).map((m) => (
                      <li key={m.id}>
                        <span className="moments-time">{m.time ? formatTime(m.time, lang) : s.tbaShort}</span> {l(m.title)}
                      </li>
                    ))}
                  </ul>
                )}
                {ev.kind === 'meal' && (
                  <p className="diet-prompt">{l(cfg.copy.mealDietaryPrompt)} <button type="button" className="link" onClick={() => openRsvp('dietary')}>{s.dietaryAction}</button></p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {cfg.copy.dressCode && (
        <section className="details-block details-block--narrow" aria-labelledby="d-dress">
          <h2 id="d-dress" className="details-h">{s.dressCode}</h2>
          <p>{l(cfg.copy.dressCode)}</p>
        </section>
      )}

      {hc && (
        <section className="details-block details-block--narrow hc-card" aria-labelledby="d-hc">
          <p className="hc-tag">{s.homecomingNote}</p>
          <h2 id="d-hc">{l(hc.title)}</h2>
          <div className="hc-clock-wrap">
            <EventClock ev={hc} compact />
          </div>
          {hcVenue && <p className="hc-where">{l(hcVenue.name)}, {l(hcVenue.address)}</p>}
          <p className="hc-desc">{l(hc.description)}</p>
          <div className="actions">
            <DirectionsLink venueId={hc.venueId} />
            <CalendarButtons events={[hc]} />
          </div>
        </section>
      )}

      <section className="details-block details-block--narrow details-close" aria-labelledby="d-close">
        <h2 id="d-close" className="closing-line">{l(cfg.copy.closing)}</h2>
        <Names className="names--scene" />
        <button type="button" className="btn btn--primary" onClick={() => openRsvp()}>{s.rsvpLong}</button>
        <Contacts />
      </section>
    </main>
  );
}
