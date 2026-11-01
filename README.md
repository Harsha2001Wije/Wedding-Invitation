# Sinhala wedding invitation — scroll journey

A mobile-first, bilingual (English / සිංහල) wedding invitation. Guests scroll through
one continuous 3D journey: the envelope opens into the entrance garden, the hall doors
open as they approach, and the camera moves on to the Poruwa, the oil lamp, the
reception, the meal and an evening garden where they reply.

Everything a guest needs is real HTML text over the scenes, and the whole invitation is
also available as a calm single page (no animation) for reduced motion, devices without
WebGL, or anyone who taps **View invitation details**.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/ (3D world is a lazy-loaded chunk)
npm run build:single # one self-contained dist-single/index.html for quick sharing
npm run preview      # serve dist/ locally
```

Requires Node 18+. Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare
Pages, GitHub Pages, S3). No server is needed unless you connect a real RSVP backend.

`npm run build:single` produces the one-file build used for the shared preview link.
In that build the 3D world is inlined rather than lazy-loaded, and in sandboxed
previews file downloads are blocked, so use the Google Calendar option there.

Useful URLs while testing:

| URL | What it does |
| --- | --- |
| `/#details` | Opens the single-page invitation directly |
| `/#rsvp` | Opens the reply form on load |
| `/?to=Silva%20Family&seats=4&hc=1&code=AB12` | Personal link: greeting/prefilled name, party size, homecoming invitation, invite code |
| `/#debug` | Exposes renderer stats at `window.__three` (draw calls, triangles) |

---

## Editing the invitation

**Only edit `src/config/invitation.ts`.** Rendering code never contains invitation
content. The file holds:

| Key | Purpose |
| --- | --- |
| `demo` | `true` shows a small "Preview with sample details" label, labels replies as browser-only, and shows the homecoming to everyone. Set to `false` before sending. |
| `couple` | Names in English and Sinhala, and the seal monogram |
| `families` | Parent lines for each side (or `null` to hide) |
| `weddingDate`, `mainVenueId` | Date (Sri Lanka local) and main venue |
| `copy` | Opening line, welcome, main invitation wording, closing line, dress code (or `null`), dietary prompt |
| `events` | Every ceremony with title, description, date, **time**, `timeStatus`, venue, RSVP selectability |
| `venues` | Name, address and any maps link (`mapUrl`) for the Directions button |
| `scenes` | The journey: order, on/off, and scroll length per scene |
| `rsvp` | Deadline, default party size, dietary options, message limit, adapter |
| `contacts` | Names, roles and phone numbers shown with the reply form |
| `languages` | Default and available languages |
| `theme` | Palette used by both the HTML and the 3D materials |
| `audio` | Optional music: `src` for a licensed file, or `null` for the soft generated pad |
| `assets` | `posters` for final renders (see below) |

### Times: nothing is presented as confirmed until you say so

Every event has `time` (24h `"HH:MM"`, Sri Lanka local) and `timeStatus`:

- `'confirmed'` — the final time, e.g. the auspicious nekath from the family astrologer.
- `'sample'` — placeholder. Shown with a visible **"Sample time, not confirmed"** label.
- `'tba'` with `time: null` — shown as **"Time to be announced"** and left out of calendar files.

All sample data in the file is marked `'sample'`. Times show AM/PM (පෙ.ව./ප.ව. in
Sinhala) and the agenda states **Sri Lanka time (UTC+5:30)**. Times are formatted
directly from the config, so a guest abroad still sees the time printed on the card.

### Removing or reordering events

- Turn off an event with `enabled: false`. Its scene disappears, the camera path
  re-links to the next scene without a gap, and it drops out of the agenda, RSVP and
  calendar file.
- Reception moments (`kind: 'moment'`: couple's entrance, cake cutting, first dance)
  appear only when enabled. They are not assumed to be Sinhala traditions. Enabling
  cake cutting also places a cake table in the reception scene; first dance adds a
  dance floor.
- Lunch or dinner: set `mealType: 'lunch' | 'dinner'` and the title.
- Reorder or remove whole scenes in `scenes`. `length` is scroll distance in screen
  heights: the first part is camera travel, the rest is a still reading pause.

### Homecoming

The homecoming (`kind: 'homecoming'`) is shown as a clearly separate event (a fold-out
card on the closing scene, a separate block in the agenda and details page) with its own
date, time, venue, directions, calendar entry and its own yes/no + party size in the
reply form. With `eligibility: 'invited'` it is shown only to guests whose link has
`hc=1` (and to everyone while `demo` is `true`).

### Sinhala text

All Sinhala wording was drafted for this template. **Please have a native speaker in
the family read every line before sending** (config file and `src/lib/strings.ts` for
interface labels). Sinhala uses Noto Serif Sinhala / Noto Sans Sinhala with taller line
height, and a global rule removes letter spacing and forced capitals from Sinhala text.

---

## How it works

### Rendering approach (one coherent stack)

- **React + TypeScript** for the invitation UI.
- **React Three Fiber / Three.js** for one continuous 3D venue. There are no separate
  scene files: the garden, hall, Poruwa, lamp, reception, dining and evening garden are
  laid out in a single world, and the camera travels between "stations".
- **No GSAP and no scroll hijacking.** Native page scroll drives a tiny store
  (`src/lib/scroll.ts`). Each scene is a normal `<section>` whose height sets its scroll
  length. The camera reads the section progress every frame and follows a spline from
  the previous station (through doorways) to the next; a short damping smooths
  wheel steps. Scrolling back reverses everything exactly because nothing is a
  triggered animation.
- **The doors** open from the camera's distance to the doorway, so they track scroll
  progress, reverse on the way back, and still work if the arrival scene is removed.
- **The envelope** is DOM + SVG so the names and date are on screen instantly, before
  Three.js loads. Its painted card matches the first 3D view; as it grows and fades the
  real garden takes over.
- **Phones vs desktop**: each station has its own portrait and landscape framing
  (`src/lib/stations.ts`), and the camera uses an off-centre frustum so the Poruwa,
  doorway or lamp sits above the text on phones and beside it on desktop instead of
  being cropped.

### Realistic look

- **Physically based materials** (`src/three/materials.ts`): marble floors, lime
  plaster, teak with carved lotus relief, Sinhala clay roof tiles, flagstone, lawn,
  linen, palm bark and smudged brass, each with colour, normal and
  AO/roughness/metalness maps.
- **Textures are original.** `tools/gen_textures.py` paints every map procedurally
  (numpy + Pillow), including the flower and foliage cutouts (jasmine, buds,
  frangipani, roses, marigold, gypsophila, fern, coconut flower, palm frond, banana
  leaf, leaf sprigs, grass tufts, distant tree line, lotus petal). Re-run it to tweak:
  `python3 tools/gen_textures.py src/three/tex` (or name sets: `... src/three/tex teak,roof`).
- **Light**: three.js physical Sky for the morning garden and the dusk garden
  (no photo backgrounds with foreign landmarks), image-based lighting generated from
  those skies, and a CC0 Poly Haven interior HDRI (via `@pmndrs/assets`) for indoor
  reflections. A sun with soft shadows follows the camera; palm fronds and leaves cast
  dappled shadows through their alpha.
- **Post-processing** (`@react-three/postprocessing`): ambient occlusion (N8AO), bloom
  for lamps, candles and fairy lights, AgX filmic tone mapping, subtle vignette.
- **Flowers and foliage** are instanced cut-out cards, grouped by flower type, so
  thousands of blooms cost a handful of draw calls.
- **Flames** are an instanced shader with gentle flicker (no particles).

### Quality tiers (`src/three/quality.ts`)

| Tier | Used for | What it turns on |
| --- | --- | --- |
| high | desktops | MSAA, full-res AO, 2048 soft shadows, bloom, all flowers |
| medium | phones, tablets | half-res AO, 1024 shadows, bloom, SMAA, 75% decorative density |
| low | ≤4 cores / ≤3 GB memory, or after slow frames | no post-processing or shadows, glow sprites, 50% density |

The journey measures frame times after the envelope opens and steps down one tier
if the median frame is slower than ~26 fps. Force a tier with `?quality=high|medium|low`.

### If you later use pre-rendered video instead of real-time 3D

Do not rely on autoplay video. Convert the render to an image sequence or an
all-intra encoded MP4 (`-g 1`), and set `video.currentTime` from the same section
progress the camera uses now, with a WebP poster per scene as the lightweight
fallback. The scroll store and scene sections stay the same.

### Accessibility & fallbacks

- **Reduced motion**: opens the single-page invitation, with an option to play the
  journey anyway.
- **No WebGL / context lost / 3D error**: switches to the single-page invitation and
  says why. A painted CSS backdrop sits behind the journey until the 3D world is ready.
- **Asset failures**: if textures or the 3D chunk fail to load, the painted backdrop
  stays and every invitation detail remains readable; a 3D error switches to the
  single-page invitation. Optional posters are dropped if they fail to load; fonts
  fall back to system serif/sans and Sinhala system fonts; music failing to start
  just leaves the mute control off.
- Native `<dialog>` sheets (focus trapped, Escape closes), labelled fields, error
  summary linked to fields, visible focus, 44px+ tap targets, 16px inputs (no iOS
  zoom), the focused field is kept above the on-screen keyboard.
- Scene text that is faded out is also `inert` and hidden, so keyboard focus never
  lands on invisible buttons. Jumping to an event moves focus to its heading.

### Performance

- The opening (envelope, names, date) is in the small main bundle (~68 KB gzip), so
  the invitation details appear immediately. The 3D world code (~600 KB gzip,
  including the interior HDRI) and textures (~3.3 MB WebP) load lazily behind the
  envelope.
- Pixel ratio capped per tier (1.75 desktop, 1.5 phones, 1.0 low).
- Rendering is paused while the tab is hidden and runs on demand while the envelope
  covers the scene. Flowers, chairs, leaves, crystals and flames are instanced.
- To slim downloads further, halve the normal maps in `tools/gen_textures.py`
  (1024 → 512) or serve KTX2/Basis textures.
- Ambient music suspends when the tab is hidden.

---

## Backend integration points

| Where | What to connect |
| --- | --- |
| `src/lib/rsvp.ts` → `RsvpAdapter` | Set `rsvp.adapter = 'http'` and `rsvp.endpoint` to POST JSON replies, or write an adapter for Google Apps Script → Sheets, Supabase, Firebase, Airtable or Formspree. Payload: name, attending, party size, events, dietary, notes, message, homecoming reply, language, invite code, timestamp. |
| `src/lib/guest.ts` | Personal links currently trust URL parameters. In production, issue signed invite codes and look up party size and homecoming eligibility server-side. |
| `RsvpAdapter.previous()` | Currently reads this browser's last reply. Replace with a lookup by invite code so guests can change their reply from any device. |
| Reply confirmation | Optionally send an email/WhatsApp confirmation from the backend. The UI says "sent to the couple" only when the adapter reports `delivered: true`. |
| `audio.src` | Host a licensed music file and set its URL. |
| `assets.posters` | Host final scene renders (see `ASSET_BRIEFS.md`). |

The mock adapter never claims a reply was sent: it states that the reply was saved only
in this browser.

---

## Provisional visuals

Everything you see is original real-time 3D with original procedural textures made
for this prototype. It aims for a realistic look but is still real-time graphics, not
photography or film rendering. Candidates for final art (see `ASSET_BRIEFS.md`):

- Garden: lawn, path, hedges, flower beds, floral arches, coconut palms, frangipani
  (araliya), banana plants, lantern posts.
- Hall exterior: two-tier Kandyan-style roof, verandah, carved teak doors, pun kalasa
  with coconut flowers, jasmine garlands.
- Interior: columns, drapes, chandeliers, chairs, aisle and petals.
- Poruwa: two-tier platform, four pillars with jasmine, canopy, pun kalasa, lotus.
- Brass standing oil lamp with seven wicks (subtle flicker only).
- Reception room, round tables, stage, fairy lights; dining table with candles.
- Evening garden: lotus ponds, clay lamps, floral arch, fireflies.
- Envelope card painting (SVG).

No people are shown and no ritual actions are animated.

---

## Verification checklist

Run `npm run build && npm run preview`, then:

- [ ] Phone (≈390 × 844) and desktop (≈1440 × 900): every scene's text is readable and
      the focal point (doorway, Poruwa, lamp, arch) is visible beside or above it.
- [ ] Scroll forward and back slowly: doors open and close with scroll; text holds still
      while reading.
- [ ] Agenda → each arrow jumps to that event; the rail (desktop) jumps too.
- [ ] Set `enabled: false` on the oil lamp (and the meal): the journey still flows.
- [ ] Reply form: submit empty → error summary; party size above the limit → error;
      decline → no event/dietary fields; confirmation says it was not sent (mock).
- [ ] Toggle Sinhala: all text switches, no letter spacing on Sinhala.
- [ ] `prefers-reduced-motion` and a browser with WebGL disabled → single-page invitation.
- [ ] Add to calendar → times shown at Sri Lanka time.
