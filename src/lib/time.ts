import type { Lang, WeddingEvent } from '../config/types';

// All invitation dates/times are local Sri Lanka time (Asia/Colombo, UTC+05:30,
// no daylight saving). We format them directly instead of through the viewer's
// time zone, so a guest in London still sees the time printed on the card.

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SI = ['ජනවාරි','පෙබරවාරි','මාර්තු','අප්‍රේල්','මැයි','ජූනි','ජූලි','අගෝස්තු','සැප්තැම්බර්','ඔක්තෝබර්','නොවැම්බර්','දෙසැම්බර්'];
const DAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SI = ['ඉරිදා','සඳුදා','අඟහරුවාදා','බදාදා','බ්‍රහස්පතින්දා','සිකුරාදා','සෙනසුරාදා'];

export const COLOMBO_OFFSET_MIN = 330;

function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "9:41" + period, e.g. { clock: '9:41', period: 'AM' } or Sinhala පෙ.ව./ප.ව. */
export function timeParts(hhmm: string, lang: Lang) {
  const [h, m] = hhmm.split(':').map(Number);
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const clock = `${h12}:${String(m).padStart(2, '0')}`;
  const period = lang === 'si' ? (am ? 'පෙ.ව.' : 'ප.ව.') : am ? 'AM' : 'PM';
  return { clock, period, periodFirst: lang === 'si' };
}

export function formatTime(hhmm: string, lang: Lang) {
  const p = timeParts(hhmm, lang);
  return p.periodFirst ? `${p.period} ${p.clock}` : `${p.clock} ${p.period}`;
}

export function formatDate(ymd: string, lang: Lang, withWeekday = true) {
  const { y, m, d, weekday } = parseYmd(ymd);
  if (lang === 'si') {
    const base = `${y} ${MONTHS_SI[m - 1]} ${d}`;
    return withWeekday ? `${base}, ${DAYS_SI[weekday]}` : base;
  }
  const base = `${d} ${MONTHS_EN[m - 1]} ${y}`;
  return withWeekday ? `${DAYS_EN[weekday]}, ${base}` : base;
}

/** Compact date for small UI: "13.02.2027" */
export function formatDateDots(ymd: string) {
  const { y, m, d } = parseYmd(ymd);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

/** Absolute instant (ms) of a Sri Lanka local date + time. */
export function colomboToUtcMs(ymd: string, hhmm: string) {
  const { y, m, d } = parseYmd(ymd);
  const [h, min] = hhmm.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, min) - COLOMBO_OFFSET_MIN * 60_000;
}

/** Today's date in Sri Lanka, YYYY-MM-DD. */
export function colomboToday(now = Date.now()) {
  const t = new Date(now + COLOMBO_OFFSET_MIN * 60_000);
  return t.toISOString().slice(0, 10);
}

export function sortEvents(events: WeddingEvent[]) {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const ta = a.time ?? '99:99';
    const tb = b.time ?? '99:99';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}
