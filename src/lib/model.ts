import type { InvitationConfig, SceneKind, WeddingEvent } from '../config/types';
import type { GuestInfo } from './guest';
import { sortEvents } from './time';

export interface ResolvedScene {
  key: string;
  kind: SceneKind;
  event?: WeddingEvent;
  /** Scroll length in viewport heights. */
  length: number;
  domId: string;
}

const DEFAULT_LENGTH: Record<SceneKind, number> = {
  envelope: 1.7,
  arrival: 2.6,
  hall: 3.2,
  poruwa: 2.6,
  oilLamp: 2.2,
  reception: 2.6,
  meal: 2.3,
  closing: 2.4,
};

export interface Model {
  scenes: ResolvedScene[];
  /** Wedding-day events in time order (no reception moments, no homecoming). */
  agenda: WeddingEvent[];
  momentsOf: (id: string) => WeddingEvent[];
  homecoming: WeddingEvent | null;
  rsvpEvents: WeddingEvent[];
  sceneForEvent: (id: string) => ResolvedScene | undefined;
  flags: { cake: boolean; entrance: boolean; firstDance: boolean; meal: 'lunch' | 'dinner' };
}

export function buildModel(cfg: InvitationConfig, guest: GuestInfo): Model {
  const eligible = (e: WeddingEvent) =>
    e.kind !== 'homecoming' || e.eligibility !== 'invited' || guest.homecoming || cfg.demo;
  const events = cfg.events.filter((e) => e.enabled && eligible(e));
  const byId = new Map(events.map((e) => [e.id, e]));

  const scenes: ResolvedScene[] = cfg.scenes
    .filter((s) => s.enabled && (!s.eventId || byId.has(s.eventId)))
    .map((s, i) => ({
      key: `${s.kind}-${i}`,
      kind: s.kind,
      event: s.eventId ? byId.get(s.eventId) : undefined,
      length: Math.max(1.3, s.length ?? DEFAULT_LENGTH[s.kind]),
      domId: `scene-${s.kind}`,
    }));

  const agenda = sortEvents(events.filter((e) => e.kind !== 'moment' && e.kind !== 'homecoming'));
  const momentsOf = (id: string) => sortEvents(events.filter((e) => e.kind === 'moment' && e.parentId === id));
  const homecoming = events.find((e) => e.kind === 'homecoming') ?? null;
  const rsvpEvents = agenda.filter((e) => e.rsvpSelectable);

  const sceneForEvent = (id: string) => {
    const ev = byId.get(id);
    const target = ev?.kind === 'moment' && ev.parentId ? ev.parentId : id;
    return scenes.find((s) => s.event?.id === target);
  };

  const has = (id: string) => byId.has(id);
  const meal = events.find((e) => e.kind === 'meal');
  return {
    scenes,
    agenda,
    momentsOf,
    homecoming,
    rsvpEvents,
    sceneForEvent,
    flags: {
      cake: has('cake'),
      entrance: has('entrance'),
      firstDance: has('first-dance'),
      meal: meal?.mealType ?? 'lunch',
    },
  };
}
