import type { InvitationConfig, Lang, WeddingEvent } from '../config/types';
import { colomboToUtcMs } from './time';

// Builds an iCalendar file. Times are written as UTC instants converted from
// Asia/Colombo (UTC+05:30), which every calendar app interprets correctly, and
// the calendar is tagged with X-WR-TIMEZONE so apps display it in Sri Lanka time.

function stamp(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold lines to 75 octets as RFC 5545 asks (safe for Sinhala multi-byte text). */
function fold(line: string) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(cfg: InvitationConfig, events: WeddingEvent[], lang: Lang) {
  const names = `${cfg.couple.bride[lang]} & ${cfg.couple.groom[lang]}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:Asia/Colombo',
    `X-WR-CALNAME:${esc(names)}`,
  ];
  const now = stamp(Date.now());
  for (const ev of events) {
    if (!ev.time) continue; // no time yet: nothing reliable to put in a calendar
    const venue = cfg.venues.find((v) => v.id === ev.venueId);
    const start = colomboToUtcMs(ev.date, ev.time);
    const end = ev.endTime ? colomboToUtcMs(ev.date, ev.endTime) : start + 60 * 60_000;
    const note = ev.timeStatus === 'sample' ? ' (sample time, not confirmed)' : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}-${ev.date}@wedding-invitation`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`${ev.title[lang]}, ${names}${note}`)}`,
      `DESCRIPTION:${esc(ev.description[lang] || '')}`,
      venue ? `LOCATION:${esc(`${venue.name[lang]}, ${venue.address[lang]}`)}` : '',
      venue ? `URL:${venue.mapUrl}` : '',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).map(fold).join('\r\n') + '\r\n';
}

/**
 * Google Calendar "add event" link. Works everywhere a link opens, including
 * sandboxed previews where file downloads are blocked.
 */
export function googleCalendarUrl(cfg: InvitationConfig, ev: WeddingEvent, lang: Lang) {
  if (!ev.time) return null;
  const venue = cfg.venues.find((v) => v.id === ev.venueId);
  const start = colomboToUtcMs(ev.date, ev.time);
  const end = ev.endTime ? colomboToUtcMs(ev.date, ev.endTime) : start + 60 * 60_000;
  const names = `${cfg.couple.bride[lang]} & ${cfg.couple.groom[lang]}`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${ev.title[lang]}, ${names}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    ctz: 'Asia/Colombo',
    details: ev.description[lang] || '',
    location: venue ? `${venue.name[lang]}, ${venue.address[lang]}` : '',
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Downloads the .ics file (Apple Calendar, Outlook, Google import). */
export function downloadIcs(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
