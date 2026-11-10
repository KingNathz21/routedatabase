# RouteFlow London API

Cloudflare Worker API backed by the `routeflow-london` D1 database.

## Free-only deployment

This project is designed for Cloudflare's Free plan. Do not enable paid Workers billing or add paid services. The Worker configuration uses the existing D1 binding name `DB`.

## Files

- `wrangler.jsonc` — Worker name and D1 binding configuration.
- `src/index.js` — read-only API endpoints.
- `migrations/` — versioned D1 schema.

## Deploy

From this directory, after installing Node.js and authenticating Wrangler:

```bash
npx wrangler login
npx wrangler deploy
```

Apply the initial schema to the remote D1 database:

```bash
npx wrangler d1 migrations apply routeflow-london --remote
```

The Cloudflare dashboard binding already created for this Worker should use the variable name `DB`. Keep that name consistent with `wrangler.jsonc`.

## API endpoints

- `GET /api/health` — Worker and database health.
- `GET /api/routes?status=current&search=...&limit=50&offset=0` — paginated route list.
- `GET /api/routes/:routeNumber` — one route; defaults to current before withdrawn.
- `GET /api/operators` — operators.
- `GET /api/garages` — garages.
- `GET /api/fleet?search=...&limit=50&offset=0` — fleet records.

The API is deliberately read-only in this first foundation release. Admin writes and user-specific data must not be exposed until Firebase ID-token verification and role checks are implemented.

## Data import

The existing `data/routes.json` remains the source of truth for the current website. Do not delete, rename, or replace it. The D1 import process will be added and tested separately so both `current` and `withdrawn` route records and all original fields are preserved in each row's `raw_json` column.

## Security and limits

- No API keys or secrets belong in this repository.
- Only the public GitHub Pages origin and local development origins are allowed by the initial CORS policy.
- Public endpoints are read-only and paginated (maximum 100 rows per request).
- User profiles and saved items are schema placeholders only; they are not exposed by this API.
