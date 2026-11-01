# Final asset briefs

The prototype's venue is provisional real-time 3D with a realistic look. These briefs describe matching
final renders (stills and optional camera-move clips) so a 3D artist, studio or
image/video model can produce a consistent set. They can replace or sit behind the
real-time scene (see README → "pre-rendered video").

## Rules that apply to every asset

- **No text of any kind**: no names, dates, times, monograms, signage, calligraphy or
  lettering. All wording is live HTML laid over the images.
- **No people**, no hands, no silhouettes. No ritual actions in progress.
- Sinhala wedding context only. Do not add Hindu, Christian, Islamic, Western-church or
  other unrelated religious symbols, deity imagery, Ganesh motifs, crosses, Om, or
  Indian mandap styling. No Buddhist statues or temple-specific sacred objects.
- Same building, same materials, same time of day progression in every shot.
- Deliver each shot in two framings: **landscape 16:9 (3840 × 2160)** and **portrait
  9:19.5 (1290 × 2796)**. Do not crop one from the other.
- Leave a calm, low-detail **text zone**: landscape = left 40% of the frame;
  portrait = bottom 45% of the frame. The focal subject sits in the right 55%
  (landscape) or upper 50% (portrait).
- Export stills as WebP (quality ~80) plus AVIF; clips as all-intra H.264 (`-g 1`) or
  image sequences so they can be scrubbed by scroll.

## Shared look (put this paragraph in every prompt)

> Photorealistic architectural and wedding-décor photography: real materials
> (polished marble, lime plaster, oiled teak, polished brass, linen, fresh flowers),
> natural daylight or warm practical lighting with soft, believable shadows, true-to-life
> colour, shallow depth of field, 35–50 mm lens look; elegant and romantic, never
> over-saturated. Palette: warm ivory (#FBF6EC) and pearl
> (#F1E9DA), champagne gold (#C8A45D) and polished brass, muted tropical greens
> (#5F7A5A), subtle blush (#E6B9AE). Sri Lankan setting: a white colonial-era pavilion
> with a two-tier Kandyan-style hipped roof of terracotta clay tiles, carved teak doors
> with brass inlay, jasmine (pichcha) garlands, frangipani (araliya), lotus, coconut
> palms, brass pun kalasa (pot of plenty) holding coconut-flower (pol mal) sprays.
> No people. No text.

## Architecture reference (keep consistent)

- Pavilion: symmetrical white facade, raised verandah plinth with three broad steps,
  four slim white columns with gold capitals, a central pair of tall carved teak doors
  (each leaf with two recessed gold-edged panels and a brass ring handle), tall
  windows with warm light behind them. Two-tier terracotta hipped roof with a white
  clerestory band and thin gold trim.
- Interior main hall: ivory walls, white columns with gold capitals, ivory draped
  fabric swags across the ceiling, two brass ring chandeliers strung with jasmine,
  aisle runner in ivory with fine gold borders, rows of ivory-covered chairs with
  blush sashes, slim brass pedestals with white-and-blush bouquets.
- Poruwa (at the far end of the hall, centred): two-tier white platform with gold
  edges and a small front step; four slim white pillars spiralled with jasmine; a
  white pyramidal canopy with gold trim and a gold lotus finial; jasmine fringe under
  the canopy; brass pun kalasa with coconut-flower sprays at the four corners; two
  pale pink lotus blooms beside the step; a floral arch of jasmine and blush blooms
  and soft ivory drapes behind. Platform clean and empty: no ritual items on it.
- Oil lamp: tall polished brass standing oil lamp (pahana) with ringed stem and a wide
  dish with seven small flames, on a low ivory dais ringed with jasmine and marigold.
- Reception room to the east, through a wide arched opening: round tables with
  floor-length ivory cloths, brass candle stands with floral spheres, ivory chairs with
  blush sashes, a low stage with a blush loveseat and a floral backdrop, warm fairy
  lights strung across the ceiling.
- Dining: one long table with ivory cloth and a blush runner, white plates, short
  brass candlesticks, low floral runner, three hanging glowing lanterns.
- Evening garden beyond the reception: stone path, two rectangular lotus ponds,
  rows of small clay oil lamps along the path, a large floral arch of jasmine and
  greenery framing the dusk sky, fairy-light strings on teak poles, palms in
  silhouette, a few fireflies.

## Shot list

| # | Scene | Time of day / light | Camera | Focal subject |
|---|---|---|---|---|
| 1 | Envelope (optional still) | Soft window light | Overhead 3/4, close | Ivory envelope with gold wax seal (no monogram letters), jasmine sprigs around |
| 2 | Garden approach | Morning, 9–10 am, soft warm sun from front-left, light haze | Eye level 1.7 m on the path, 40 m from the doors, 35 mm, slow dolly forward | Path through two floral arches toward the pavilion; palms and banana leaves at varied depths for parallax |
| 3 | Entrance | Same morning light | 18 m from the doors, slight upward tilt, 35 mm | Closed teak doors, verandah, pun kalasa either side, full roof visible |
| 4 | Doors opening (clip) | Same; warm interior glow growing through the gap | Slow push from 9 m to 3.5 m, centred | The two door leaves swinging inward in sync (scrub-ready, 4–6 s) |
| 5 | Hall | Warm interior, chandeliers on, daylight through left windows | Eye level just inside the doorway, 35 mm, looking down the aisle | Aisle leading to the Poruwa in the distance |
| 6 | Poruwa | Warm, soft frontal fill, gentle backlight on the floral arch | 9 m in front, slightly above platform height, 40 mm, almost static | The Poruwa, centred within the subject zone |
| 7 | Oil lamp | Lamp flames as key light, warm and low | 3.5 m, slightly above the dish, 50 mm, shallow depth of field | The brass lamp and its seven flames, subtle flicker only |
| 8 | Reception | Warm interior, fairy lights | From the archway, elevated 2.5 m, 35 mm | Round tables and the floral stage |
| 9 | Dining | Candlelit with lantern glow | Elevated 2.6 m at the table's near end, 40 mm | The long table receding |
| 10 | Evening garden | Dusk: deep blue sky, blush horizon, warm lamp light | Eye level on the path 9 m from the arch, 35 mm | Floral arch with the dusk sky through it, lotus ponds, clay lamps |

## Prompt template (per shot)

```
[Shared look paragraph]
Scene: [scene description from the architecture reference].
Light: [time of day / light].
Camera: [camera], [landscape 16:9 | portrait 9:19.5].
Composition: focal subject in the [right 55% | upper 50%]; keep the [left 40% | bottom 45%]
calm and low-detail for overlaid text.
Strictly no text, letters, numbers, signage, people, or unrelated religious symbols.
```

## Where they plug in

- Stills → `assets.posters` in `src/config/invitation.ts` (used by the single-page
  invitation and as fallbacks).
- Scrubbed clips → see README → "If you later use pre-rendered video". Keep the
  per-scene camera direction above so the clips line up with the scroll sections.
