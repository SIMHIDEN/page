# Page Hub + Imposter Party LT (React + TypeScript + TailwindCSS)

This repository now deploys two pages under GitHub Pages:
- Hub landing: `/page/`
- Imposter app: `/page/imposter/`

## Features

- Theme switcher: original brown or brat green/black
- Player setup with add/remove names
- Impostor count selection (default: 1)
- Fixed Lithuanian custom word database
- Per-player reveal flow with progress
- Hold-to-reveal privacy interaction (press and hold to show role/word)
- No organizer master-word reveal button in player reveal view
- Secret word for regular players, `IMPOSTORIUS` for impostors
- Randomly selected player starts the discussion after reveals

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Build output layout:
- `dist/index.html` + `dist/hub.css` for the hub
- `dist/imposter/*` for the game app

## Push to GitHub

```bash
git init
git add .
git commit -m "Create Imposter Party LT app"
git branch -M main
git remote add origin https://github.com/<your-username>/imposter-party-lt.git
git push -u origin main
```
