// Hollow co-op relay: forwards each player's presence to the others in the same room. Stores nothing.
const { WebSocketServer } = require('ws');
const PORT = +process.env.PORT || 4330;
const ORIGINS = ['https://ninjaxan.github.io', 'http://localhost:5399', 'http://127.0.0.1:5399'];
const MAX_ROOM = 4, MAX_ROOMS = 200, MAX_MSG = 2048;
const rooms = new Map(); // name -> Set<ws>

const wss = new WebSocketServer({
  port: PORT, host: '127.0.0.1', maxPayload: MAX_MSG,
  verifyClient: ({ origin }) => ORIGINS.includes(origin),
});

wss.on('connection', (ws, req) => {
  const name = new URL(req.url, 'http://x').searchParams.get('room') || '';
  if (!/^hollow-[a-z]{4}$/.test(name)) return ws.close(4000, 'bad room');
  let set = rooms.get(name);
  if (!set) { if (rooms.size >= MAX_ROOMS) return ws.close(4001, 'busy'); rooms.set(name, set = new Set()); }
  if (set.size >= MAX_ROOM) return ws.close(4002, 'full');
  ws.peer = Math.random().toString(36).slice(2, 10);
  ws.alive = true;
  set.add(ws);
  let n = 0, t0 = Date.now();
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', (buf) => {
    if (Date.now() - t0 > 1000) { n = 0; t0 = Date.now(); }
    if (++n > 40) return; // ponytail: drop floods silently; the game sends ~15/s
    let presence;
    try { presence = JSON.parse(buf).presence; } catch { return; }
    if (!presence || typeof presence !== 'object') return;
    const out = JSON.stringify({ peer: ws.peer, presence });
    for (const o of set) if (o !== ws && o.readyState === 1) o.send(out);
  });
  ws.on('close', () => {
    set.delete(ws);
    if (!set.size) rooms.delete(name);
    else for (const o of set) if (o.readyState === 1) o.send(JSON.stringify({ peer: ws.peer, leave: 1 }));
  });
});

setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } } }, 15000);
console.log('hollow relay on', PORT);
