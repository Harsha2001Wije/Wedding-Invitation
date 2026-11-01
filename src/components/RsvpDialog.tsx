import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createAdapter, type RsvpPayload } from '../lib/rsvp';
import { colomboToday, formatDate, formatTime } from '../lib/time';
import { useInvite } from './context';
import { CloseIcon } from './bits';
import { Sheet } from './Chrome';

type Answer = 'yes' | 'no' | '';

interface Errors {
  name?: string;
  attending?: string;
  count?: string;
  events?: string;
  hc?: string;
  hcCount?: string;
  message?: string;
}

export function RsvpDialog({ open, onClose, focus }: { open: boolean; onClose: () => void; focus: 'dietary' | null }) {
  const { cfg, s, l, lang, model, guest } = useInvite();
  const adapter = useMemo(() => createAdapter(cfg.rsvp), [cfg.rsvp]);
  const max = guest.maxParty ?? cfg.rsvp.defaultMaxParty;
  const hc = model.homecoming?.rsvpSelectable ? model.homecoming : null;
  const selectable = model.rsvpEvents;
  const previous = useMemo(() => adapter.previous(), [adapter]);

  const [name, setName] = useState(previous?.name ?? guest.name ?? '');
  const [attending, setAttending] = useState<Answer>(previous ? (previous.attending ? 'yes' : 'no') : '');
  const [count, setCount] = useState(String(previous?.partySize ?? Math.min(max, 2)));
  const [events, setEvents] = useState<string[]>(previous?.events ?? selectable.map((e) => e.id));
  const [dietary, setDietary] = useState<string[]>(previous?.dietary ?? []);
  const [dietNotes, setDietNotes] = useState(previous?.dietaryNotes ?? '');
  const [hcAnswer, setHcAnswer] = useState<Answer>(previous?.homecoming ? (previous.homecoming.attending ? 'yes' : 'no') : '');
  const [hcCount, setHcCount] = useState(String(previous?.homecoming?.partySize ?? Math.min(max, 2)));
  const [message, setMessage] = useState(previous?.message ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'form' | 'sending' | 'done' | 'error'>(previous ? 'done' : 'form');
  const [delivered, setDelivered] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const dietRef = useRef<HTMLFieldSetElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const deadlinePassed = colomboToday() > cfg.rsvp.deadline;

  useEffect(() => {
    if (open && focus === 'dietary') {
      if (status === 'done') setStatus('form');
      window.setTimeout(() => {
        dietRef.current?.scrollIntoView({ block: 'center' });
        dietRef.current?.querySelector('input')?.focus({ preventScroll: true });
      }, 80);
    }
  }, [open, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the focused field visible above the on-screen keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !open) return;
    const onResize = () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && formRef.current?.contains(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [open]);

  function validate(): Errors {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = s.errName;
    if (!attending) e.attending = s.errAttending;
    if (attending === 'yes') {
      const n = Number(count);
      if (!Number.isInteger(n) || n < 1 || n > max) e.count = s.errCount(max);
      if (selectable.length > 1 && events.length === 0) e.events = s.errEvents;
    }
    if (hc) {
      if (!hcAnswer) e.hc = s.errHc;
      const n = Number(hcCount);
      if (hcAnswer === 'yes' && (!Number.isInteger(n) || n < 1 || n > max)) e.hcCount = s.errCount(max);
    }
    if (message.length > cfg.rsvp.messageMaxLength) e.message = s.errMessage(cfg.rsvp.messageMaxLength);
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    setStatus('sending');
    const payload: RsvpPayload = {
      inviteCode: guest.code,
      name: name.trim(),
      attending: attending === 'yes',
      partySize: attending === 'yes' ? Number(count) : 0,
      events: attending === 'yes' ? (selectable.length > 1 ? events : selectable.map((x) => x.id)) : [],
      dietary: attending === 'yes' ? dietary : [],
      dietaryNotes: attending === 'yes' ? dietNotes.trim() : '',
      message: message.trim(),
      homecoming: hc ? { attending: hcAnswer === 'yes', partySize: hcAnswer === 'yes' ? Number(hcCount) : 0 } : null,
      language: lang,
      submittedAt: new Date().toISOString(),
    };
    const res = await adapter.submit(payload);
    if (res.ok) {
      setDelivered(res.delivered);
      setStatus('done');
    } else setStatus('error');
  }

  const errList = Object.entries(errors).filter(([, v]) => v) as [keyof Errors, string][];
  const fieldId: Record<keyof Errors, string> = { name: 'rsvp-name', attending: 'rsvp-att-yes', count: 'rsvp-count', events: 'rsvp-events', hc: 'rsvp-hc-yes', hcCount: 'rsvp-hc-count', message: 'rsvp-message' };

  const stepper = (id: string, value: string, set: (v: string) => void, err?: string) => (
    <div className="stepper">
      <button type="button" aria-label="−1" onClick={() => set(String(Math.max(1, (Number(value) || 1) - 1)))}>−</button>
      <input id={id} type="number" inputMode="numeric" min={1} max={max} value={value} onChange={(e) => set(e.target.value)} aria-invalid={!!err} aria-describedby={`${id}-hint${err ? ` ${id}-err` : ''}`} />
      <button type="button" aria-label="+1" onClick={() => set(String(Math.min(max, (Number(value) || 0) + 1)))}>+</button>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} labelledBy="rsvp-title" className="sheet--rsvp">
      <div className="sheet-head">
        <h2 id="rsvp-title">{s.formTitle}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={s.close}><CloseIcon /></button>
      </div>
      {cfg.demo && <p className="demo-note">{s.demoFormNote}</p>}

      {deadlinePassed && status !== 'done' ? (
        <p className="form-intro">{s.deadlinePassed}</p>
      ) : status === 'done' ? (
        <div className="done" role="status">
          <p className="done-title">{attending === 'yes' ? s.doneTitleYes : s.doneTitleNo}</p>
          <p className={delivered ? 'done-note' : 'done-note done-note--demo'}>{delivered ? s.doneSent : s.doneDemo}</p>
          <dl className="done-summary">
            <div><dt>{s.fieldName}</dt><dd>{name}</dd></div>
            <div><dt>{s.fieldAttending}</dt><dd>{attending === 'yes' ? `${s.attendingYes} (${count})` : s.attendingNo}</dd></div>
            {attending === 'yes' && selectable.length > 1 && (
              <div><dt>{s.fieldEvents}</dt><dd>{selectable.filter((e) => events.includes(e.id)).map((e) => l(e.title)).join(', ')}</dd></div>
            )}
            {hc && <div><dt>{l(hc.title)}</dt><dd>{hcAnswer === 'yes' ? `${s.attendingYes} (${hcCount})` : s.attendingNo}</dd></div>}
          </dl>
          <button type="button" className="btn btn--ghost" onClick={() => setStatus('form')}>{s.editReply}</button>
        </div>
      ) : (
        <form ref={formRef} className="rsvp-form" noValidate onSubmit={submit}>
          <p className="form-intro">
            {s.formIntro} {s.rsvpBy} <strong>{formatDate(cfg.rsvp.deadline, lang, false)}</strong>.
          </p>
          {errList.length > 0 && (
            <div className="err-summary" role="alert" tabIndex={-1} ref={summaryRef}>
              <p>{s.errSummary}</p>
              <ul>
                {errList.map(([k, msg]) => (
                  <li key={k}><a href={`#${fieldId[k]}`} onClick={(e) => { e.preventDefault(); document.getElementById(fieldId[k])?.focus(); }}>{msg}</a></li>
                ))}
              </ul>
            </div>
          )}

          <div className="field">
            <label htmlFor="rsvp-name">{s.fieldName}</label>
            <p className="hint" id="rsvp-name-hint">{s.fieldNameHint}</p>
            <input id="rsvp-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={`rsvp-name-hint${errors.name ? ' rsvp-name-err' : ''}`} />
            {errors.name && <p className="err" id="rsvp-name-err">{errors.name}</p>}
          </div>

          <fieldset className="field" aria-describedby={errors.attending ? 'rsvp-att-err' : undefined}>
            <legend>{s.fieldAttending}</legend>
            <div className="choice-row">
              <label className="choice"><input id="rsvp-att-yes" type="radio" name="att" checked={attending === 'yes'} onChange={() => setAttending('yes')} /><span>{s.attendingYes}</span></label>
              <label className="choice"><input type="radio" name="att" checked={attending === 'no'} onChange={() => setAttending('no')} /><span>{s.attendingNo}</span></label>
            </div>
            {errors.attending && <p className="err" id="rsvp-att-err">{errors.attending}</p>}
          </fieldset>

          {attending === 'yes' && (
            <>
              <div className="field">
                <label htmlFor="rsvp-count">{s.fieldCount}</label>
                <p className="hint" id="rsvp-count-hint">{s.fieldCountHint(max)}</p>
                {stepper('rsvp-count', count, setCount, errors.count)}
                {errors.count && <p className="err" id="rsvp-count-err">{errors.count}</p>}
              </div>
              {selectable.length > 1 && (
                <fieldset className="field" id="rsvp-events" tabIndex={-1} aria-describedby={errors.events ? 'rsvp-events-err' : undefined}>
                  <legend>{s.fieldEvents}</legend>
                  <div className="choice-col">
                    {selectable.map((e) => (
                      <label key={e.id} className="choice">
                        <input type="checkbox" checked={events.includes(e.id)} onChange={(x) => setEvents((cur) => (x.target.checked ? [...cur, e.id] : cur.filter((id) => id !== e.id)))} />
                        <span>{l(e.title)}{e.time ? `, ${formatTime(e.time, lang)}` : ''}</span>
                      </label>
                    ))}
                  </div>
                  {errors.events && <p className="err" id="rsvp-events-err">{errors.events}</p>}
                </fieldset>
              )}
            </>
          )}

          {attending !== 'no' && (
            <fieldset className="field" ref={dietRef}>
              <legend>{s.fieldDietary}</legend>
              <div className="chips">
                {cfg.rsvp.dietaryOptions.map((o) => (
                  <label key={o.id} className="chip-check">
                    <input type="checkbox" checked={dietary.includes(o.id)} onChange={(x) => setDietary((cur) => (x.target.checked ? [...cur, o.id] : cur.filter((id) => id !== o.id)))} />
                    <span>{l(o.label)}</span>
                  </label>
                ))}
              </div>
              <label htmlFor="rsvp-diet" className="sub-label">{s.fieldDietaryOther}</label>
              <textarea id="rsvp-diet" rows={2} value={dietNotes} onChange={(e) => setDietNotes(e.target.value)} />
            </fieldset>
          )}

          {hc && (
            <fieldset className="field field--hc" aria-describedby={`rsvp-hc-when${errors.hc ? ' rsvp-hc-err' : ''}`}>
              <legend>{s.hcQuestion(l(hc.title))}</legend>
              <p className="hint" id="rsvp-hc-when">
                {s.separateEvent}: {formatDate(hc.date, lang)}
                {hc.time ? `, ${formatTime(hc.time, lang)}` : ''}, {l(cfg.venues.find((v) => v.id === hc.venueId)?.name)}
              </p>
              <div className="choice-row">
                <label className="choice"><input id="rsvp-hc-yes" type="radio" name="hc" checked={hcAnswer === 'yes'} onChange={() => setHcAnswer('yes')} /><span>{s.attendingYes}</span></label>
                <label className="choice"><input type="radio" name="hc" checked={hcAnswer === 'no'} onChange={() => setHcAnswer('no')} /><span>{s.attendingNo}</span></label>
              </div>
              {errors.hc && <p className="err" id="rsvp-hc-err">{errors.hc}</p>}
              {hcAnswer === 'yes' && (
                <div className="field field--inner">
                  <label htmlFor="rsvp-hc-count">{s.fieldCount}</label>
                  <p className="hint" id="rsvp-hc-count-hint">{s.fieldCountHint(max)}</p>
                  {stepper('rsvp-hc-count', hcCount, setHcCount, errors.hcCount)}
                  {errors.hcCount && <p className="err" id="rsvp-hc-count-err">{errors.hcCount}</p>}
                </div>
              )}
            </fieldset>
          )}

          <div className="field">
            <label htmlFor="rsvp-message">{s.fieldMessage}</label>
            <textarea id="rsvp-message" rows={3} value={message} maxLength={cfg.rsvp.messageMaxLength + 50} onChange={(e) => setMessage(e.target.value)} aria-invalid={!!errors.message} aria-describedby="rsvp-message-count" />
            <p className="hint" id="rsvp-message-count" aria-live="polite">{s.charsLeft(Math.max(0, cfg.rsvp.messageMaxLength - message.length))}</p>
            {errors.message && <p className="err">{errors.message}</p>}
          </div>

          {status === 'error' && <p className="err" role="alert">{s.errSubmit}</p>}
          <button type="submit" className="btn btn--primary btn--block" disabled={status === 'sending'}>
            {status === 'sending' ? s.submitting : s.submit}
          </button>
        </form>
      )}
      <Contacts />
    </Sheet>
  );
}

export function Contacts() {
  const { cfg, s, l } = useInvite();
  const [copied, setCopied] = useState<string | null>(null);
  if (!cfg.contacts.length) return null;
  const copy = (phone: string) => {
    navigator.clipboard?.writeText(phone).then(
      () => {
        setCopied(phone);
        window.setTimeout(() => setCopied(null), 1600);
      },
      () => undefined,
    );
  };
  return (
    <div className="contacts">
      <p className="contacts-label">{s.contacts}</p>
      <ul>
        {cfg.contacts.map((c) => (
          <li key={c.phone}>
            <span className="contacts-who">{l(c.name)} <span className="contacts-role">{l(c.role)}</span></span>
            <span className="contacts-num">
              <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
              <button type="button" className="link link--small" onClick={() => copy(c.phone)}>{copied === c.phone ? s.copied : s.copy}</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
