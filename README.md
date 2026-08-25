# POMEIL

Thirty digital educational escape rooms for teaching transversal and entrepreneurial
skills, with a learning flow that scores each room and recommends study material from
the result. Six languages. No installation and no account required to play.

Live platform: **[pomeil.eu](https://pomeil.eu)** · Learning journey: [pomeil.eu/learning](https://pomeil.eu/learning)

POMEIL — *Promotion of Migrant Entrepreneurship and Integration in the European Labour
market* — is an Erasmus+ KA220-ADU project. The rooms address adult migrants and
refugees, but nothing in the mechanics assumes that audience; the methodology is
documented for replication in the project's Capitalisation Guidebook.

---

## Quick start

```bash
npm install
cp src/proxy.conf.example.json src/proxy.conf.json   # then set your Strapi host
ng serve                                             # http://localhost:4200
```

`ng build` produces a static bundle in `dist/pomeil/` — roughly 3.9 MB of raw output,
about 440 kB over the wire. Deployment is a file copy behind any web server.

The escape rooms run entirely in the browser and need no backend. The Strapi CMS is
only required for the public project pages (news, partners, outputs), optional user
accounts, and server-side saving of learner progress.

## Architecture

The design principle worth taking from this repository is the separation of a **shared
engine** from **per-room content**.

```
src/app/shared/escape-room/
  escape-room-base.component.ts     abstract base — ~860 lines, all shared behaviour
  escape-room.interfaces.ts         Dialogue, HotspotRect, EscapeRoomConfig, timings
  escape-room-scoring.interfaces.ts PuzzleScore, RoomScore, scoring functions
  escape-room-text.service.ts       per-room i18n loading and dot-path lookup
```

The base class provides dialogue with a typewriter effect, zoom into hotspots, the hint
system, automatic disclosure of the answer after three wrong attempts, the skip
function, sound, image preloading, exit confirmation, fullscreen and score keeping.

Each room is a standalone component that declares only what makes it different — its
identifier and image dimensions, its state machine, the percentage-based rectangles
that form its clickable areas, and its puzzle data. Rooms implement six mandatory
members (`config`, `isMainViewActive`, `isQuizActive`, `updateBackground`,
`onHotspotClick`, `dismissDialogue`) and range from 577 to 1,087 lines.

Every learner-visible string lives in `public/assets/i18n/escape-rooms/{roomId}/{lang}.json`
and is fetched by key, so adding a language is a translation task and not a development
task. All 150 room text files are key-complete with the English source.

One identifier per skill (`cultural-awareness`, `empathy`, …) is used by the route, the
room's config, its text files in every language, the card in the room library, the
stored score and the module PDF. That single convention is what makes the link from an
assessment result to a learning resource a lookup rather than a mapping table.

### Adding a room

1. Create `src/app/{skill-name}/` with a standalone component extending `EscapeRoomBaseComponent`.
2. Create `public/assets/i18n/escape-rooms/{skill-name}/en.json` and the other locales.
3. Define the `GameState` enum and implement the six required members.
4. Add the scene images to `public/assets/images/{skill_name}/` (base scene, per-character
   hover and speaking variants, door-open, zoom views, state changes, item images —
   about fifteen files).
5. Register in three places: a route in `app-routing.module.ts`, an import in
   `app.module.ts`, and a card in `escape-rooms.component.ts`.

`*ngFor` over getter-backed puzzle data **must** use `trackBy`; without it Angular
enters a destroy/recreate loop that freezes the browser.

## Testing

Twenty-nine Playwright scripts drive the real application against a running dev server:

```bash
ng serve &
node e2e-rooms-smoke.mjs        # loads all 30 rooms, fails on any console error
node e2e-bg-check.mjs           # detects character close-ups stuck over the scene
node e2e-image-state-gallery.mjs # captures every visual state of every room
```

The failure modes that matter in this kind of application are visual and behavioural
rather than computational, so the practice has been to write a detector for each
non-obvious defect and run it across all thirty rooms.

## What is not in this repository

| Excluded | Reason |
| --- | --- |
| `public/assets/modules/` | The 30 study-module PDFs are partner-authored; not cleared for redistribution. Download links in the app will 404 in a clone. |
| `public/assets/newsletters/` | Same. |
| `public/assets/scenarios/` | Room scenario source documents (partner material) and the local image-generation pipeline. |
| `src/proxy.conf.json` | Contains a live backend host. Copy `proxy.conf.example.json` and set your own. |
| Model weights, screenshots, audit output | Local tooling, bound to a specific machine. |
| `image_1.jpg`, `notebook-bg.jpg`, `paper-texture.jpg` | Third-party stock photography (Rawpixel and similar), licensed for use in the platform but not for redistribution. Three decorative background textures fall back to their background colour without them. |

## Stack

Angular 18 · TypeScript 5.4 (strict) · Angular Material (Material 3) · Strapi v5 headless
CMS · static hosting behind nginx. Fonts are self-hosted, so neither the build nor the
running site depends on a third-party service.

## Licence

MIT — see [LICENSE](LICENSE). Adjust the copyright holder if the consortium agreement
names a different party. Note that the excluded partner PDFs are not covered by it.

## Funding

Funded by the European Union. Views and opinions expressed are however those of the
author(s) only and do not necessarily reflect those of the European Union or the
European Education and Culture Executive Agency (EACEA). Neither the European Union nor
EACEA can be held responsible for them.

Project number: 2024-1-NO01-KA220-ADU-000244470
