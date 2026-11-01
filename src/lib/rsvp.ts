import type { RsvpConfig } from '../config/types';

// ─── RSVP submission adapters ────────────────────────────────────────────────
// The form only talks to `RsvpAdapter`. Swap the mock for a real backend by
// setting `rsvp.adapter = 'http'` and `rsvp.endpoint` in the config, or write
// your own adapter (Google Apps Script, Supabase, Firebase, Formspree…).

export interface RsvpPayload {
  inviteCode: string | null;
  name: string;
  attending: boolean;
  partySize: number;
  events: string[];
  dietary: string[];
  dietaryNotes: string;
  message: string;
  /** Separate reply for the homecoming, when the guest is invited to it. */
  homecoming: { attending: boolean; partySize: number } | null;
  language: 'en' | 'si';
  submittedAt: string; // ISO
}

export interface RsvpResult {
  ok: boolean;
  /** true only when the reply really reached a server. */
  delivered: boolean;
  error?: string;
}

export interface RsvpAdapter {
  submit(payload: RsvpPayload): Promise<RsvpResult>;
  /** The guest's previous reply on this device, if any. */
  previous(): RsvpPayload | null;
}

const KEY = 'wedding-rsvp-reply';

function remember(p: RsvpPayload) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage can be blocked (private mode, sandbox): the reply still shows as done */
  }
}

function recall(): RsvpPayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RsvpPayload) : null;
  } catch {
    return null;
  }
}

/** Demo adapter: nothing leaves the browser. The UI says so plainly. */
export const mockAdapter: RsvpAdapter = {
  async submit(payload) {
    await new Promise((r) => setTimeout(r, 650));
    remember(payload);
    return { ok: true, delivered: false };
  },
  previous: recall,
};

/** Minimal JSON POST adapter. Integration point: see README → Backend. */
export function httpAdapter(endpoint: string): RsvpAdapter {
  return {
    async submit(payload) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return { ok: false, delivered: false, error: `HTTP ${res.status}` };
        remember(payload);
        return { ok: true, delivered: true };
      } catch (e) {
        return { ok: false, delivered: false, error: String(e) };
      }
    },
    previous: recall,
  };
}

export function createAdapter(cfg: RsvpConfig): RsvpAdapter {
  if (cfg.adapter === 'http' && cfg.endpoint) return httpAdapter(cfg.endpoint);
  return mockAdapter;
}
