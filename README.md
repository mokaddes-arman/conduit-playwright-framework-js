# Conduit Playwright Test Suite

End-to-end and API test suite for the [Conduit (RealWorld)](https://github.com/gothinkster/realworld)
application, written in modern JavaScript (ES modules) with the Page Object Model.

## Tech stack

- [Playwright Test](https://playwright.dev/) — browser + API testing
- [@faker-js/faker](https://fakerjs.dev/) — unique test data per run
- [dotenv](https://github.com/motdotla/dotenv) — configuration from `.env`

## Prerequisites

- Node.js 22+
- A running Conduit backend (frontend + API)

## Setup

```bash
npm ci
npx playwright install --with-deps
cp .env.example .env   # then set the URLs for your backend
```

### Configuration

All backend-specific values live in `.env` (see `.env.example`):

| Variable | Description |
| --- | --- |
| `BASE_URL` | Frontend base URL used by the browser tests |
| `API_BASE_URL` | API base URL used by the request-based helpers/tests |

No backend data (URLs, users, articles, tags) is hardcoded. The auth setup
registers a fresh user each run, articles/comments/follows are generated with
faker, and feed filters are discovered from the API at runtime — so the suite
runs against any Conduit instance from `.env` alone.

## Running the tests

```bash
npm test                 # all projects (chromium, firefox, webkit)
npm run test:chromium    # one browser
npm run test:smoke       # @smoke tagged tests only
npm run test:regression  # @regression tagged tests only
npm run test:api         # @api tagged tests only
npm run test:headed      # watch the run in a browser
npm run test:ui          # Playwright UI mode
npm run test:report      # run the suite, then open the report (even if tests fail)
npm run report           # open the last HTML report
npm run dashboard        # open the last dashboard report
```

## Reports

Every run writes two reports:

- `playwright-report/` — the built-in Playwright HTML report (traces,
  screenshots, videos).
- `dashboard-report/` — a self-contained test-health dashboard (pass rate +
  trend, failure clusters, per-project/file breakdown, slowest tests, API
  calls, timeline). It is a single HTML file with no external assets, so it
  opens straight from disk.

### Viewing the HTML report

The HTML reporter writes to `playwright-report/`. Traces (`on-first-retry`),
screenshots (`only-on-failure`) and videos (`retain-on-failure`) are included.

- `npm test` — runs the suite; the dashboard opens automatically when it
  finishes (the HTML report no longer auto-opens).
- `npm run test:report` — runs the suite and then opens the report **even if the
  tests fail** (the two commands are chained so a non-zero exit code does not
  stop the report from opening).
- `npm run report` — opens the last generated HTML report without re-running tests.
- `npm run dashboard` — opens the last generated dashboard report.

In CI neither report opens a browser. Instead, the run uploads both as
artifacts with `if: always()`, so they are available even when tests fail:

1. Open the workflow run on GitHub and scroll to the **Artifacts** section.
2. Download the `playwright-report` and/or `dashboard-report` artifact (a zip)
   and unzip it.
3. Open `index.html` in your browser to view results, traces and screenshots.

### Dashboard report

The custom reporter at `reporters/dashboard-reporter.js` consumes the same
Playwright events as the HTML reporter, so the two reports always show the same
numbers. The output is a single self-contained `dashboard-report/index.html`
(system fonts, inline SVG icons, no libraries, no network).

Layout: an aurora/glass page (colored radial gradients over a dark base, frosted
cards with `backdrop-filter: blur`) that scrolls vertically. The header shows a
hexagon-check logo, a gradient "Test health" title with a run subtitle (project,
run date/time, environment) and **Copy summary** / **Theme** buttons. Under it a
pill navigation — Overview, Tests, Failures, Breakdown, Slowest, API, Timeline —
sits next to a search field whose `⌘K` hint jumps to the Tests tab and filters
live. A footer shows the generation date and the Playwright version.

The Overview is a bento grid: a **Pass rate** card (ring split by
passed/flaky/failed, `passed / total`, and a `±X pts vs previous run` delta), a
**Pass rate trend** card (last 8 runs, area + line chart, "trending up/down/
steady"; "Trend appears after 2 runs" until there is history), a **Duration**
card (`N workers · N suites`), separate **Passed / Failed / Flaky** stat cards,
a **Skipped** card, a **Total tests** card and an **Environment** card, plus
**Needs attention** (each failed/flaky test; click jumps to it in Tests) and
**Slowest tests**. All values come from the run — nothing is hardcoded.

- `npm test` — runs the suite; the dashboard opens automatically when it
  finishes (the HTML report no longer auto-opens).
- `npm run dashboard` — opens the last generated dashboard.
- The **Theme** button toggles dark/light. It defaults to the OS preference,
  remembers the choice in `localStorage`, and every colour is a CSS variable on
  `:root` / `[data-theme="light"]`.

Set `BASE_URL`/`API_BASE_URL` in `.env`. Each run appends a summary to
`dashboard-report/history.json` (last 20 runs, used for the trend chart and the
vs-previous delta; a missing or corrupt file just starts a new one), and the
latest run is also mirrored to `dashboard-report/last-run.json`.



## How it is organized

```
pages/            Page objects (one class per screen)
tests/            Specs: auth, articles, comments, feed, favorites, follow, profile, responsive, api
  auth.setup.js   Registers the shared user and saves its storage state/token
utils/
  api.js          Thin API client used for setup/teardown and API tests
  auth.js         Reads the auth record produced by the setup project
  testData.js     faker-based generators (users, articles, comments)
  seed.js         Seeds secondary "actor" users/articles for UI preconditions
playwright.config.js
```

### Projects

`setup` runs first and registers a shared user; `chromium`, `firefox` and
`webkit` reuse that user's `storageState`. Tests run with `workers: 1` because
they share the setup user and mutate shared backend state (global feed,
follows, favorites).

### Tags

Specs are labelled with Playwright's `tag` option (so they do **not** appear in
test titles) and can be run as a subset:

- `@smoke` — critical happy paths
- `@regression` — full coverage
- `@api` — request-based API tests

## Continuous integration

`.github/workflows/playwright.yml` runs the suite in CI. Set the repository
secrets `BASE_URL` and `API_BASE_URL`; the HTML report and the dashboard report
are uploaded as artifacts with `if: always()`.

## Notes on backend behavior

Tests are written to tolerate common differences between Conduit backends
(e.g. success status codes are asserted by class: 2xx/4xx). A few bondaracademy
quirks are handled explicitly:

- The article-update endpoint ignores an empty title (the original title is
  kept), whereas article creation rejects it.
- Feed filter indexes (`?tag=`, `?favorited=`) only cover existing/seed
  content, so the tag-filter and favorites-list tests discover their data from
  the API at runtime instead of creating it inline.
- Tag filtering is **in place only**: the app has no `/tag/<tag>` route (it
  redirects to `/`), so there is no tag-in-URL test. The app also ships no
  search input, so no search test exists — both features are absent from this
  backend. The sidebar (popular tags) is only revealed below 900px, which the
  responsive spec asserts.
