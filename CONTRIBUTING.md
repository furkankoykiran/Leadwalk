# Contributing to Leadwalk

Thanks for considering a contribution. This project is early and is being built
out into something maintainable. That means there is a lot of low-hanging fruit,
and also that some structure is still in flux.

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

You do **not** need API keys to run the test suite, lint, or typecheck. You only
need them to exercise discovery and generation against the live Google and
Gemini APIs.

## Before you open a pull request

Run all four gates. CI runs exactly these, on Node 22 and 24:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run lint:fix` fixes most style violations automatically.

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

## What makes a good contribution here

Particularly welcome, roughly in order of usefulness:

1. **Internationalisation.** The UI and the AI prompts are hardcoded Turkish.
   Extracting strings and making the prompts locale-aware is the single biggest
   unlock for other contributors.
2. **Tests for the untested parts.** The Places and Gemini clients call out over
   the network through Nuxt's `$fetch` and currently have no coverage. They need
   a mocking layer before they can be tested honestly.
3. **Dependency remediation.** `npm audit` reports advisories in transitive
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
  that spend money. Changes that could multiply API calls need to say so
  explicitly in the PR description.

## Code style

ESLint is the arbiter; there is no separate formatter. Match the surrounding
code — it favours small pure helpers in `app/utils/` and `server/utils/`, with
comments explaining *why* rather than restating the code.

## Reporting bugs

Open an issue with the bug report template. Include what you expected, what
happened, and the smallest reproduction you can manage. Never paste API keys,
and redact business data if it is not yours to share.

## Code of conduct

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licensing of contributions

Leadwalk is licensed under Apache-2.0. By contributing you agree that your contributions
are licensed under the same terms.
