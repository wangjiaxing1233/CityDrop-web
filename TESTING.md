# Frontend testing

How the CityDrop web frontend is tested, what's covered, and what isn't.

**Status:** 11 test suites, 97 tests, ~8s. No `act()` warnings, no antd deprecation
warnings. No application logic bugs found; a few code-hygiene issues were fixed
along the way (see [Issues found](#issues-found-and-fixed)).

---

## Running the tests

```bash
# unit + component tests, watch mode (default)
npm test

# single run with coverage — what CI runs
npm run test:ci

# end-to-end (Playwright) — needs the backend on :8080
npm run test:e2e
npm run test:e2e:ui
```

Test files live next to the code they cover (`src/**/*.test.js`); Create React
App's test runner (Jest + React Testing Library) discovers them automatically.
End-to-end specs live in `e2e/` and are run only by Playwright.

---

## How it's set up

| Piece | What it is |
| --- | --- |
| Runner | Jest + React Testing Library, bundled with `react-scripts` — no extra config |
| `src/setupTests.js` | Loads `jest-dom` matchers; polyfills `matchMedia` / `ResizeObserver` / `scrollTo` — antd v5 and Leaflet touch these on import and jsdom doesn't implement them |
| `src/test/mocks/` | MSW handlers for the real backend endpoints. Not wired into the current tests (they stub `../utils` directly); ready for future integration tests — see the recipe in `server.js` |
| `e2e/` + `playwright.config.js` | Playwright scaffold: 1 smoke test + 3 `.fixme` skeletons. `webServer` starts `npm start`; flows also need the backend on `localhost:8080` |
| `.github/workflows/` | `unit-tests.yml` (Jest + coverage), `playwright.yml` (E2E) |

### Strategy by layer

- **Pure logic** — imported directly, no mocks.
- **Real API layer (`utils.js`)** — stub `global.fetch`, assert the request shape
  (URL, method, headers, body, `credentials`) and how each response is mapped to
  what pages consume. This is the frontend's half of the API contract.
- **Components** — `jest.mock('../utils')` to cut the network, RTL + `user-event`
  for interaction, `jest.spyOn(message, ...)` for antd toasts.
- **Heavy dependencies** — `TrackingMap` is stubbed inside page tests;
  `react-leaflet` + `leaflet` are stubbed inside `TrackingMap`'s own test.

---

## What each test file covers

### Pure logic

| File | Tests | What / why |
| --- | --- | --- |
| `src/orderUtils.test.js` | 16 | `modeLabel`, `STATUS_SEQUENCE`, `isCancellable`, `isRefundEligible`, `statusLabel`, `parseAddress`. The single source of truth for order-status rules, shared by four pages — one wrong branch and the cancel button, refund eligibility, or address autofill all follow it wrong. Cheapest thing to test, so it goes first. |
| `src/utils.test.js` | 12 | The backend layer that actually runs in production (`USE_MOCK` is false). Stubs `fetch` and asserts request shape + response mapping. Covers `login`/`register`/`logout`, `401 -> citydrop:unauthorized` event, non-JSON error fallback, the `getDeliveryOptions` quote adapter, the `getOrders` N+1 expansion, `confirmAtStation`'s PATCH-then-refetch, `cancelOrder` flattening `refundEligible`, `sendChatMessage` carrying history. If the backend renames a URL or field, this breaks first. |
| `src/components/trackingMath.test.js` | 9 | `haversineMeters` + `pointAtProgress` (extracted from `TrackingMap.js` into `trackingMath.js`). The map marker's position is pure math — a wrong sign or a bad clamp puts the robot in the ocean, and you can't eyeball that on a map. Covers zero distance, ~111.2 km/degree at the equator, symmetry, real station distances, single-point routes, endpoint clamping, linear interpolation, multi-segment walking. |

### Components (React Testing Library, `../utils` stubbed)

| File | Tests | What / why |
| --- | --- | --- |
| `src/components/LoginPage.test.js` | 6 | The auth entry point: field validation, login/register mode switch, turning a backend result into either a `handleLoginSuccess` call or an error toast. Branch-heavy and easy to regress. |
| `src/components/SupportPage.test.js` | 13 | Feature 4 (AI Customer Support). Optimistic user bubble; wiring the reply's `suggestCreateOrder` / `suggestCancelOrderId` flags to the right follow-up buttons; confirm-before-cancel; error bubbles on a failed call; the per-user `localStorage` transcript (switching accounts must not leak history); corrupt-storage fallback; clear-conversation; mic-permission error. |
| `src/components/OrderDetailPage.test.js` | 8 | Renders very differently per status and gates the irreversible "Cancel order" control on `isCancellable`. Covers loading / not-found, the PENDING_DROPOFF drop-off confirm, `confirmAtStation` returning QUEUED, the CANCELLED explainer (including auto-cancel on a missed window), Cancel hidden once DELIVERED, and the cancel/refund flow. `TrackingMap` stubbed. |
| `src/components/OrderPage.test.js` | 10 | The two-step create-order flow: step transition, request/payload shapes, the Best Value / Sold out badges, the expired-quote lockout (Confirm disabled + warning), the success screen, `QuoteExpiredError` bouncing back to the form, a QUEUED placement, and the chat hand-off prefill. `QuoteExpiredError` / `parseAddress` are the real implementations. |
| `src/components/MyOrdersPage.test.js` | 7 | Three visual states (loading / empty / populated); Active vs Completed tab counts that must match the lists; the per-status badge; a card click routing to the detail page; tab state driven by the URL (passed down from `App`). |
| `src/components/HomePage.test.js` | 2 | The landing screen — every tile and floating button is just `onClick -> navigate(path)`. A wrong path strands the user on home. |
| `src/App.test.js` | 6 | Routing itself, the `requireAuth` gate, the signed-in/out nav chrome, the global `citydrop:unauthorized -> force logout` listener, and unknown-path redirect. Driven through a `MemoryRouter`. |
| `src/components/TrackingMap.test.js` | 8 | The component has no backend coordinates: it looks the station up in a table, geocodes the destination via Nominatim, and (for ROBOT) pulls a road route from OSRM, falling back to a straight line when routing is down. `react-leaflet` / `leaflet` stubbed, both HTTP services mocked. Covers loading -> map, unknown station / no destination -> "Map unavailable" (no request made), DRONE geocode-only straight line, ROBOT calling OSRM, OSRM failure still rendering (fallback), and geocode failure / address-not-found -> "Map unavailable". |

---

## Coverage

| Module | Line coverage | Note |
| --- | --- | --- |
| `orderUtils.js` | 100% | |
| `LoginPage.js`, `HomePage.js`, `theme.js`, `HeroCarousel.js` | 100% | |
| `TrackingMap.js` | 97% | was 0% |
| `trackingMath.js` | 96% | |
| `MyOrdersPage.js` | 81% | |
| `OrderDetailPage.js` | 80% | |
| `OrderPage.js` | 74% | |
| `App.js` | 67% | |
| `SupportPage.js` | 55% | voice paths need E2E |
| `utils.js` | 28% | the real backend layer is fully covered; the ~700-line `USE_MOCK` demo block is not |
| **Overall** | **~57%** | |

---

## Deliberately not covered (and why)

| Area | Reason |
| --- | --- |
| SupportPage voice (`MediaRecorder`, TTS playback, `<audio>`) | jsdom can't run it — needs Playwright in a real browser. The mic-permission-failure path *is* covered. |
| `utils.js` `USE_MOCK` implementations (~700 lines) | Dead in production (`USE_MOCK` is false) but still bundled. Better split into its own file / excluded at build time before investing in tests for it. |
| App queue-promotion notification (`QUEUED -> PENDING_DROPOFF`), the 4s silent-refresh polls, the OrderPage countdown `setInterval` | Timer-driven; would need fake timers and more orchestration for low marginal value. |
| `SettingsPage.js` | A static stub with no logic. |
| The three `e2e/` specs | Currently `.fixme` skeletons — need real selectors and a running backend (`localhost:8080`). |

---

## Issues found and fixed

1. **antd deprecated props (4)** — `Card` `bordered` / `bodyStyle`, `Descriptions`
   `labelStyle` / `contentStyle`. Migrated to `variant` / `styles={{ ... }}`.
   Console no longer warns on every render, and a future antd upgrade won't break.
2. **`src/test/mocks/hanlder.js` typo** — renamed to `handlers.js`.
3. **Playwright default `tests/` dir vs `e2e/`** — consolidated to `e2e/`, example
   removed, `baseURL` + `webServer` configured.
4. **`TrackingMap.js` pure logic wasn't testable** — extracted `trackingMath.js`,
   which also trims the 1000-line file.

No application logic bugs were found — the existing code behaves as designed.

---

## Suggested next steps

- Fill in the `e2e/` specs with real selectors; add a Playwright auth setup
  project so order/chat flows start logged in.
- Add `tsc --noEmit` (or at least ESLint) as a CI gate — `react-scripts` ships
  ESLint but nothing fails the build on it yet.
- Split the `USE_MOCK` demo code out of `utils.js`.
- Wire MSW into a first integration test (a page + real component tree + mocked
  HTTP) using the handlers already in `src/test/mocks/`.
