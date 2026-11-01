import { createContext, useContext } from 'react';
import type { InvitationConfig, L10n, Lang } from '../config/types';
import type { GuestInfo } from '../lib/guest';
import type { Model } from '../lib/model';
import type { Strings } from '../lib/strings';

export interface InviteCtx {
  cfg: InvitationConfig;
  lang: Lang;
  s: Strings;
  /** Pick the current language from an L10n value. */
  l: (v: L10n | null | undefined) => string;
  model: Model;
  guest: GuestInfo;
  openRsvp: (focus?: 'dietary') => void;
  openAgenda: () => void;
  openEdit: () => void;
  updateConfig: (newCfg: InvitationConfig) => void;
  resetConfig: () => void;
  jumpToEvent: (eventId: string) => void;
  jumpToScene: (index: number) => void;
  showDetails: () => void;
}

export const Ctx = createContext<InviteCtx | null>(null);

export function useInvite() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useInvite outside provider');
  return c;
}
