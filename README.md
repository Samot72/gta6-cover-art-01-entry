[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# ViceFrame Cover Studio — GTA-style cover art from your own photos

A make.fun entry for [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01): an offline
browser app that turns a photo and a caption into multi-panel, poster-style cover art with a
Vice City sunset/neon grade, exported as a PNG in the common post sizes. Everything is original —
no Rockstar Games logo, artwork or fonts; the lettering is drawn with system fonts, and the two
built-in scenes are painted by the app itself on a canvas.

## Run it

Serve `app/` with any static file server and open it in a desktop browser, for example:

```
cd app && python3 -m http.server 8080   # then open http://localhost:8080
```

No build step, no network requests: photos are read on your own machine and never uploaded.
The studio opens with two framed sample scenes loaded, plus two painted scenes it draws live,
so it makes a cover before you add a photo of your own.

## Controls

- **Add photos** (button, file picker, or drag & drop anywhere on the window) — each photo joins
  the strip and fills the selected panel.
- **Layout** — Hero + 3, Grid of 4, Triptych, or Full bleed panel arrangements.
- **Colour grade** — Vice sunset, Neon night, Golden hour, or Chrome noon, with a strength
  slider, film grain and vignette toggles. Neighbouring panels get a cooler counterpoint grade,
  the multi-panel poster feel.
- **Lettering** — a sunset-gradient condensed title, a neon script subtitle, a caption bar along
  the bottom, and a 0–5 heat-star row.
- **Selected panel** — click a panel on the cover to select it; drag to position its photo,
  scroll over it (or use the Zoom slider) to crop in, pick its photo from the list, fill every
  panel with one photo, or shuffle the panels.
- **Export size + Download PNG** — 1080 × 1080, 1080 × 1350, or 1920 × 1080, written in one click.

## Hand in (the entry program)

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output
directory and writes `dossier.json` there with `buildDossier` from `vendor/makefun-app.ts`,
then reads the output back and verifies it (index.html present, 3–4 screenshots within the
256 KiB cap, dossier under 1.5 MiB):

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout of this repository

- `app/index.html`, `app/style.css` — the editor page and its styling.
- `app/cover.js` — the cover engine: painted scenes, panel layouts, colour grades, lettering.
- `app/app.js` — the editor wiring: photos, panels, drag/zoom, live preview, PNG export.
- `app/samples/` — two framed sample scenes the studio ships and loads as photos.
- `screenshots/` — the studio with a photo loaded, and covers it exported (wide, square, portrait).
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.
- `LICENSE` — MIT.
