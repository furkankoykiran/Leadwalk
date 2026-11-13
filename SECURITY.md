# Security policy

## Supported versions

Leadwalk is pre-1.0. Only the current `main` branch receives fixes.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report privately through GitHub's
[private vulnerability reporting](https://github.com/furkankoykiran/Leadwalk/security/advisories/new)
for this repository. Please include:

- what the issue is and roughly how severe you think it is,
- steps to reproduce, or a proof of concept,
- affected files or endpoints if you know them.

Expect an acknowledgement within about a week. This is a small project
maintained in spare time — if a fix will take a while, you will be told that
rather than left waiting. Please give a reasonable window before disclosing
publicly.

## Threat model — read this first

Leadwalk is a **personal, single-user, fully local tool**, not a hosted
service. Its security posture follows from that, and several properties that
would be vulnerabilities in a SaaS are deliberate here:

- **There is no authentication or authorisation.** Anyone who can reach the
  running app can read and modify all of its data. It is meant to be run on
  `localhost`.
- **All data lives in one unencrypted SQLite file** on the machine running the
  app (`data/leads.db` by default; `data/prospectforge.db` is still used if it exists).
- **The app enforces no spending cap.** Discovery and generation call paid
  Google APIs. Quota limits must be set in the Google Cloud console; see the
  cost warning in the [README](README.md#cost-and-billing-warning).

**Do not expose an instance to the public internet as-is.** If you intend to
deploy it somewhere reachable, authentication, transport security and rate
limiting are yours to add.

Reports that amount to "there is no login screen" or "the SQLite file is
readable" are already documented above and are not treated as vulnerabilities.
Reports about the app leaking keys, executing untrusted input, or being
exploitable by a malicious API response very much are.

## API keys

Leadwalk uses three Google API keys. Handle them as follows:

- `GOOGLE_MAPS_API_KEY` and `GEMINI_API_KEY` are **server-side secrets**. They
  are read from the environment and must never reach the browser or the
  repository.
- `NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` is **public by design** — the Maps
  JavaScript API cannot work otherwise. Restrict it by HTTP referrer in the
  Google Cloud console so it is only usable from your own origin.

`.env` is gitignored. Keys must never be committed, pasted into issues or pull
requests, or included in logs or screenshots.

### If you have exposed a key

1. Revoke or regenerate it in the Google Cloud console (or AI Studio for
   Gemini) immediately — this matters more than cleaning up git history.
2. Check **Billing → Reports** for unexpected usage.
3. Only then worry about scrubbing the value from history.

A key that has been pushed to a public repository should be treated as
compromised even if the commit was deleted seconds later.

## Dependencies

`npm audit` currently reports advisories in transitive dependencies; these are
tracked as a known issue in the [README](README.md#known-issues) rather than
silently ignored. Dependabot opens update pull requests weekly.
