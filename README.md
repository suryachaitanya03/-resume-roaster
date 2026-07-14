# Resume Roaster — Independent Deployment

## What's in this folder
- `index.html` — the frontend (paper/red-pen UI)
- `api/roast.js` — serverless function that calls Claude on the server, keeping your API key hidden from the browser
- `vercel.json` — routes `/` to `index.html`
- `package.json` — minimal project config

## Deploy on Vercel (recommended, free tier is enough)

1. **Get an Anthropic API key**
   Go to [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys → Create Key. Copy it (starts with `sk-ant-...`).

2. **Push this folder to a GitHub repo**
   ```bash
   git init
   git add .
   git commit -m "Resume Roaster"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/resume-roaster.git
   git push -u origin main
   ```

3. **Import into Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repo
   - Before deploying, add an environment variable:
     - Name: `ANTHROPIC_API_KEY`
     - Value: your key from step 1
   - Click **Deploy**

4. **Done** — Vercel gives you a live URL like `resume-roaster-yourname.vercel.app`. You can add a custom domain later in the project settings.

## Deploy on Netlify instead (alternative)

Netlify uses a slightly different serverless function format. If you'd rather use Netlify, let me know and I'll adapt `api/roast.js` into a Netlify Function — the frontend code stays the same either way.

## Cost note

Each roast is one API call (~500-1000 tokens). Claude Sonnet pricing is per-token and quite low per request — for a demo/portfolio tool getting normal traffic, expect this to cost a few cents to a few dollars a month, not more. Check current pricing at [claude.com/pricing](https://claude.com/pricing) before a big traffic spike (e.g. if the LinkedIn post does really well).

## Local testing (optional, before deploying)

```bash
npm install -g vercel
vercel dev
```
This runs the site + serverless function locally at `localhost:3000`, using a `.env.local` file for your key:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
