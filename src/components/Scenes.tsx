import type { ResolvedScene } from '../lib/model';
import { formatDate, formatTime } from '../lib/time';
import { toWijesekara } from '../lib/wijesekara';
import { useInvite } from './context';
import { CalIcon, CalendarButtons, DateLine, DirectionsLink, Names, PinIcon } from './bits';

// The text for each scene, set on a compact frosted card so it always stands
// clear of the 3D venue. Real HTML; every word comes from the configuration.

function Card({ scene, children, dark = false }: { scene: ResolvedScene; children: React.ReactNode; dark?: boolean }) {
  return <div className={`scene-card scene-card--${scene.kind}${dark ? ' scene-card--dark' : ''}`}>{children}</div>;
}

function EventBlock({ scene }: { scene: ResolvedScene }) {
  const { cfg, s, l, lang, model, openRsvp } = useInvite();
  const ev = scene.event!;
  const moments = scene.kind === 'reception' ? model.momentsOf(ev.id) : [];
  return (
    <Card scene={scene}>
      <h2 className="ev-title" id={`${scene.domId}-h`}>{l(ev.title)}</h2>
      <span className="card-rule" aria-hidden="true" />
      <p className="ev-desc">{l(ev.description)}</p>
      {moments.length > 0 && (
        <ul className="card-moments" aria-label={s.momentsLabel}>
          {moments.map((m) => (
            <li key={m.id}>
              <span className="card-moments-time">{m.time ? formatTime(m.time, lang) : s.tbaShort}</span>
              <span>{l(m.title)}</span>
            </li>
          ))}
        </ul>
      )}
      {scene.kind === 'meal' && (
        <button type="button" className="card-link" onClick={() => openRsvp('dietary')}>
          {s.dietaryAction}
          <span className="card-link-sub">{l(cfg.copy.mealDietaryPrompt)}</span>
        </button>
      )}
    </Card>
  );
}

function Arrival({ scene }: { scene: ResolvedScene }) {
  const { cfg, l } = useInvite();
  const venue = cfg.venues.find((v) => v.id === cfg.mainVenueId);
  return (
    <Card scene={scene}>
      <p className="card-kicker">{l(cfg.copy.welcome)}</p>
      <Names as="h2" id={`${scene.domId}-h`} className="names--card" />
      <span className="card-rule" aria-hidden="true" />
      <ul className="card-meta">
        {venue && (
          <li>
            <PinIcon />
            <span>
              <strong>{l(venue.name)}</strong>
              <br />
              {l(venue.address)}
            </span>
          </li>
        )}
        <li>
          <CalIcon />
          <span><DateLine ymd={cfg.weddingDate} /></span>
        </li>
      </ul>
      <DirectionsLink venueId={cfg.mainVenueId} className="btn btn--soft" />
    </Card>
  );
}

function Hall({ scene }: { scene: ResolvedScene }) {
  const { cfg, l, s, lang } = useInvite();
  const f = cfg.families;
  return (
    <Card scene={scene}>
      <h2 className="card-lead" id={`${scene.domId}-h`}>{l(cfg.copy.invitation)}</h2>
      <span className="card-rule" aria-hidden="true" />
      {f && (
        <div className="card-families">
          {[
            { name: cfg.couple.bride, side: f.bride },
            { name: cfg.couple.groom, side: f.groom },
          ].map(({ name, side }) => {
            const rawName = l(name);
            const displayName = lang === 'si' ? toWijesekara(rawName) : rawName;
            return (
              <p key={rawName}>
                <span className="card-family-name" aria-label={rawName}>{displayName}</span>
                <span className="card-family-line">{l(side.parents)}</span>
                {side.from && <span className="card-family-from">{l(side.from)}</span>}
              </p>
            );
          })}
        </div>
      )}
      {cfg.copy.dressCode && (
        <p className="card-note">
          <span className="card-note-label">{s.dressCode}</span>
          {l(cfg.copy.dressCode)}
        </p>
      )}
    </Card>
  );
}

function Closing({ scene }: { scene: ResolvedScene }) {
  const { cfg, l, s, lang, model, openRsvp } = useInvite();
  const venue = cfg.venues.find((v) => v.id === cfg.mainVenueId);
  const hc = model.homecoming;
  const hcVenue = hc ? cfg.venues.find((v) => v.id === hc.venueId) : null;
  return (
    <Card scene={scene}>
      <h2 className="card-kicker" id={`${scene.domId}-h`}>{l(cfg.copy.closing)}</h2>
      <Names className="names--card" />
      <span className="card-rule" aria-hidden="true" />
      <ul className="card-meta">
        <li>
          <CalIcon />
          <span><DateLine ymd={cfg.weddingDate} /></span>
        </li>
        {venue && (
          <li>
            <PinIcon />
            <span>{l(venue.name)}, {l(venue.address)}</span>
          </li>
        )}
      </ul>
      <button type="button" className="btn btn--primary btn--block" onClick={() => openRsvp()}>{s.rsvpLong}</button>
      <p className="card-deadline">{s.rsvpBy} {formatDate(cfg.rsvp.deadline, lang, false)}</p>
      <div className="card-secondary">
        <CalendarButtons events={model.agenda} className="card-link card-link--inline" />
      </div>
      {hc && (
        <details className="card-hc">
          <summary>
            <span className="card-hc-tag">{s.separateEvent}</span>
            <span className="card-hc-title">{l(hc.title)}</span>
            <span className="card-hc-when">
              {formatDate(hc.date, lang, false)}, {hc.time ? formatTime(hc.time, lang) : s.tbaShort}
            </span>
          </summary>
          {hcVenue && <p className="card-hc-where">{l(hcVenue.name)}, {l(hcVenue.address)}</p>}
          <p className="card-hc-desc">{l(hc.description)}</p>
          <DirectionsLink venueId={hc.venueId} className="card-link card-link--inline" />
        </details>
      )}
    </Card>
  );
}

export function SceneBody({ scene }: { scene: ResolvedScene }) {
  switch (scene.kind) {
    case 'arrival':
      return <Arrival scene={scene} />;
    case 'hall':
      return <Hall scene={scene} />;
    case 'closing':
      return <Closing scene={scene} />;
    case 'envelope':
      return null;
    default:
      return scene.event ? <EventBlock scene={scene} /> : null;
  }
}
