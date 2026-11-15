# Cloudflare Pages deployment

RouteFlow London is a static HTML, CSS and JavaScript website. The existing Cloudflare Worker API and D1 database remain separate; Pages hosts the frontend only.

## Create the Pages project

1. Open the Cloudflare dashboard and go to **Workers & Pages**.
2. Choose **Create application** → **Pages** → **Connect to Git**.
3. Connect GitHub if prompted and select **KingNathz21/routedatabase**.
4. Configure the production build:
   - Production branch: `main`
   - Framework preset: **None**
   - Root directory: `/` (repository root)
   - Build command: `exit 0`
   - Build output directory: `.`
5. Save and deploy. Cloudflare will provide the project's `pages.dev` address.

The repository root contains `index.html`, so it is the correct static output directory. The root `_headers` file is also picked up by Pages.

## Connect Pages to the API

The Worker currently allows the GitHub Pages origin. After Cloudflare creates the Pages address:

1. Add the exact production origin (for example, `https://your-project.pages.dev`) to the `ALLOWED_ORIGINS` set in `worker/src/index.js`. Do not include a trailing slash.
2. Commit and push that Worker change to GitHub.
3. From the updated local repository, deploy the Worker with:

   ```powershell
   npx wrangler deploy --config worker/wrangler.jsonc
   ```

4. Test the Pages website, especially routes, operators, fleet, sign-in, arrivals and journey planning.

Do not remove or disable GitHub Pages until the Cloudflare Pages site and API CORS connection have both been tested. Git integration provides automatic production deployments from `main` and preview deployments for pull requests.
