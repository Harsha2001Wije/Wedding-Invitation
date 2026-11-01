import type { WeddingEvent } from '../config/types';
import { formatTime, timeParts } from '../lib/time';
import { useInvite } from './context';

/**
 * EventClock: Clean time display for event timelines (Details view & lists).
 */
export function EventClock({ ev, compact = false }: { ev: WeddingEvent; compact?: boolean }) {
  const { lang, s } = useInvite();

  if (!ev.time) {
    return (
      <div className={`ev-clock-wrapper${compact ? ' ev-clock--compact' : ''}`}>
        <p className={`ev-time ev-time--tba${compact ? ' is-compact' : ''}`}>
          <span className="ev-tba">{s.tba}</span>
        </p>
      </div>
    );
  }

  const p = timeParts(ev.time, lang);

  return (
    <div className={`ev-clock-wrapper${compact ? ' ev-clock--compact' : ''}`}>
      <p className={`ev-time${compact ? ' is-compact' : ''}`} aria-label={formatTime(ev.time, lang)}>
        {p.periodFirst && <span className="ev-period">{p.period}</span>}
        <span className="ev-clock">{p.clock}</span>
        {!p.periodFirst && <span className="ev-period">{p.period}</span>}
      </p>
    </div>
  );
}
