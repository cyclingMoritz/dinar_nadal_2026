# Dinar de Nadal 2026 — survey → deck

Turns the Google Forms export of the team Christmas-lunch survey into a small
slide deck (static HTML, GitHub Pages–ready) with the main conclusions and a
restaurant shortlist.

```
data/raw/responses.csv     raw form export — git-ignored, never published
data/restaurants.json      hand-curated candidates (Ticket Restaurant + group menu)
pipeline/process.py        CSV → docs/data/summary.json (aggregates only, no names)
docs/                      the site = GitHub Pages root
  index.html               lab theme (default); other themes live in docs/<theme>/index.html
  deck.js                  builds chrome + slides, navigation, intros (dive / crawl)
  themes.js                every theme's wording, intro type, canvas effect, intro tiles
  fx.js                    canvas effects (snow, stars, paws), loaded only when a theme uses one
  style.css                base look (lab site: black/white, EB Garamond + Roboto Mono)
  themes/<theme>.css       per-theme skin + its SVG artwork
extras/music-box.js        original Web Audio waltz, parked (not deployed)
```

## Themes

| URL | Theme |
|---|---|
| `/` | Lab — black & white, modelled on the lab website |
| `/burton/` | Halloween is over — moonlit gothic, spiral hill, snow |
| `/pinkpanther/` | Case file Nº 12 — pink 60s detective caper, paw prints |
| `/starwars/` | Episode XII — opening crawl, starfield, desert planet |

All artwork and wording is original (no film characters, logos or music).
To add a theme: add an entry to `docs/themes.js`, a `docs/themes/<slug>.css`, and copy
any theme folder's `index.html` into `docs/<slug>/`, changing `data-theme` and the CSS link.

## Update the deck

```bash
python3 pipeline/process.py                # or: python3 pipeline/process.py path/to/new.csv
python3 -m http.server 8742 --directory docs   # preview at http://127.0.0.1:8742
```

Keys: ← → / space to move, Home/End, swipe on phones. `#4` in the URL opens slide 4.
Debug: `?introAt=1500` freezes the intro at 1.5 s.

## Publish on GitHub Pages

Push the repo to GitHub, then Settings → Pages → *Deploy from a branch* →
`main` / `/docs`. Only `docs/` is served; the raw CSV is never committed.

## Notes

- Food: the form said "max 2" but several people picked more, so each person's
  picks share one vote.
- Budget: a menu price "fits" a person if it is within the top of their band.
- Restaurant fit score = 50% food vote + 35% budget fit + 15% central.
  `avg_price` is the directory's à-la-carte average, not a group quote.
- Ticket Restaurant (Edenred) acceptance comes from bcnrestaurantes.com's filter;
  confirm by phone, including whether 15–20 people can each pay with their card.
- Font: the lab site uses 205TF Immortel Infra (licensed); EB Garamond stands in.
  If the lab has a web licence, drop the files in `docs/fonts/` and swap `--font-a`.
