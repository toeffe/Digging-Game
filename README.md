# BURST — Find the Pipe

A first-person digging game in the browser (three.js r128, no build step). Something under the lawn is leaking: probe the yard, dig, and expose the burst main before the basement floods.

**Play:** https://digging.t-tek.dev

## Controls

| Input | Action |
| --- | --- |
| Mouse | Look |
| Left click (hold) | Dig (mown grass only) |
| Left click, holding the mower | Start / stop the engine |
| F / right-click | Ground probe |
| W A S D, Shift | Walk, sprint |
| E | Grab / drop the mower, a rock, or a find (trash goes in the trashcan, artifacts in the crate) |
| Esc | Pause menu (New yard is here) |

## Co-op (2-4 players)

Menu > Co-op multiplayer > Host a game. Share the 5-letter room code (or the invite link from the pause menu). Everyone digs the same yard, shares the mower, the finds and the score. The host starts new yards; if the host leaves, the session ends. Connections are peer-to-peer (WebRTC via PeerJS); the public PeerJS broker is only used to introduce players, so strict networks may fail to connect.

## Run locally

Serve the folder over HTTP, for example `python -m http.server`, then open `http://localhost:8000`.

## Files

- `index.html`: page markup and screens
- `style.css`: styles
- `game.js`: game code
- `net.js`: co-op networking (host/join, validation, snapshots, remote players)
- `lib/three.min.js`: bundled three.js r128
- `lib/peerjs.min.js`: bundled PeerJS 1.5.4
- `CNAME`: custom domain for GitHub Pages
