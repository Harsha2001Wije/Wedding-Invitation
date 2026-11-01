import type { InvitationConfig } from '../config/types';

const STORAGE_KEY = 'mangala_custom_invitation';

export function loadStoredConfig(fallback: InvitationConfig): InvitationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const cleanedEvents = Array.isArray(parsed.events) && parsed.events.length > 0
      ? parsed.events.map((ev: { timeStatus?: string }) => ({
          ...ev,
          timeStatus: ev.timeStatus === 'sample' ? 'confirmed' : ev.timeStatus,
        }))
      : fallback.events;

    return {
      ...fallback,
      ...parsed,
      demo: false,
      couple: {
        ...fallback.couple,
        ...(parsed.couple || {}),
        bride: { ...fallback.couple.bride, ...(parsed.couple?.bride || {}) },
        groom: { ...fallback.couple.groom, ...(parsed.couple?.groom || {}) },
      },
      families: parsed.families !== undefined ? parsed.families : fallback.families,
      copy: { ...fallback.copy, ...(parsed.copy || {}) },
      rsvp: { ...fallback.rsvp, ...(parsed.rsvp || {}) },
      theme: { ...fallback.theme, ...(parsed.theme || {}) },
      audio: { ...fallback.audio, ...(parsed.audio || {}) },
      assets: { ...fallback.assets, ...(parsed.assets || {}) },
      events: cleanedEvents,
      venues: Array.isArray(parsed.venues) && parsed.venues.length > 0 ? parsed.venues : fallback.venues,
      scenes: Array.isArray(parsed.scenes) && parsed.scenes.length > 0 ? parsed.scenes : fallback.scenes,
      contacts: Array.isArray(parsed.contacts) && parsed.contacts.length > 0 ? parsed.contacts : fallback.contacts,
    };
  } catch (err) {
    console.warn('Failed to load customized invitation config from storage:', err);
    return fallback;
  }
}

export function saveStoredConfig(config: InvitationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save customized invitation config:', err);
  }
}

export function resetStoredConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear customized invitation config:', err);
  }
}

export function downloadConfigJson(config: InvitationConfig): void {
  const jsonStr = JSON.stringify(config, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wedding-invitation-config-${config.weddingDate || 'custom'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

