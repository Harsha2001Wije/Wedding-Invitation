// Per-guest personalisation from the invitation link.
//
//   ?to=Silva%20Family&seats=4&hc=1&code=AB12
//
//   to    – greeting / prefilled name
//   seats – maximum party size for this invitation
//   hc    – 1 if the guest is also invited to the homecoming
//   code  – opaque invite code passed through to the RSVP backend
//
// INTEGRATION POINT: in production, issue a signed invite code and look up
// seats / homecoming eligibility on the server instead of trusting the URL.

export interface GuestInfo {
  name: string | null;
  maxParty: number | null;
  homecoming: boolean;
  code: string | null;
}

export function readGuest(search = typeof location !== 'undefined' ? location.search : ''): GuestInfo {
  const p = new URLSearchParams(search);
  const seats = Number(p.get('seats'));
  return {
    name: p.get('to')?.slice(0, 80) || null,
    maxParty: Number.isFinite(seats) && seats >= 1 && seats <= 20 ? Math.floor(seats) : null,
    homecoming: p.get('hc') === '1',
    code: p.get('code')?.slice(0, 40) || null,
  };
}
