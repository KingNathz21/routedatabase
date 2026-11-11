# London Bus Route Archive

A static website generated from the London bus route workbook.

## Run locally

Because the website loads `data/routes.json`, it must be opened through a small web server.

### Windows / macOS / Linux with Python

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Upload all files and folders to a GitHub repository.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select the `main` branch and `/root`.
5. Save.

## TfL API key

`config.js` contains an empty `tflApiKey` value.

A key added to a static website is never private because visitors can view the JavaScript and network requests. For a public deployment, use a Cloudflare Worker, Netlify Function or another serverless proxy to keep the key secret.

The site can also try TfL requests without a key.

## Adding route images

Open `data/routes.json`, find the route and set:

```json
"Image": "assets/images/route-1.jpg"
```

Place the image inside `assets/images`.

You may also use a full HTTPS image URL, but local images are more dependable.

## Editing route information

All editable route content is stored in `data/routes.json`. Search for the route number and change the fields directly.


## RouteFlow pages

- `journey-planner.html` uses the TfL Journey Planner API to compare public transport options.
- `operators.html` groups current and withdrawn route records by operator and garage.
- `fleet.html` explores vehicle models, power types and route associations recorded in `data/routes.json`.

The operator and fleet directories describe archive records; they are not live vehicle tracking or fleet allocation feeds.

## Accounts, profiles and personal settings

The account area uses Firebase Authentication for identity and Cloudflare D1 for private profile data, saved routes, saved stops, saved journeys and preferences. Firebase passwords are never stored in this repository or in D1. The Worker validates Firebase ID-token signatures and project claims before returning any account data.

### One-time account setup

1. Create or select a Firebase project and register a Web app.
2. In Firebase Authentication, enable Email/Password and (if wanted) Google sign-in.
3. Add the GitHub Pages domain `kingnathz21.github.io` and your local development host to Firebase Authentication's authorised domains.
4. Copy the web app's `apiKey`, `authDomain`, `projectId` and `appId` into `firebase-config.js`. These web config values are public identifiers; never put service-account credentials in this file.
5. Set `apiBaseUrl` in `firebase-config.js` to the deployed RouteFlow Worker URL (the exact `workers.dev` URL shown by Cloudflare).
6. Set the Worker secret to the same Firebase project ID: `npx wrangler secret put FIREBASE_PROJECT_ID --config worker/wrangler.jsonc`.
7. Apply the new D1 migration and deploy the Worker:
   ```bash
   npx wrangler d1 migrations apply routeflow-london --remote --config worker/wrangler.jsonc
   npx wrangler deploy --config worker/wrangler.jsonc
   ```
8. In Firebase Authentication, configure the email verification and password reset email templates. Test registration, email/password login, Google login (if enabled), password recovery, sign-out and cross-device saved data.

The Worker checks Firebase's signed ID tokens and scopes every profile, preference and saved-item query to the authenticated UID. Client-submitted user IDs and roles are never trusted. Account pages remain unavailable until the Firebase project and Worker URL are configured.
