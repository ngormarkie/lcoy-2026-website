# LCOY Sierra Leone 2026 — Website

Multi-page site for the Local Conference of Youth Sierra Leone 2026.
Built with React + Vite for the existing Cloudflare Pages workflow.

## Run locally
```
npm install
npm run dev
```

## Build
```
npm run build
```
Output goes to `dist/`.

## Deploy (Cloudflare Pages)
- Build command: `npm run build`
- Build output directory: `dist`
- Or drag-drop the contents of `dist/` to Cloudflare Pages.

## Pages
Home, About, Programme, Thematic Areas, Past Editions, Contact, Register.
(Partners is now a section on the homepage, not a separate page.)

## Homepage hero slider
- Full-bleed auto-rotating image slider (5s) with a left gradient scrim so text stays readable.
- Per-slide caption pill, dots, and prev/next arrows.
- The countdown band sits directly below the hero.
- Add real photos in `public/photos/` named `2024-1.jpg`, `2024-2.jpg`, `2025-1.jpg`, `2025-2.jpg`
  (see `public/photos/README.txt`). Until then, each slide falls back to a brand gradient.

## Animation
Energetic but selective: hero slide transitions with Ken Burns zoom, scroll-reveal on sections,
animated number counters on the stats band, hover micro-interactions, and a scrolling coalition ticker.
All motion respects `prefers-reduced-motion`.

## To finish before launch
- Confirm the October 2026 dates (countdown target is 07 Oct 2026 placeholder in src/App.jsx).
- Add real 2024 / 2025 photos to `public/photos/` and the Past Editions gallery.
- Connect the Register and Contact forms to a backend (Google Form, KoboToolbox, Firebase, or a Cloudflare Worker).

## Note
A single-file `lcoy-sl-2026-prototype.html` is also provided in the parent outputs folder for quick preview
without a build step. It uses the same design, slider, and animations.
