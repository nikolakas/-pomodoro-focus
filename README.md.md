# Pomodoro Focus

A beautiful, feature-rich Pomodoro timer built with vanilla JavaScript and Firebase.

**Live app:** https://nikolakas.github.io/-pomodoro-focus/

## Features

- Pomodoro timer with Work / Short Break / Long Break modes
- Google Sign-In (Firebase Auth) for cloud sync across devices
- Firestore-backed session history, stats, and settings
- Ambient sound mixer (rain, waves, cafe, library, jazz)
- Spotify integration for focus music
- Scene explorer with custom wallpapers
- XP / leveling system and daily goal tracking
- End-of-day summary modal
- Onboarding flow for new users
- Breathing exercise overlay
- Fully responsive, dark-themed UI

## Tech Stack

- HTML / CSS / Vanilla JavaScript
- Firebase v10 (Auth + Firestore)
- Chart.js (stats heatmap)
- GitHub Pages (hosting)

## Setup

This is a static app hosted on GitHub Pages — no build step required.

To run locally, serve the root directory with any static server:

```bash
npx serve .
```

Then open `http://localhost:3000`.

## Firebase Configuration

The Firebase project is `pomodoro-focus-f105a`. The config is embedded in `index.html`.
Make sure `nikolakas.github.io` is listed as an authorized domain in the Firebase Console under **Authentication → Settings → Authorized domains**.