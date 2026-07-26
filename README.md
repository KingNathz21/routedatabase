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
