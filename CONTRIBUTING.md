# Contributing to Leadwalk

Thanks for considering a contribution. Leadwalk is young, so there is plenty of
useful work, and some structure is still settling.

## Getting set up

```bash
git clone https://github.com/furkankoykiran/Leadwalk.git
cd Leadwalk
npm install
cp .env.example .env
npm run dev
```

You need **Node 22.12 or newer** and **npm 11 or newer** — both are declared in
`engines`.

Two things worth knowing before you hit them:

- **Node 20 will not work**, even though Nuxt 4 itself supports 20.19+. ESLint 10
  reaches `Object.groupBy` through `eslint-flat-config-utils`, and that intrinsic
  does not exist before Node 21, so `npm run lint` throws immediately.
- **npm 10 will not work.** npm 11 records platform-specific optional binaries
  differently, and npm 10 rejects this lockfile as out of sync, so `npm ci`
  fails. Run `npm install -g npm@11` if `npm --version` reports 10.x. CI pins npm
  to the version in the `packageManager` field for the same reason.

`npm install` runs `nuxt prepare`, which generates the `.nuxt/` types that lint
and typecheck depend on — if either tool complains about missing generated
files, re-run it.

You do **not** need API keys to run lint, typecheck, unit tests or the offline
E2E suite. You only need them for discovery and generation against the live
Google and Gemini APIs (and for the map tests, which skip themselves without a
browser key).

## Before you open a pull request

Run the gates. CI runs these on Node 22 and 24, plus the offline E2E suite:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e:offline   # first time: npx playwright install chromium
```

`npm run lint:fix` fixes most style violations automatically. If you changed
the UI, `npm run docs:screenshots` refreshes the README screenshots.

## Workflow

`main` is protected. Nothing is pushed to it directly — every change lands
through a pull request that:

- targets `main` from a topic branch (`feat/…`, `fix/…`, `docs/…`, `chore/…`),
- has CI green,
- is **squash merged**, so `main` keeps one commit per change.

Force pushes to `main` and branch deletion are blocked at the ruleset level.

## Commit messages

Conventional Commits, because the squash-merge title becomes the `main` history
entry:

```
<type>(<optional scope>): <description>
```

Types in use: `feat`, `fix`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`.

Explain **why** in the body, not just what — the diff already says what.

## Translations

The app speaks English and Turkish; English is the source of truth. Only the
README is translated (`README.<code>.md`, e.g. `README.tr.md`); the other docs
stay in English.

- **UI strings** live in `app/i18n/<code>.ts`. Every dictionary must have
  exactly the same keys and `{placeholders}` as `en.ts` — a unit test enforces this.
- **README**: when you change `README.md`, update its translations in the same
  pull request, or say in the PR that a follow-up is needed. Screenshots are
  generated per language by `npm run docs:screenshots` into
  `docs/screenshots/<code>/`; never edit them by hand.

### Adding a language

Every supported language is listed once, in `shared/locales.ts`; everything
locale-specific is typed against that list, so the compiler shows you what is
missing.

1. Add the code and its names to `LOCALES` and `LOCALE_INFO` in `shared/locales.ts`.
2. Copy `app/i18n/en.ts` to `app/i18n/<code>.ts`, translate it, and register it
   in `DICTIONARIES` in `app/composables/useI18n.ts` and in `test/i18n.test.ts`.
3. Run `npm run typecheck` and fill in what it reports: category labels
   (`app/utils/category.ts`) and server error messages (`server/utils/locale.ts`).
4. AI output works without further changes — Gemini gets the English prompt
   and is told to write in the new language. Add a native prompt in
   `server/utils/gemini.ts` only if the output quality needs it.
5. Run `npm run docs:screenshots`, then add `README.<code>.md` (start from
   `README.tr.md`: same layout, its own `docs/screenshots/<code>/` paths) and
   link it from the language line at the top of every README.
6. Run the gates. The browser picks the new language automatically for users
   whose browser prefers it.

## What makes a good contribution here

Particularly welcome, roughly in order of usefulness:

1. **Tests for the network clients.** The Places and Gemini clients call out
   through Nuxt's `$fetch`; the pure mapping is unit-tested, the calls are
   covered only by the `@live` E2E tests. A mocking layer would let them be
   tested offline.
2. **Map markers.** Move from the deprecated `google.maps.Marker` to
   `AdvancedMarkerElement` (needs a Map ID, configurable via `.env`).
3. **Pipeline views.** A kanban board and CSV import (matched on `place_id`).
4. **Dependency remediation.** `npm audit` reports advisories in transitive
   dependencies. Fixes that need a major-version bump should come as their own
   reviewed PR rather than riding along with unrelated work.

## Things to avoid

- **Never commit secrets.** `.env` is gitignored; keep it that way. If you
  believe a key has been exposed, follow [SECURITY.md](SECURITY.md).
- **Don't weaken the verification gates** to make a change pass. If a rule is
  wrong, change the rule deliberately in its own commit and say why.
- **Don't alter `LICENSE` or the notices in `NOTICE`.** They are load-bearing
  legally, and Apache-2.0 (section 4) requires them to be retained.
- **Watch the cost surface.** Discovery and generation are the two operations
  that spend money. Changes that could multiply API calls — or add a field that
  moves Places requests into a more expensive tier — must say so explicitly in
  the PR description.
- **Don't use the Leadwalk name or logo for forks** (see [brand/BRAND.md](brand/BRAND.md)).

## Code style

ESLint is the arbiter; there is no separate formatter. Match the surrounding
code — it favours small pure helpers in `app/utils/`, `server/utils/` and
`shared/utils/`, with comments explaining *why* rather than restating the code.

## Reporting bugs

Open an issue with the bug report template. Include what you expected, what
happened, and the smallest reproduction you can manage. Never paste API keys,
and redact business data if it is not yours to share.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licensing of contributions

Leadwalk is licensed under Apache-2.0. By contributing you agree that your
contributions are licensed under the same terms.
