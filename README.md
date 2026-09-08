# Mahjong Path

A mobile-friendly, installable Hong Kong Old Style mahjong scoring trainer. Six illustrated lessons and 12 guided hands teach scoring routes and discards. No account, backend, runtime dependencies, analytics, or external fonts.

## Run locally

Use Node.js 22+ and Python 3. From the repository directory:

```sh
npm ci
npm start
```

Open `http://localhost:4173/`. Static files are served directly; there is no build step. HTTPS (or localhost) is required for offline support and installation.

## Checks

```sh
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

Browser tests serve the project at `/mahjongtrainer/` and cover lessons, answer submission, first-answer persistence, reset, unavailable storage, mobile layout, and offline reload. They use port 4173; stop a manually started root-level server before running them. To use an already installed Chromium, set `CHROMIUM_PATH` to its executable path.

## Deploy to GitHub Pages

1. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
2. Merge this code into `main` (or adjust the workflow's branch filter to your default branch).
3. The **Deploy Mahjong Path to Pages** workflow validates the app, stages only public assets, and deploys them. It can also be run manually.
4. Visit `https://darrenhum.github.io/mahjongtrainer/`.

All asset, manifest, and service-worker paths are relative, so the site works under a project subpath. No custom domain is required. Hosting requires Pages to be enabled by a repository administrator; adding the workflow does not enable it automatically.

## Install and use offline

Visit online and wait for **Ready offline**. Use **Install app** or the browser's install menu. On iPhone/iPad, use Safari → Share → Add to Home Screen. Supporting browsers can then open the entire trainer offline, including tile illustrations.

The service worker caches a complete version of the app. When changing any cached asset, increment `CACHE_NAME`'s version in `sw.js`. Updates install in the background and activate after all old app tabs/windows are closed; reopen to use the new version. This avoids mixing old and new application files.

Lessons and first answers are stored in `localStorage` on this browser/device. Replays do not inflate accuracy. Reset is confirmed before clearing progress. If storage is blocked or full, practice remains available for the session with a warning. Clearing browser site data removes saved progress; there is no cloud sync.

## Teaching rules and scope

The app explicitly selects a **3 fan minimum**: chicken hand 0, all pungs 3, half flush 3, full flush 7, each dragon pung 1, seat-wind pung 1, and round-wind pung 1. A wind that matches both scores 2. All pungs, flushes, and value sets may combine; half and full flush never stack. Fan are scoring units, not direct cash points.

These are stated teaching values, not a universal Hong Kong ruleset. House rules differ. Flowers, kongs, special limit hands, win-condition bonuses, and payout calculations are outside this release. Lessons with fewer than three fan illustrate patterns, not legal wins under this minimum.

Practice uses curated, late-turn, near-complete hands and favors preserving completed sets. Feedback identifies qualifying routes, useful tiles, and the cost of chasing higher fan. It is not an expected-value solver and does not model opponents, discard safety, or live tile availability. It does not teach every scoring hand yet.

## Content and architecture

- `content.js`: six lessons and twelve scenarios, using `m1`–`m9` (characters), `p1`–`p9` (circles), `s1`–`s9` (bamboo), `E/S/W/N` winds, and `R/G/B` dragons (`B` is white).
- `content.test.js`: validates tile inventories, winning examples, and qualifying scenario continuations against the teaching rules.
- `app.js`, `styles.css`: accessible browser UI and responsive layout.
- `progress.js`: defensive saved-progress normalization and accuracy calculation.
- `sw.js`, `manifest.webmanifest`, `icons/`: offline shell and original installation artwork.
- `.github/workflows/pages.yml`: test and publish to Pages.