# Vice Grade Studio

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Samot72/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline cover-art studio that turns your own photographs into GTA-style
multi-panel cover art and exports a finished PNG in the common post sizes —
1080 × 1080, 1080 × 1350 and 1920 × 1080. Built for the
[make.fun gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01).
Your photos are read on your own machine and never uploaded; the studio
makes no network request.

## What it does

- **Two render engines.** *Painterly* flattens a photo into posterised
  shapes with glowing edges, like airbrushed poster paint. *Ink* re-prints
  it as halftone dots with hard contour lines, like a screen-printed comic.
- **Five colour grades** — Neon Vice, Sunset Haze, Midnight Chrome, Golden
  Palms and Rain Noir — each a full gradient map applied per panel, with a
  one-click remix that varies the grade across a cover's panels.
- **Ten layouts**, each its own composition: Hero Grid (6 panels), Single
  Hero, Whole Cast (4 portraits with name plates), Slashed Comic Diagonal,
  Magazine Masthead with cover lines, Split Duo, Three-Panel Strip,
  Triptych Bands, Polaroid Stack and a Wanted Poster.
- **Printed furniture, drawn in code**: an editable masthead and tagline,
  a callout bubble, a starburst, an issue line, a rating-style seal, a
  billing block and a barcode hashed from your title.
- **A real workbench**: click a panel, click a photo to place it, drag to
  frame the shot, zoom per photo. Six painted sample photographs are built
  in so the studio works the second it opens; add your own by browse or
  drag-and-drop.
- **Cover Wall and Present modes** show finished covers full-frame, and
  Export PNG writes the cover at exactly the chosen post size.

## Run it

Serve `app/` with any static file server and open `index.html` in a desktop
browser — or run the kit's `node serve.ts` if you have it beside this repo.
No build step, no dependencies, no network.

## Hand in (maintainers)

`node main.ts` copies `app/` and `screenshots/` to `/output` (or
`$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the vendored
`vendor/makefun-app.ts` library, byte for byte as the scorer rebuilds it.

## License

MIT — see `LICENSE`.
