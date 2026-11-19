# Poster Lab — a GTA-style cover art studio

[![Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Poster Lab turns a photo and a caption into cover art in the spirit of the
classic multi-panel game posters: bold gradient lettering, a Vice City
sunset-or-neon colour grade, and a PNG you can share. It runs entirely in
the browser from static files — your photos never leave your machine.

## What it does

- **Any photo** — add your own pictures (or drop them onto the cover), then
  click a panel to select it, drag inside it to reframe, scroll to zoom.
  One photo can fill every panel, or each panel can carry a different one.
- **Five panel layouts** — Spotlight (a tall hero panel with a trio beside
  it), Quad grid, Triptych columns, Billboard + pair, and a Full bleed
  single frame.
- **Five colour grades** — Vice Sunset, Neon Nights, Golden Hour, Chrome
  Noon and Midnight Teal, each with its own strength slider.
- **Lettering** — a gradient title that auto-fits the frame, an italic
  subtitle, a letterspaced caption bar and a row of heat stars.
- **Fast exports** — one click renders a finished PNG at 1080×1080,
  1080×1350 or 1920×1080.
- **Forgiving** — a Random mix button for instant inspiration and a
  sixty-step Undo for everything else.
- **No photos handy?** Two stand-in scenes — a sunset boulevard and a neon
  street — are painted at runtime by the app's own canvas painter and ship
  as the starter photos.

## Run it

Serve the `app/` folder with any static file server and open `index.html`
in a desktop browser, for example:

```sh
npx serve app
# or
python3 -m http.server --directory app
```

There is no build step and nothing to install; the app loads no network
resources.

## How it is built

Everything lives in one module, `app/poster.js`, in five parts: seeded
random and colour utilities; two procedural scene painters (canvas paths
only — palms, skylines, a striped retro sun, neon signs and their wet-street
reflections); the five colour grades, layered with blend-mode gradients;
the panel layouts and cover renderer with its lettering; and the editor,
which wires the page controls to a small state object with undo history.
`app/index.html` and `app/style.css` are the page and its theme.

`main.ts` (Node 22, standard library only) hands the entry in: it copies
`app/` and `screenshots/` to the output folder and writes `dossier.json`
with `buildDossier` from `vendor/makefun-app.ts`.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Originality

Poster Lab is an original fan tool. It uses no Rockstar Games or Take-Two
logos, artwork, characters or fonts; the lettering is set in system font
stacks, and every image in the screenshots is either painted by the app's
own code or a photo the maker supplied.

## License

MIT — see `LICENSE`.
