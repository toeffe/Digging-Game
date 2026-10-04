# BURST — Find the Pipe

A first-person digging game in the browser (three.js r128, no build step). Something under the lawn is leaking: probe the yard, dig, and expose the burst main before the basement floods.

**Play:** https://digging.t-tek.dev

## Controls

| Input | Action |
| --- | --- |
| Mouse | Look |
| Left click (hold) | Dig |
| F / right-click | Ground probe |
| W A S D, Shift | Walk, sprint |
| Q / E | Turn |
| Esc | Pause menu (New yard is here) |

## Run locally

Serve the folder over HTTP, for example `python -m http.server`, then open `http://localhost:8000`.

## Files

- `index.html`: page markup and screens
- `style.css`: styles
- `game.js`: all game code
- `lib/three.min.js`: bundled three.js r128
- `CNAME`: custom domain for GitHub Pages
