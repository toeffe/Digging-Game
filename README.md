# BURST — Find the Pipe

A first-person digging game in the browser (three.js r128, no build step). Something under the lawn is leaking: probe the yard, dig, and expose the burst main before the basement floods.

**Play:** https://digging.t-tek.dev

## Controls

| Input | Action |
| --- | --- |
| Mouse | Look |
| 1-4 / mouse wheel | Hotbar: shovel, ground probe, flashlight, garden light (the last two unlock at the workbench) |
| Left click | Use the selected item; with the shovel, hold to dig (mown grass only) |
| Left click, holding the mower | Start / stop the engine |
| F / right-click | Ground probe |
| W A S D, Shift | Walk, sprint |
| Space | Jump |
| E | Grab / drop the mower, a rock, or a find (trash goes in the trashcan, artifacts in the crate) |
| E at the workbench | Open the shop; 1-6 buys an upgrade (walk away or press E to close) |
| G | Place a garden light where you aim (or pick up the one nearby) |
| E at the wall socket | Switch the garden lights on / off |
| E at a cut cable | Splice it (aim at the break). Shovels and a running mower cut cables |
| L | Flashlight (needs the Flashlight upgrade) |
| Esc | Pause menu (New yard is here) |

## Day, night and upgrades

A full day lasts 10 minutes and about 3.5 of them are night. It is too dark to dig at night unless your flashlight is on. Points from finds go into a bank that you spend at the workbench by the house on six upgrades: Shovel, Probe, Flashlight, Mower, Boots and Garden lights (up to 4 lamps on a cable from the socket on the house, the cable reaches the whole yard; you can dig near a lit lamp at night). Each yard starts with 80 points and no upgrades. A new yard resets you to that. In co-op the bank and upgrades are shared by the whole team.

## Yard size, loot and gems

Pick Small (20 m), Medium (28 m) or Large (36 m) before starting; the choice is remembered, and in co-op the host's choice applies to everyone. Bigger yards hold more buried loot (about 1 trash per 12 m² and 1 artifact per 40 m²). A successful probe draws a ring on the ground; cooldown fills the probe slot on the hotbar. About 1 in 15 small rocks is a glowing gem (quartz, amethyst, emerald): carry it to the crate to sell it. A plain rock is worth 1 point at the crate or the trashcan. An uncovered decoy (tank, old pipe, gas line, well) can be scrapped on the spot for 2–4 points.

## Co-op (2-4 players)

Menu > Co-op multiplayer. Set your name (up to 12 characters; it is remembered), then host a game or enter a code to join. Your name appears above your character. Leave it blank and you show up as Host or Player 2. Share the 5-letter room code, or the invite link from the pause menu. Everyone digs the same yard, shares the mower, the finds and the score. The host starts new yards; if the host leaves, the session ends. Connections are peer-to-peer (WebRTC via PeerJS); the public PeerJS broker is only used to introduce players, so strict networks may fail to connect.

## Run locally

Serve the folder over HTTP, for example `python -m http.server`, then open `http://localhost:8000`.

On localhost or with `?dev` in the URL, the console command `addPoints(n)` adds n points. There is no key for it.

## Files

- `index.html`: page markup and screens
- `style.css`: styles
- `game.js`: game code
- `net.js`: co-op networking (host/join, validation, snapshots, remote players)
- `lib/three.min.js`: bundled three.js r128
- `lib/peerjs.min.js`: bundled PeerJS 1.5.4
- `CNAME`: custom domain for GitHub Pages
