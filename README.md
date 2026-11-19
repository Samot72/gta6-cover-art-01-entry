[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# ViceFrame Cover Studio — poster-style cover art from your own photos

An entry for make.fun's [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01).

ViceFrame is a small, self-contained web app that turns a photo and a caption
into multi-panel poster-style cover art: a wide lead panel with a stack beside
it (or a grid, a triptych, a single full bleed), a sunset-to-neon colour grade,
big condensed lettering with a script subtitle, and a PNG export in the sizes
people actually post. It runs entirely in the browser from its own static
files — no server, no uploads, no network requests — so your photos never
leave your machine.

Everything here is the entry's own work. There is no Rockstar Games logo,
artwork or font anywhere; the lettering uses system font stacks, and the demo
artwork is painted by the app itself on a canvas.

## Trying it

Serve the `app/` folder with any static file server and open it in a desktop
browser:

```
cd app && python3 -m http.server 8080
# then visit http://localhost:8080
```

There is nothing to build. The studio opens with four pictures on the shelf —
two framed stills it ships under `app/samples/`, and the same two scenes
painted live by its own engine (a sunset boulevard and a neon street) — so
you can make a first poster before adding a photo of your own.

## What the controls do

- **Add photos** — the masthead button, the file picker, or drag & drop onto
  the window. A photo you add lands in the selected panel.
- **Layout** — Hero + 3, Grid of 4, Triptych or Full bleed.
- **Colour grade** — Vice sunset, Neon night, Golden hour or Chrome noon,
  with a strength slider and film grain / vignette switches. Odd panels are
  dealt the grade's cooler alternate recipe, which is what makes the sheet
  feel printed rather than filtered.
- **Lettering** — a gradient title in a condensed stack, a neon script
  subtitle tucked under it, a caption ribbon along the bottom edge, and a
  row of 0–5 heat stars.
- **Selected panel** — click a panel on the poster to select it; drag on the
  poster to position its photo, scroll over a panel (or use the Zoom slider)
  to crop, swap its photo from the list, fill every panel with one photo, or
  shuffle the panels around.
- **Export size, then Download PNG** — 1080 × 1080, 1080 × 1350 or
  1920 × 1080, written at full size in one click.

## How the entry is handed in

`main.ts` is the entry program (Node 22, standard library only). It mirrors
`app/` and `screenshots/` into the output directory, writes a `dossier.json`
there using `buildDossier` from the vendored library in
`vendor/makefun-app.ts`, and then audits its own delivery: the app tree's
entry count, total bytes and longest path, the screenshot count with each
shot's weight and pixel sides, and the dossier's size, all against the
gate's caps. Outside the grader, `MAKEFUN_OUTPUT_DIR` stands in for
`/output`:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## What's in the repository

- `app/index.html` and `app/style.css` — the editor page and its styling.
- `app/cover.js` — the poster engine: panel layouts, colour grades,
  lettering, grain and vignette, and the two scenes the studio paints.
- `app/app.js` — the editor: photo loading, panel selection, drag and zoom,
  the live preview and the PNG export.
- `app/samples/` — the two framed scene stills the studio ships.
- `screenshots/` — the studio with a photo loaded, and posters it exported
  (wide, square and portrait).
- `vendor/makefun-app.ts` — the kit's dossier library, byte for byte
  unchanged.
- `LICENSE` — MIT.
