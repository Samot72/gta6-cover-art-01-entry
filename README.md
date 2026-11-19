[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# ViceFrame Cover Studio — poster-style cover art from your own photos

An entry for make.fun's [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).
ViceFrame is a small web app that takes a photo and a caption and lays them out as
multi-panel poster-style cover art — a tall hero panel with a stack beside it, a
sunset-to-neon colour grade, big condensed lettering — then exports the result as a
PNG in the sizes people actually post. It runs entirely in the browser from its own
static files: no server, no uploads, no network requests, and your photos stay on
your machine.

Everything in the entry is its own work. There is no Rockstar Games logo, artwork or
font anywhere; the lettering is set in system font stacks, and the demo artwork is
painted by the app itself on a canvas.

## Trying it

Serve the `app/` folder with any static file server and open it in a desktop browser:

```
cd app && python3 -m http.server 8080
# then visit http://localhost:8080
```

There is nothing to build. The studio starts with four pictures already loaded —
two framed sample scenes it ships, and two scenes it paints live (a sunset
boulevard and a neon street) — so you can make a first cover before adding a
photo of your own.

## What the controls do

- **Add photos** — the button, the file picker, or drag & drop onto the window.
  A photo you add goes straight into the selected panel.
- **Layout** — Hero + 3, Grid of 4, Triptych or Full bleed.
- **Colour grade** — Vice sunset, Neon night, Golden hour or Chrome noon, with a
  strength slider plus film grain and vignette switches. Alternate panels are
  dealt a cooler counterpoint grade, which is what gives the printed multi-panel
  feel.
- **Lettering** — a sunset-gradient title in a condensed stack, a neon script
  subtitle tucked under it, a caption strip along the bottom edge, and a row of
  0–5 heat stars.
- **Selected panel** — click a panel on the cover to select it; drag on the cover
  to position its photo, scroll over a panel (or use the Zoom slider) to crop,
  swap its photo from the list, fill every panel with one photo, or shuffle the
  panels around.
- **Export size, then Download PNG** — 1080 × 1080, 1080 × 1350 or 1920 × 1080,
  written at full size in one click.

## How the entry is handed in

`main.ts` is the entry program (Node 22, standard library only). It copies `app/`
and `screenshots/` into the output directory and writes a `dossier.json` there
using `buildDossier` from the vendored library in `vendor/makefun-app.ts`, then
reads its own output back and checks it: the app's index page is present, there
are 3–4 screenshots, each within the byte and pixel-side limits, and the dossier
is under its size cap. Outside the grader, `MAKEFUN_OUTPUT_DIR` stands in for
`/output`:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## What's in the repository

- `app/index.html` and `app/style.css` — the editor page and its styling.
- `app/cover.js` — the cover engine: panel layouts, colour grades, lettering,
  grain and vignette, and the two scenes the studio paints for itself.
- `app/app.js` — the editor: picture loading, panel selection, drag and zoom,
  the live preview and the PNG export.
- `app/samples/` — the two framed sample scenes the studio ships.
- `screenshots/` — the studio with a photo loaded, and covers it exported
  (wide, square and portrait).
- `vendor/makefun-app.ts` — the kit's dossier library, byte for byte unchanged.
- `LICENSE` — MIT.
