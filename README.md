# BURST — Find the Pipe

A first-person digging game in the browser (three.js r128, no build step). Something under the lawn is leaking: probe the yard, dig up the burst main, and press E on the leak to shut it off before the rising water floods the yard. The yard cycles through clear sky, cloud and rain.

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
| Space | Jump; swim up when you are in the water |
| E | Use whatever you are aiming at (pick up, workbench, socket, pump, leak). Drop what you are carrying first |
| E at the yellow pump / P | Start or stop the pump (needs the Pump upgrade). Water drops while it runs |
| E at the workbench | Open the shop; click an upgrade to buy it (walk away or press E to close) |
| G | Place a garden light where you aim (or pick up the one nearby) |
| E at the wall socket | Switch the garden lights on / off |
| E at a cut cable | Splice it (aim at the break). Shovels and a running mower cut cables |
| L | Flashlight (needs the Flashlight upgrade) |
| B | Collection book |
| Esc | Pause menu |

## Settings

Open Settings from the main menu or the pause menu. The choices stay on this machine and are not shared in co-op. Shadows is Off, Near, Normal or Far: how far house, fence and player shadows reach. Outside grass is Off, Fence (the strip just past the fence) or Full (out to the hedge). View distance is how soon fog hides the neighbourhood. Look is mouse sensitivity. Reduce motion turns off head bob, sway and shake. Volume is Off, Low or Full. Yard size stays on the main menu.

## Day, night and upgrades

A full day lasts 10 minutes and about 3.5 of them are night. It is too dark to dig at night unless your flashlight is on. Points from finds go into a bank that you spend at the workbench by the house on seven upgrades: Shovel, Probe, Flashlight, Mower, Boots, Garden lights (up to 4 lamps on a cable from the socket on the house; you can dig near a lit lamp at night) and Pump (slows the rising water). Each yard starts with 80 points and no upgrades. A new yard resets you to that. In co-op the bank and upgrades are shared by the whole team.

## Flood, gas and cave-ins

Water rises from the bedrock toward the surface (about 12 / 15 / 18 minutes on Small / Medium / Large in co-op; solo gets about 75% more time). It speeds up once the main is open (more so with a team), and a Pump upgrade both slows the rise and lets you drain: E at the yellow pump by the house, or P from anywhere, turns it on. If the water reaches the brim you lose. Space swims when you are waist-deep, which is also a way out of a deep hole.

Houses, fences and trees keep a baked neighbourhood shadow map that rebakes when the sun moves. Nearby holes and movers use a tight player-follow sun shadow.

Old tanks and lines are decoys, not scrap. Hitting an uncovered gas line costs a 25-point call-out fee and fills the hole with a cloud: stay in it for 3 seconds and you pass out. Wide caverns can cave in after a warning creak. A knockout fades to black, respawns you by the workbench, and takes 10% of the bank (at least 5 points).

## Yard size, loot and the collection book

Pick Small (20 m), Medium (28 m) or Large (36 m) before starting; the choice is remembered, and in co-op the host's choice applies to everyone. Bigger yards hold more buried loot (about 1 trash per 12 m² and 1 artifact per 40 m²). Finds have four rarity tiers — Common, Rare, Epic, Legendary — and the odds improve the deeper you dig. A successful probe draws a ring on the ground; cooldown fills the probe slot on the hotbar. About 1 in 15 small rocks is a glowing gem (quartz, amethyst, emerald, diamond): carry it to the crate to sell it. A plain rock is worth 1 point at the crate or the trashcan.

Press B (or open it from the pause or main menu) for the collection book. Counts are saved on this machine and update when anyone on the team banks a find or sells a gem.

## Co-op (2-4 players)

Menu > Co-op multiplayer. Set your name (up to 12 characters; it is remembered), then host a game or enter a code to join. Your name appears above your character. Leave it blank and you show up as Host or Player 2. Share the 5-letter room code, or the invite link from the pause menu. Everyone digs the same yard, shares the mower, the finds, the score and the flood. The host starts new yards; if the host leaves, the session ends. Connections are peer-to-peer (WebRTC via PeerJS); the public PeerJS broker is only used to introduce players, so strict networks may fail to connect.

## Run locally

Serve the folder over HTTP, for example `python -m http.server`, then open `http://localhost:8000`.

On localhost or with `?dev` in the URL, the console commands are `addPoints(n)` and `setWeather("clear")`, `setWeather("cloud")`, `setWeather("rain")`, or `setWeather("auto")`. There is no key for them. `setWeather` only changes the sky on your machine.

## Files

- `index.html`: page markup and screens
- `style.css`: styles
- `game.js`: game code
- `net.js`: co-op networking (host/join, validation, snapshots, remote players)
- `lib/three.min.js`: bundled three.js r128
- `lib/peerjs.min.js`: bundled PeerJS 1.5.4
- `CNAME`: custom domain for GitHub Pages
