/* Testing tools: fly (V), Super tool (hotbar 6), addPoints(n), setWeather(name).
   dev: true turns them on when this page is opened from this machine
   (localhost, 127.0.0.1, ::1, or a file). A public site stays off, including with ?dev.
   Set dev to false to play a normal game on a local server. */
const CFG={dev:true};
const DEV=!!CFG.dev&&/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);
