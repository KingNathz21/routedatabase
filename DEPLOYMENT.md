# RouteFlow London deployment

**Current live frontend:** https://kingnathz21.github.io/routedatabase/ (GitHub Pages). The Cloudflare Worker API is https://routeflow-api.nmorris210509.workers.dev. A Cloudflare Pages frontend project has not yet been created, so no `*.pages.dev` URL exists yet.

Before moving the frontend to Cloudflare Pages, create the Pages project in the Cloudflare account and add its exact origin to the Worker CORS allowlist. Until then, continue using the live GitHub Pages site.

## Frontend — Cloudflare Pages

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Pages → Connect to Git**.
2. Select `KingNathz21/routedatabase` and the `main` branch after the pull request is merged.
3. Set the build command to `exit 0` and the build output directory to `.`. Leave the root directory at the repository root. This is a static HTML/CSS/JS site with no build step.
4. Deploy. Cloudflare assigns a URL in the form `https://<your-pages-project>.pages.dev`.
5. Add that exact HTTPS origin to the Worker CORS allowlist in `worker/src/index.js`, then deploy the Worker again. The Pages project name must be confirmed in your Cloudflare account; it is not safe to guess the final URL.

## Worker and D1

From the repository root:

```bash
npx wrangler secret put FIREBASE_PROJECT_ID --config worker/wrangler.jsonc
npx wrangler d1 migrations apply routeflow-london --remote --config worker/wrangler.jsonc
npx wrangler deploy --config worker/wrangler.jsonc
```

The Firebase project ID is `rflofficial`. The browser Firebase configuration is public; never put a service-account key, private key, Cloudflare API token or password in frontend files or Git.

## Local Worker development

Copy `worker/.dev.vars.example` to `worker/.dev.vars`, keep the real file untracked, then run:

```bash
npx wrangler dev --config worker/wrangler.jsonc
```

## Offline behaviour

The app shell is cached by the service worker. The complete current/withdrawn route archive is stored in IndexedDB after the Routes page successfully downloads it once. Route photographs hosted on Wikimedia Commons are cached after they have been viewed. Live arrivals, journey planning, account synchronisation and first-time archive downloads still require a connection.

## Current image coverage

Verified multi-photo galleries are currently populated for routes 2–14 and 19 (route 10 is withdrawn). Route 1 retains its existing five legacy images and now includes one separately verified, attributed Commons photo; its older images still need individual licence review. Further route photography should be added only when the image, source and reuse licence can be verified.
