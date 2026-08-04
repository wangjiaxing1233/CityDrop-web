# citydrop-web-classic

This is the same CityDrop app as `citydrop-web/`, rebuilt with the older,
simpler tools — matching `staybooking/staysbookingfe` from the laioffer
reference folder, so it's easier to learn from and easier to explain to the
team. Same pages, same API contract, same business rules — just written
differently under the hood.

## What's different from `citydrop-web/`

| | citydrop-web | citydrop-web-classic |
|---|---|---|
| Build tool | Vite | Create React App (`react-scripts`) |
| File extension | `.jsx` | `.js` |
| Component style | function components + Hooks (`useState`) | class components (`this.state`) |
| Shared state | React Context (`AuthContext`, `OrderContext`) | one `this.state` on `App.js`, passed down as props |
| Page navigation | `react-router-dom` (real URLs like `/orders/A1234`) | `App.js` switches which component renders, based on `this.state.page` — no separate URLs |
| Dev-time API proxy | `vite.config.js` | one line in `package.json`: `"proxy": "http://localhost:8080"` |
| Auth token storage | in memory only (lost on refresh) | `localStorage` (survives a refresh — matches staybooking) |

Nothing about the actual product changed — same 7 pages, same fields, same
`CityDrop_API_Contract.docx` endpoints, same status enum. Only *how the code
is organized* changed.

**The trade-off worth knowing:** without `react-router-dom`, there's no real
`/orders/A1234` address bar URL — you can't refresh the page and land back
on that exact order, or send someone a link to it. `citydrop-web/` (the
other version) has that; this one doesn't, on purpose, to keep the concept
count low while learning. Once this version feels comfortable, adding
routing back in is a well-scoped next step, not a rewrite.

## How to run it

```
npm install
npm start
```

Opens on `http://localhost:3000`. Needs the Spring Boot backend running on
`localhost:8080` (see `citydrop-api/README.md`) for anything past the login
screen to actually work — same as the other frontend.

## How the pieces fit together

- **`src/index.js`** — the one file that starts everything; finds
  `public/index.html`'s empty `<div id="root">` and tells React to render
  `<App />` into it.
- **`src/App.js`** — the center of the app. Holds `authed`/`user`/`page`/
  `params` on `this.state`, decides whether to show `LoginPage` or the app
  shell, and hands a `navigate` function down to every page as a prop
  (this replaces `useNavigate()` from react-router).
- **`src/components/*.js`** — one class component per page, each reading
  whatever `App.js` passed it as props and calling functions from
  `utils.js` directly when it needs backend data.
- **`src/utils.js`** — every backend call, spelled out one function per
  endpoint (`login`, `getOrders`, `cancelOrder`, ...) — no generic wrapper
  to learn, each function is fully readable on its own, matching
  `staybooking/staysbookingfe/src/utils.js`'s style.
- **`src/orderUtils.js`** — small label/formatting helpers shared by the
  order-related pages (unchanged from `citydrop-web/src/utils/order.js`).

## Same architecture-diagram exercise, if useful

Feel free to ask for a version of the "Frontend Architecture" diagram slide
for this version too — the boxes would be: Browser → App.js → the 7 page
components → utils.js → Spring Boot backend, with no separate Context
column, since state now lives directly on `App.js`.
