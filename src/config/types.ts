// Types for the single editable invitation configuration (src/config/invitation.ts).
// Rendering code only reads from this shape, so content and visuals stay separate.

export type Lang = 'en' | 'si';

/** Text in every supported language. */
export interface L10n {
  en: string;
  si: string;
}

/**
 * How trustworthy a time is.
 * - confirmed: final time from the couple/families (e.g. the auspicious nekath time).
 * - sample:    placeholder for preview only. Shown with a visible "sample" label.
 * - tba:       not yet known. Shown as "Time to be announced".
 */
export type TimeStatus = 'confirmed' | 'sample' | 'tba';

export type EventKind =
  | 'poruwa'
  | 'oilLamp'
  | 'reception'
  | 'moment' // optional reception moments: entrance, cake cutting, first dance…
  | 'meal'
  | 'homecoming'
  | 'custom';

export interface WeddingEvent {
  id: string;
  kind: EventKind;
  /** Turn an event off without deleting it. Its scene disappears and the journey re-links. */
  enabled: boolean;
  title: L10n;
  description: L10n;
  /** Local Sri Lanka date, YYYY-MM-DD. */
  date: string;
  /** Local Sri Lanka time, 24h "HH:MM", or null when not yet known. */
  time: string | null;
  /** Optional end time, 24h "HH:MM". Used for calendar export. */
  endTime?: string | null;
  timeStatus: TimeStatus;
  venueId: string;
  /** Guests can tick this event in the RSVP form. */
  rsvpSelectable: boolean;
  /** For `moment` events: the event they belong to (usually the reception). */
  parentId?: string;
  /** For `meal` events. */
  mealType?: 'lunch' | 'dinner';
  /** For `homecoming`: who may see and RSVP to it. */
  eligibility?: 'all' | 'invited';
}

export interface Venue {
  id: string;
  name: L10n;
  address: L10n;
  /** Any maps link (Google Maps, Apple Maps, PickMe…). Opens in a new tab. */
  mapUrl: string;
}

export interface FamilySide {
  parents: L10n;
  /** Optional hometown or family line, e.g. "of Kandy". */
  from?: L10n;
}

export type SceneKind =
  | 'envelope'
  | 'arrival'
  | 'hall'
  | 'poruwa'
  | 'oilLamp'
  | 'reception'
  | 'meal'
  | 'closing';

export interface SceneConfig {
  kind: SceneKind;
  enabled: boolean;
  /** For event scenes: which event's time/title to show. */
  eventId?: string;
  /**
   * Scroll length in viewport heights. Longer = more reading time.
   * The first ~third is camera travel; the rest is a calm reading hold.
   */
  length?: number;
}

export interface RsvpConfig {
  deadline: string; // YYYY-MM-DD
  /** Party size if the invitation link doesn't specify one (?seats=3). */
  defaultMaxParty: number;
  dietaryOptions: { id: string; label: L10n }[];
  messageMaxLength: number;
  /**
   * 'mock' keeps responses in this browser only and says so.
   * 'http' POSTs JSON to `endpoint` (see src/lib/rsvp.ts).
   */
  adapter: 'mock' | 'http';
  endpoint?: string;
}

export interface Contact {
  name: L10n;
  role: L10n;
  phone: string;
}

export interface ThemeConfig {
  ivory: string;
  pearl: string;
  gold: string;
  goldDeep: string;
  green: string;
  blush: string;
  ink: string;
}

export interface AudioConfig {
  enabled: boolean;
  /**
   * URL of a licensed music file (mp3/ogg). When null, a soft generated
   * ambient pad is used instead (no external file needed).
   */
  src: string | null;
  volume: number;
}

export interface AssetConfig {
  /**
   * 'procedural' = the built-in, provisional 3D scenery (no downloads).
   * When final renders exist, put them in `posters` to use as the
   * static/reduced-motion backgrounds (see README → Final assets).
   */
  mode: 'procedural';
  posters: Partial<Record<SceneKind, string>>;
}

export interface InvitationConfig {
  demo: boolean;
  couple: {
    bride: L10n;
    groom: L10n;
    /** Short monogram letters, e.g. "N & K". */
    monogram: string;
  };
  families: { bride: FamilySide; groom: FamilySide } | null;
  weddingDate: string; // YYYY-MM-DD
  mainVenueId: string;
  copy: {
    opening: L10n;
    welcome: L10n;
    invitation: L10n;
    familyIntro: L10n;
    closing: L10n;
    dressCode: L10n | null;
    mealDietaryPrompt: L10n;
  };
  events: WeddingEvent[];
  venues: Venue[];
  scenes: SceneConfig[];
  rsvp: RsvpConfig;
  contacts: Contact[];
  languages: { default: Lang; available: Lang[] };
  theme: ThemeConfig;
  audio: AudioConfig;
  assets: AssetConfig;
}
