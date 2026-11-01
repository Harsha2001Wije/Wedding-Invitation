import { forwardRef } from 'react';
import { useInvite } from './context';
import { DateLine, JasmineSprig, Names } from './bits';
import { scrollState } from '../lib/scroll';

// Scene 1. A DOM/SVG envelope (sharp text, instant to load) laid over the 3D
// garden. Scroll drives CSS variables set by Journey: --flap, --rise, --zoom,
// --copy, --stage. The card's painted garden is composed to match the
// first 3D camera view, so as it grows and fades the real garden takes over.

/** Painted garden on the invitation card: same layout as the 3D entrance view. */
function CardArt() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ca-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9c9d8" />
          <stop offset=".62" stopColor="#fbe9cf" />
        </linearGradient>
        <linearGradient id="ca-lawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9b98a" />
          <stop offset="1" stopColor="#7f9a63" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#ca-sky)" />
      {/* hall: two-tier roof, white facade, warm doorway */}
      <path d="M86 92h128l-16-15H102z" fill="#a86246" />
      <rect x="114" y="68" width="72" height="9" fill="#fbf6ec" />
      <path d="M108 68h84l-14-13h-56z" fill="#8e4f39" />
      <rect x="92" y="92" width="116" height="38" fill="#fdfaf3" />
      <rect x="92" y="91" width="116" height="2" fill="#c8a45d" />
      <rect x="143" y="104" width="14" height="26" fill="#7a4a2a" />
      <rect x="149.6" y="104" width=".8" height="26" fill="#c8a45d" />
      {[100, 116, 176, 192].map((x) => <rect key={x} x={x} y="94" width="4" height="36" fill="#f6f0e2" />)}
      {/* lawn and path */}
      <path d="M0 130h300v70H0z" fill="url(#ca-lawn)" />
      <path d="M144 130h12l40 70h-92z" fill="#efe4d0" />
      {/* hedges with flowers */}
      <path d="M100 200l39-70h-6L74 200z" fill="#5d7c50" />
      <path d="M200 200l-39-70h6l59 70z" fill="#5d7c50" />
      {Array.from({ length: 26 }, (_, i) => {
        const t = i / 25;
        return (
          <g key={i}>
            <circle cx={136 - t * 52} cy={132 + t * 64} r={1 + t * 2.4} fill={i % 3 ? '#fffdf6' : '#ebb7ab'} />
            <circle cx={164 + t * 52} cy={132 + t * 64} r={1 + t * 2.4} fill={i % 4 ? '#fffdf6' : '#f2c66b'} />
          </g>
        );
      })}
      {/* floral arches */}
      {[{ y: 150, r: 24 }, { y: 175, r: 40 }].map(({ y, r }, k) => (
        <g key={k}>
          <path d={`M${150 - r} ${y} A ${r} ${r * 1.1} 0 0 1 ${150 + r} ${y}`} fill="none" stroke="#c8a45d" strokeWidth={1 + k} />
          {Array.from({ length: 22 }, (_, i) => {
            const a = Math.PI * (i / 21);
            return <circle key={i} cx={150 - Math.cos(a) * r} cy={y - Math.sin(a) * r * 1.1} r={1.4 + k * 1.3} fill={i % 4 === 0 ? '#ebb7ab' : '#fffdf6'} />;
          })}
        </g>
      ))}
      {/* palms */}
      {[{ x: 52, h: 96, s: 1 }, { x: 250, h: 104, s: -1 }, { x: 22, h: 120, s: 1 }, { x: 282, h: 70, s: -1 }].map((p, i) => (
        <g key={i}>
          <path d={`M${p.x} 200 q ${6 * p.s} -${p.h / 2} ${-4 * p.s} -${p.h}`} stroke="#8a7356" strokeWidth="3" fill="none" />
          {[-60, -25, 10, 45, 80, 115, 160].map((a) => (
            <path key={a} d="M0 0 q 14 -8 26 4" transform={`translate(${p.x - 4 * p.s} ${200 - p.h}) rotate(${a})`} stroke="#5f8a52" strokeWidth="3.4" fill="none" strokeLinecap="round" />
          ))}
        </g>
      ))}
    </svg>
  );
}

export const Envelope = forwardRef<HTMLDivElement>(function Envelope(_, ref) {
  const { cfg, s, l, showDetails, openRsvp } = useInvite();
  const venue = cfg.venues.find((v) => v.id === cfg.mainVenueId);

  const handleOpen = () => {
    const box0 = scrollState.sections[0];
    const targetY = box0 ? box0.top + box0.span * 0.52 : window.innerHeight * 0.75;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  return (
    <div className="env-stage" ref={ref}>
      <JasmineSprig className="env-sprig env-sprig--a" />
      <JasmineSprig className="env-sprig env-sprig--b" />
      <div className="env-copy env-copy--top">
        <Names as="h1" className="names--hero" />
        <p className="env-opening">{l(cfg.copy.opening)}</p>
      </div>
      <div className="env-wrap">
        <div className="env">
          <div className="env-back" />
          <div className="env-card">
            <CardArt />
          </div>
          <svg className="env-pocket" viewBox="0 0 145 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0 L72.5 56 L145 0 V100 H0Z" fill="#f7efe1" />
            <path d="M0 100 L72.5 50 L145 100" fill="#f3e9d8" stroke="#e4d5bc" strokeWidth=".4" />
            <path d="M0 0 L72.5 56 L145 0" fill="none" stroke="#e4d5bc" strokeWidth=".4" />
          </svg>
          <div className="env-seal-base" aria-hidden="true" />
          <div className="env-flap">
            <svg viewBox="0 0 145 62" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 0 H145 L72.5 58Z" fill="#faf4e8" stroke="#e4d5bc" strokeWidth=".4" />
            </svg>
            <button
              type="button"
              className="env-seal-btn"
              onClick={handleOpen}
              aria-label={s.openInvite}
              title={s.openInvite}
            >
              <span className="env-seal-disc env-seal-front">
                <span className="env-seal-rim" />
                <span className="env-seal-monogram">{cfg.couple.monogram}</span>
              </span>
              <span className="env-seal-disc env-seal-back">
                <span className="env-seal-rim" />
                <span className="env-seal-monogram">{cfg.couple.monogram}</span>
              </span>
              <span className="env-seal-prompt">
                <span className="env-seal-prompt-text">{s.openInvite}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
      <div className="env-copy env-copy--bottom">
        <p className="env-date">
          <DateLine ymd={cfg.weddingDate} />
        </p>
        {venue && <p className="env-venue">{l(venue.name)}, {l(venue.address)}</p>}
        <p className="env-cue" aria-hidden="true">
          <span>{s.scrollCue}</span>
          <span className="env-cue-line" />
        </p>
        <p className="env-links">
          <button type="button" className="link" onClick={showDetails}>{s.viewDetails}</button>
          <button type="button" className="link" onClick={() => openRsvp()}>{s.skipToRsvp}</button>
        </p>
      </div>
    </div>
  );
});
