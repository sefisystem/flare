# SEFI – World Cup 2026
## Cloudflare Pages Deploy Guide (Free Forever)

---

## WHY CLOUDFLARE PAGES?
✅ Unlimited bandwidth — no limits ever
✅ Free forever — no credit card needed
✅ 330+ global locations — faster than Netlify
✅ Serverless functions included free
✅ Custom domain free

---

## STEP 1 — Create GitHub account + repo

1. Go to https://github.com → Sign up free
2. Click "+" top right → "New repository"
3. Name: sefi-wc2026 → Public → Create
4. Click "uploading an existing file"
5. Drag ALL files from this folder into the page
6. Click "Commit changes"

---

## STEP 2 — Deploy on Cloudflare Pages

1. Go to https://pages.cloudflare.com
2. Sign up free (no credit card)
3. Click "Create a project"
4. Click "Connect to Git" → authorize GitHub
5. Select your sefi-wc2026 repo
6. Set these build settings:
   - Framework preset: None
   - Build command: (leave EMPTY)
   - Build output directory: public
7. Click "Save and Deploy"
8. Wait ~30 seconds → your site is live!

Your URL will be: https://sefi-wc2026.pages.dev

---

## STEP 3 — Add your Anthropic API key

(Scores work WITHOUT this. Only needed for AI Brain explanations.)

1. In Cloudflare Pages → your project → Settings
2. Click "Environment Variables"
3. Click "Add variable"
4. Variable name:  ANTHROPIC_API_KEY
   Value:          sk-ant-YOUR_NEW_KEY_HERE
5. Set to: Production
6. Click "Save"
7. Go to Deployments → click "Retry deploy"

---

## STEP 4 — Install on your phone

iPhone:
1. Open https://sefi-wc2026.pages.dev in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add" — SEFI icon appears on your home screen

Android:
1. Open the URL in Chrome
2. Tap the 3 dots (top right)
3. Tap "Add to Home Screen" or "Install app"
4. Tap "Install"

---

## HOW THE API CALLS WORK

App (browser)
    ↓
/api/ai  →  functions/api/ai.js  →  Claude API (your key, secure)
/api/scores  →  functions/api/scores.js  →  worldcup26.ir (free, no key)
                                          →  openfootball (fallback, free)

Your API key is ONLY in Cloudflare's server environment.
It never appears in your code or browser.

---

## FILE STRUCTURE

sefi-wc2026/
├── wrangler.toml             ← Cloudflare config
├── README.md                 ← This file
├── functions/
│   └── api/
│       ├── ai.js             ← Claude AI proxy (Workers format)
│       └── scores.js         ← Free scores proxy (Workers format)
└── public/
    ├── index.html            ← Full app
    ├── manifest.json         ← PWA install
    ├── sw.js                 ← Offline support
    └── icons/                ← Home screen icons

---

## FREE TIER LIMITS (Cloudflare Pages)

| Feature          | Limit              |
|------------------|--------------------|
| Bandwidth        | Unlimited ∞        |
| Requests         | Unlimited ∞        |
| Builds/month     | 500                |
| Functions        | 100,000/day free   |
| Custom domains   | Unlimited          |
| SSL certificate  | Free, automatic    |

For a World Cup app used by friends/family this is more than enough.
