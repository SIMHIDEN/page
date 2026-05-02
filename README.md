# Imposter Party LT (React + TypeScript + TailwindCSS)

A lightweight, phone-first web app for the Imposter party game.

## Features

- Minimal soft-brown UI theme
- Player setup with add/remove names
- Impostor count selection (default: 1)
- Fixed Lithuanian custom word database
- Per-player reveal flow with progress
- Hold-to-reveal privacy interaction (press and hold to show role/word)
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

## Push to GitHub

```bash
git init
git add .
git commit -m "Create Imposter Party LT app"
git branch -M main
git remote add origin https://github.com/<your-username>/imposter-party-lt.git
git push -u origin main
```
