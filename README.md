# Resume Roaster — Independent Deployment

## What's in this folder
- `index.html` — the frontend (paper/red-pen UI)
- `api/roast.js` — serverless function that calls Claude on the server, keeping your API key hidden from the browser
- `vercel.json` — routes `/` to `index.html`
- `package.json` — minimal project config
