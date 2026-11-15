# RouteFlow London

**London travel. Reimagined.**

RouteFlow is an independent London transport platform bringing the bus route archive, live TfL arrivals, journey planning, service updates, operator information and fleet records into one responsive website.

## What is included

- **Route archive:** current and withdrawn route records, searchable by route number, location, operator and service details.
- **Route galleries:** route-specific photography with photographer, source and licence attribution.
- **Live arrivals:** TfL Countdown predictions for selected stops.
- **Journey planner:** journey options supplied by TfL.
- **Disruptions:** current TfL service status.
- **Operators and fleet:** directory views based on the records held in the project archive.
- **Accounts:** Firebase sign-in with private profiles, saved routes, stops, journeys and preferences stored in Cloudflare D1.
- **Offline support:** installable app shell, offline page, IndexedDB route archive and cached route photography.

The route archive currently contains 750 current and 93 withdrawn records. Individual fields may be marked as not yet verified where the source data has not been confirmed.

## Local development

Run a static server from the repository root:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

The frontend is static HTML, CSS and JavaScript. Its production route archive and account data are supplied by the Cloudflare Worker and D1 database.

## Services and configuration

- **Live website:** https://kingnathz21.github.io/routedatabase/ (GitHub Pages deployment verified).
- **Cloudflare Worker API:** https://routeflow-api.nmorris210509.workers.dev
- **Cloudflare Pages:** not connected yet, so there is no `*.pages.dev` frontend URL at present.
- **API:** `https://routeflow-api.nmorris210509.workers.dev`
- **D1 database:** `routeflow-london`
- **Firebase project:** `rflofficial`

Firebase's browser configuration is public by design. Never commit Firebase service-account credentials, private keys, Cloudflare API tokens, passwords or production secrets.

For Cloudflare Pages, Worker secrets, D1 migrations and offline deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Route photography

Route image records use HTTPS image URLs plus `alt`, `credit`, `source`, `license` and `licenseLabel` fields. The gallery displays source and licence links alongside the selected photo. Only route-specific images with verifiable reuse terms should be added; do not substitute generic bus images.

## Data and attribution

Live transport information is supplied by Transport for London. Route archive records are maintained as a separate project dataset and are not an official TfL publication. Photography remains credited to its respective creators and is linked to its source and licence.

## Deployment checks

GitHub Actions validates JavaScript syntax, route archive data, app-shell assets, unique D1 migration versions, HTTPS photo metadata and execution of the route gallery migration against SQLite. Browser-level PWA testing and production Cloudflare deployment still need to be completed in the relevant hosting account.
