# ProspectForge

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxtdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local--storage-003B57?logo=sqlite&logoColor=white)
[![CI](https://github.com/furkankoykiran/ProspectForge/actions/workflows/ci.yml/badge.svg)](https://github.com/furkankoykiran/ProspectForge/actions/workflows/ci.yml)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**An AI-assisted local business discovery and sales-preparation tool.** Pick an
area on a map and ProspectForge pulls the nearby businesses from Google Places,
works out what software each one might actually need, and drafts the pitch you
would open with when you walk in the door — all running on your own machine,
storing everything in a single local SQLite file.

It is built for exactly one workflow: walking into a business with something
concrete in hand, instead of a cold "can we talk about your website?".

> **Project status — foundation.** This repository is early-stage. The current
> tree is the application plus a verification and governance baseline
> (typecheck, lint, unit tests, CI). Substantial architectural redesign is
> planned; see [Roadmap](#roadmap) for what comes next.

---

## How it works

1. **Discover** — drop a pin on the map or type an address, then set a radius.
   ProspectForge asks Google Places for the businesses nearby and stores them
   locally: name, category, address, phone, website, rating, and a few real
   customer reviews.
2. **Decide** — open a business and generate. Gemini reads everything known
   about it and proposes **2–3 concrete software/product ideas** (a QR menu, a
   booking system, a loyalty programme, a site the owner can update themselves),
   each with its own price estimate.
3. **Pitch** — a short business profile and a copy-paste-ready door-opening
   sales script are generated alongside the ideas.
4. **Track** — mark businesses as visited / won / lost as you work an area;
   filter and search the growing list; see everything colour-coded on the map.

Nothing here scales by accident — it is built for one person working one town on
foot, business by business.

## Features

- **Discovery from a map pin or an address**, radius-limited, with re-discovery
  that refreshes Google data without destroying anything the AI generated
- **Noise filtering** — bus stops, ATMs, petrol stations, places of worship and
  parks are excluded automatically
- **AI product ideas** rather than one canned sales line — each business gets
  its own realistic, priced suggestions
- **Real review excerpts** in the language they were written in (no machine
  translation)
- **Full map view** of every discovered business, coloured by status
- **Filter and search** by status and category, with live counts
- **100% local storage** — one SQLite file, no cloud database, no account, no
  external analytics
- **Built-in usage counter** for the two operations that cost money, so you
  always know how close you are to the free quota
- **One-click reset** to wipe all stored data

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [Nuxt 4](https://nuxt.com) (Vue 3, TypeScript, SSR) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) (CSS-first config, no `tailwind.config.js`) |
| Database | [SQLite](https://sqlite.org) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) — a single file, no separate server process |
| Business discovery | [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview) + [Geocoding API](https://developers.google.com/maps/documentation/geocoding) |
| Map UI | [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) |
| AI generation | [Gemini API](https://ai.google.dev/) (`gemini-flash-latest`, structured JSON output; falls back to `gemini-flash-lite-latest` when the primary model is overloaded or rate-limited) |

---

## Getting started

### Requirements

- Node.js **22.12+** and npm **11+** (both enforced via `engines`)
- A Google Cloud account, for Maps Platform
- A Google AI Studio account, for Gemini (free, no card required to start)

### Setup

```bash
git clone https://github.com/furkankoykiran/ProspectForge.git
cd ProspectForge
npm install
cp .env.example .env
```

Fill in the three values in `.env` (see [API keys](#api-keys)), then:

```bash
npm run dev
```

Open <http://localhost:3000> — it redirects straight to the businesses screen.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Nuxt dev server on port 3000 |
| `npm run build` | Production build into `.output/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `vue-tsc --noEmit` across app, server and shared code |
| `npm run lint` | ESLint over the whole repo |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm test` | Vitest unit tests, single run |
| `npm run test:watch` | Vitest in watch mode |

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all run on
every pull request, on Node 22 and 24 — see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

Node 20 is not supported even though Nuxt 4 itself runs on 20.19+: ESLint 10
reaches `Object.groupBy`, which does not exist before Node 21, so lint cannot
run there.

---

## API keys

ProspectForge needs **three** keys, all from Google. Two are server-side
secrets; one is deliberately exposed to the browser (explained below). None of
them are required for the app to boot — each feature fails at request time if
its key is missing.

### 1. `GOOGLE_MAPS_API_KEY` — server-side only

Used for the **Places API (New)** (discovery) and the **Geocoding API**
(turning a typed address into coordinates).

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and
   create a project (or reuse one).
2. **APIs & Services → Library** — enable **Places API (New)** and
   **Geocoding API**.
3. **APIs & Services → Credentials → Create Credentials → API key.**
4. Restrict the key to just those two APIs (Credentials → the key →
   _API restrictions_).
5. Paste it into `.env` as `GOOGLE_MAPS_API_KEY`.

### 2. `NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` — public, browser-side

Used only to render the interactive map (pin dropping and the map view). This
key is deliberately **separate** from the one above — the Maps JavaScript API
works this way and cannot be used server-side. Restrict it to keep the risk low:

1. In the same Cloud project → **APIs & Services → Library** — enable
   **Maps JavaScript API**.
2. Create a **second** API key.
3. Restrict it by **HTTP referrer** (e.g. `localhost:3000/*` for local
   development, your own domain if you ever deploy it).
4. Paste it into `.env` as `NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`.

### 3. `GEMINI_API_KEY`

1. Go to [Google AI Studio](https://aistudio.google.com/) and sign in.
2. **Get API key → Create API key.**
3. Paste it into `.env` as `GEMINI_API_KEY`.

`.env` is gitignored. Never commit real keys — see [SECURITY.md](SECURITY.md).

---

## Cost and billing warning

Read this before you start clicking.

- **Only two actions cost money:** pressing **Discover**, and pressing
  **Generate profile + pitch**. Browsing, filtering, viewing the map and
  everything else only reads the local database and never incurs a charge.
- **Gemini has a real free tier** — no card required, rate-limited to roughly
  1,500 requests/day on `gemini-flash-latest`. Normal use never gets close.
- **Google Maps Platform is not free by default.** Google removed the old
  $200/month shared credit in March 2025. Each API now has its **own monthly
  free quota**:
  - Geocoding API: 10,000 free calls/month (Essentials tier)
  - Places Nearby Search: 5,000 free calls/month (Pro tier — this app requests
    contact and rating data)
  - Maps JavaScript API: 10,000 free map loads/month

  Each Discover click spends one geocode call plus one nearby-search call. One
  person walking one town stays comfortably inside the free tier — but **this
  app enforces no hard spending cap of its own.**

- **Set a real ceiling yourself.** In Cloud Console → APIs & Services → the API
  → **Quotas**, set a daily request limit well under the monthly free quota
  (e.g. 100–150/day for Nearby Search). Also set a small budget alert under
  **Billing → Budgets & alerts** as a tripwire. This protects you from a bug or
  an accidental loop draining the quota, not from normal use.
- **Watch the built-in counter.** The sidebar shows today's searches and
  generations — a live, zero-setup indicator you can check without leaving the
  app.

## Limitations — read before relying on this

Regardless of how it looks, this is a **personal, single-user, fully local**
tool, not a hosted SaaS:

- **No authentication and no multi-user support.** Anyone who can reach the
  running app can reach all of the data.
- **Data lives in a single file** (`data/prospectforge.db`) on the machine
  running the app. No sync, no backups, no cloud copy — losing that file means
  losing everything.
- **The entire UI and all AI output are in Turkish.** The tool was built for
  field sales in Turkey and has not been internationalised. See
  [Roadmap](#roadmap).
- **Search is hard-capped at 20 results.** Google's Nearby Search endpoint caps
  at 20 and does not paginate. In dense areas, sweep with smaller radii rather
  than expecting one large search to find everything.
- **Test coverage is limited to pure domain logic.** Unit tests cover the
  category, status, maps-URL and persistence helpers. There are no
  component-level or end-to-end tests, and the Google/Gemini integrations are
  exercised only manually against the live APIs.

---

## Project structure

```
app/                    Nuxt app (client)
  components/           Business cards, detail view, map picker, icons
  composables/          Clipboard, confirm dialog, Google Maps script loader
  layouts/              Sidebar shell
  pages/                businesses, businesses/[id], discover, map
  utils/                Category, status, maps-URL and map-style helpers
server/                 Nitro server
  api/                  REST endpoints (discover, process, businesses, usage)
  utils/                SQLite access, Gemini client, Places client
shared/types/           Types shared between client and server
test/                   Vitest unit tests
```

## Roadmap

The near-term direction, in rough order:

1. **Internationalisation** — the UI and the AI prompts are hardcoded Turkish;
   extracting strings and making the prompt locale-aware is the biggest single
   unlock for other contributors.
2. **Broader test coverage** — component tests and contract tests around the
   Places and Gemini clients, which are currently only manually verified.
3. **Dependency remediation** — `npm audit` currently reports known advisories
   in the transitive dependency tree (see [Known issues](#known-issues)).
4. **Architectural redesign** — a provider abstraction so discovery and
   generation are not hardwired to Google and Gemini.

## Known issues

- `npm audit` reports advisories in transitive dependencies. These have not been
  remediated in this foundation commit because the fixes may require dependency
  major-version bumps that warrant their own reviewed change. Run `npm audit`
  for the current list.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the
workflow, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for expected conduct.
`main` is protected: all changes land through a reviewed, squash-merged pull
request with CI green.

## License

[MIT](LICENSE).
