/**
 * Karavan relay — NGP/1
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8787;
const ROOT = __dirname;
const MAX = 24 * 1024;
const MAX_AUDIO = 96 * 1024;
const FEATURES = ["aes-gcm", "history", "commit", "ptt", "media"];
const floors = new Map();
function pttChan(body) {
  const n = parseInt(body && body.chan, 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(100, n);
}
function floorKey(roomId, chan) {
  return roomId + "#" + chan;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json",
  ".apk": "application/vnd.android.package-archive",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json"
};

const rooms = new Map();
const commits = new Map();
const recent = new Map();
const HIST_FILE = path.join(ROOT, "room-history.json");
try {
  const dumped = JSON.parse(fs.readFileSync(HIST_FILE, "utf8"));
  Object.keys(dumped).forEach((k) => recent.set(k, dumped[k]));
} catch (e) {}
function saveHist() {
  try {
    const o = {};
    recent.forEach((v, k) => { o[k] = (v || []).slice(-200); });
    fs.writeFileSync(HIST_FILE, JSON.stringify(o));
  } catch (e) {}
}

function frame(t, body, id) {
  return JSON.stringify({
    p: "NGP",
    v: 1,
    t,
    id: id || crypto.randomBytes(4).toString("hex"),
    ts: Date.now(),
    body: body || {}
  });
}

function send(ws, t, body, id) {
  if (ws.readyState === 1) ws.send(frame(t, body, id));
}

function error(ws, code, of) {
  send(ws, "ERROR", { code, of: of || null });
}

function parse(raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return { err: "BAD_FRAME" };
  }
  if (!msg || msg.p !== "NGP" || msg.v !== 1 || typeof msg.t !== "string") return { err: "BAD_FRAME" };
  const cap = (msg.t === "PTT_CHUNK" || msg.t === "MEDIA_CHUNK") ? MAX_AUDIO : MAX;
  if (raw.length > cap) return { err: "TOO_LARGE" };
  return { msg };
}

function countryName(code) {
  const m = {
    RU: "Россия", DE: "Германия", HR: "Хорватия", BY: "Беларусь", KZ: "Казахстан",
    UA: "Украина", US: "США", TR: "Турция", RS: "Сербия", PL: "Польша", FR: "Франция",
    IT: "Италия", GB: "Великобритания", NL: "Нидерланды", CN: "Китай", GE: "Грузия"
  };
  if (!code || code === "XX" || code === "T1") return "";
  return m[code] || code;
}

function peersOf(roomId) {
  const set = rooms.get(roomId);
  if (!set) return [];
  const list = [];
  set.forEach((s) => {
    if (!s.nick) return;
    const place = s.place || countryName(s.country);
    list.push({ nick: s.nick, place: place || "" });
  });
  return list;
}

function nicksOf(roomId) {
  return peersOf(roomId).map((p) => (p.place ? p.nick + " · " + p.place : p.nick));
}

function broadcast(roomId, t, body, except) {
  const set = rooms.get(roomId);
  if (!set) return;
  const raw = frame(t, body);
  for (const peer of set) {
    if (peer !== except && peer.readyState === 1) peer.send(raw);
  }
}

const httpSessions = new Map();
function makeHttpPeer() {
  const sid = crypto.randomBytes(8).toString("hex");
  const peer = {
    sid,
    hello: false,
    roomId: null,
    nick: "Гость-" + crypto.randomBytes(2).toString("hex"),
    readyState: 1,
    lastSeen: Date.now(),
    q: [],
    wait: null,
    send: function (raw) {
      this.q.push(typeof raw === "string" ? raw : String(raw));
      if (this.wait) {
        const fn = this.wait;
        this.wait = null;
        fn();
      }
    },
    close: function () { this.readyState = 3; }
  };
  httpSessions.set(sid, peer);
  return peer;
}

function pruneRoom(room) {
  const set = rooms.get(room);
  if (!set) return 0;
  const now = Date.now();
  for (const p of [...set]) {
    if (p.readyState !== 1) set.delete(p);
    else if (p.sid && now - (p.lastSeen || 0) > 25000) {
      set.delete(p);
      httpSessions.delete(p.sid);
    }
  }
  if (set.size === 0) {
    rooms.delete(room);
    commits.delete(room);
    return 0;
  }
  return set.size;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (urlPath === "/ngp") {
    if (req.method === "POST") {
      let buf = "";
      req.on("data", (c) => { buf += c; if (buf.length > MAX_AUDIO) req.destroy(); });
      req.on("end", () => {
        let body = {};
        try { body = JSON.parse(buf || "{}"); } catch (e) { body = {}; }
        let sess = body.sid && httpSessions.get(String(body.sid));
        if (!sess) sess = makeHttpPeer();
        sess.lastSeen = Date.now();
        const frameObj = body.frame || body;
        try {
          const rawFrame = typeof frameObj === "string" ? frameObj : JSON.stringify(frameObj);
          let t = "";
          try { t = (typeof frameObj === "object" && frameObj && frameObj.t) || JSON.parse(rawFrame).t; } catch (e2) {}
          if (!sess.hello && t && t !== "HELLO") sess.hello = true;
          handleMessage(sess, rawFrame);
        } catch (e) {}
        res.writeHead(200, Object.assign({ "Content-Type": "application/json" }, cors));
        res.end(JSON.stringify({ sid: sess.sid, out: sess.q.splice(0, 80) }));
      });
      return;
    }
    if (req.method === "GET") {
      const q = (req.url || "").split("?")[1] || "";
      const sid = decodeURIComponent((q.match(/(?:^|&)sid=([^&]+)/) || [])[1] || "");
      const sess = httpSessions.get(sid);
      if (!sess) {
        res.writeHead(400, Object.assign({ "Content-Type": "application/json" }, cors));
        res.end(JSON.stringify({ error: "no sid" }));
        return;
      }
      sess.lastSeen = Date.now();
      const flush = () => {
        res.writeHead(200, Object.assign({ "Content-Type": "application/json" }, cors));
        res.end(JSON.stringify({ sid: sess.sid, out: sess.q.splice(0, 80) }));
      };
      if (sess.q.length) {
        flush();
        return;
      }
      const t = setTimeout(() => {
        sess.wait = null;
        flush();
      }, 15000);
      sess.wait = () => {
        clearTimeout(t);
        sess.wait = null;
        flush();
      };
      return;
    }
    res.writeHead(405, cors);
    res.end();
    return;
  }
  if (urlPath === "/here") {
    const HERE_FILE = path.join(ROOT, "here.json");
    const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
    const loadH = () => {
      let data = { date: today, people: [] };
      try { data = JSON.parse(fs.readFileSync(HERE_FILE, "utf8")); } catch (e) {}
      if (!data || data.date !== today) data = { date: today, people: [] };
      data.people = Array.isArray(data.people) ? data.people : [];
      return data;
    };
    const saveH = (d) => { try { fs.writeFileSync(HERE_FILE, JSON.stringify(d)); } catch (e) {} };
    const q = new URL(req.url, "http://127.0.0.1").searchParams;
    if (req.method === "GET" && q.get("action") === "set") {
      const data = loadH();
      const login = String(q.get("login") || "").slice(0, 64);
      const hotel = String(q.get("hotel") || "").slice(0, 120);
      data.people = data.people.filter((p) => p.login !== login);
      if (login && hotel) {
        data.people.push({
          login: login,
          name: String(q.get("name") || login).slice(0, 80),
          hotel: hotel,
          city: String(q.get("city") || "").slice(0, 80),
          date: today,
          ts: Math.floor(Date.now() / 1000)
        });
      }
      data.date = today;
      saveH(data);
      res.writeHead(200, Object.assign({ "Content-Type": "application/json" }, cors));
      res.end(JSON.stringify({ ok: true, date: today, people: data.people }));
      return;
    }
    if (req.method === "GET") {
      const data = loadH();
      res.writeHead(200, Object.assign({ "Content-Type": "application/json" }, cors));
      res.end(JSON.stringify({ ok: true, date: today, people: data.people }));
      return;
    }
    res.writeHead(405, cors);
    res.end();
    return;
  }
  if (urlPath === "/naryad") {
    const NARYAD_FILE = path.join(ROOT, "naryad.json");
    const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
    const dayOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
    const loadN = () => {
      let data = { date: today, naryad: {}, incidents: [] };
      try { data = JSON.parse(fs.readFileSync(NARYAD_FILE, "utf8")); } catch (e) {}
      data.naryad = data.naryad || {};
      data.incidents = data.incidents || [];
      const until = data.naryad.until || "";
      const dead = dayOk(until) ? today > until : (data.date && data.date !== today);
      if (dead) data = { date: today, naryad: {}, incidents: [] };
      return data;
    };
    const saveN = (d) => { try { fs.writeFileSync(NARYAD_FILE, JSON.stringify(d)); } catch (e) {} };
    if (req.method === "GET") {
      res.writeHead(200, Object.assign({ "Content-Type": "application/json" }, cors));
      res.end(JSON.stringify(loadN()));
      return;
    }
    if (req.method === "POST") {
      let buf = "";
      req.on("data", (c) => { buf += c; if (buf.length > 20000) req.destroy(); });
      req.on("end", () => {
        let body = {};
        try { body = JSON.parse(buf || "{}"); } catch (e) { body = {}; }
        const data = loadN();
        if (body.action === "incident") {
          data.incidents.push({
            login: String(body.login || "").slice(0, 64),
            name: String(body.name || "").slice(0, 80),
            text: String(body.text || "").slice(0, 1000),
            ts: Math.floor(Date.now() / 1000)
          });
        } else {
          data.date = today;
          data.naryad = {
            since: dayOk(body.since) ? body.since : today,
            until: dayOk(body.until) ? body.until : (dayOk(body.since) ? body.since : today),
            wagons: Math.max(0, Math.min(999, parseInt(body.wagons, 10) || 0)),
            cars: Math.max(0, Math.min(999, parseInt(body.cars, 10) || 0)),
            from: String(body.from || "").slice(0, 80),
            to: String(body.to || "").slice(0, 80),
            cargo: String(body.cargo || "").slice(0, 120),
            senior: String(body.senior || "").slice(0, 80),
            hotel: String(body.hotel || "").slice(0, 80),
            crew: String(body.crew || "").slice(0, 200),
            note: String(body.note || "").slice(0, 500),
            by: String(body.name || body.by || "").slice(0, 80)
          };
        }
        saveN(data);
        res.writeHead(200, Object.assign({ "Content-Type": "application/json" }, cors));
        res.end(JSON.stringify(Object.assign({ ok: true }, data)));
      });
      return;
    }
    res.writeHead(405, cors);
    res.end();
    return;
  }
  if (urlPath === "/weather") {
    const city = String(new URL(req.url, "http://127.0.0.1").searchParams.get("city") || "").slice(0, 80);
    const sendJson = (code, obj) => {
      res.writeHead(code, Object.assign({ "Content-Type": "application/json" }, cors));
      res.end(typeof obj === "string" ? obj : JSON.stringify(obj));
    };
    if (!city) { sendJson(400, { ok: false }); return; }
    const grab = (url) => new Promise((resolve, reject) => {
      const rq = https.get(url, { headers: { "User-Agent": "Radar/1.0" } }, (r) => {
        let buf = "";
        r.on("data", (c) => { buf += c; if (buf.length > 200000) r.destroy(); });
        r.on("end", () => resolve(buf));
      });
      rq.setTimeout(8000, () => { rq.destroy(); reject(new Error("timeout")); });
      rq.on("error", reject);
    });
    const geo = "https://geocoding-api.open-meteo.com/v1/search?count=1&language=ru&name=" + encodeURIComponent(city);
    grab(geo).then((raw) => {
      let hit = null;
      try { hit = (JSON.parse(raw).results || [])[0]; } catch (e) {}
      if (!hit) { sendJson(200, { ok: false }); return null; }
      const url = "https://api.open-meteo.com/v1/forecast?latitude=" + hit.latitude + "&longitude=" + hit.longitude + "&current=temperature_2m,weather_code,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4";
      return grab(url);
    }).then((raw) => {
      if (raw == null) return;
      sendJson(200, raw);
    }).catch(() => sendJson(200, { ok: false }));
    return;
  }
  let file = urlPath === "/" ? "/index.html" : urlPath;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
  if (file.endsWith("/")) file += "index.html";
  const abs = path.join(ROOT, file);
  if (!abs.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(abs, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(abs)] || "application/octet-stream" });
    res.end(data);
  });
});

function handleMessage(ws, raw) {
    const parsed = parse(raw);
    if (parsed.err) {
      error(ws, parsed.err);
      if (parsed.err === "TOO_LARGE") ws.close();
      return;
    }
    const { msg } = parsed;
    const t = msg.t;
    const body = msg.body || {};

    if (t === "PING") {
      send(ws, "PONG", { n: body.n || 0 }, msg.id);
      return;
    }

    if (t === "HELLO") {
      ws.hello = true;
      send(ws, "WELCOME", {
        server: "karavan-relay/0.3",
        sid: crypto.randomBytes(8).toString("hex"),
        features: FEATURES
      }, msg.id);
      return;
    }

    if (!ws.hello) {
      error(ws, "NO_HELLO", msg.id);
      return;
    }

    if (t === "JOIN") {
      const room = String(body.room || "").slice(0, 64);
      const nick = String(body.nick || ws.nick).slice(0, 32);
      const commit = String(body.commit || "").toLowerCase();
      if (!room || !/^[0-9a-f]{64}$/.test(commit)) {
        error(ws, "BAD_FRAME", msg.id);
        return;
      }
      if (room === "smena") {
        commits.set(room, commit);
      } else if (commits.has(room) && commits.get(room) !== commit) {
        const busy = pruneRoom(room);
        if (busy) {
          error(ws, "BAD_COMMIT", msg.id);
          return;
        }
      }
      if (!commits.has(room)) commits.set(room, commit);
      if (ws.roomId && rooms.has(ws.roomId)) rooms.get(ws.roomId).delete(ws);
      ws.roomId = room;
      ws.nick = nick;
      ws.place = String(body.place || ws.place || "").slice(0, 48);
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);
      send(ws, "JOINED", {
        room,
        nick,
        peers: rooms.get(room).size,
        names: nicksOf(room),
        where: peersOf(room),
        history: recent.get(room) || []
      }, msg.id);
      broadcast(room, "PEERS", { room, count: rooms.get(room).size, names: nicksOf(room), where: peersOf(room) }, null);
      return;
    }

    if (t === "PLACE") {
      ws.place = String(body.place || "").slice(0, 48);
      if (ws.roomId) {
        broadcast(ws.roomId, "PEERS", { room: ws.roomId, count: rooms.get(ws.roomId).size, names: nicksOf(ws.roomId), where: peersOf(ws.roomId) }, null);
      }
      send(ws, "ACK", { of: msg.id });
      return;
    }

    if (t === "LEAVE") {
      if (ws.roomId && rooms.has(ws.roomId)) {
        rooms.get(ws.roomId).delete(ws);
        broadcast(ws.roomId, "PEERS", { room: ws.roomId, count: rooms.get(ws.roomId).size, names: nicksOf(ws.roomId), where: peersOf(ws.roomId) }, null);
      }
      ws.roomId = null;
      send(ws, "ACK", { of: msg.id });
      return;
    }

    if (t === "CIPHER") {
      if (!ws.roomId) {
        error(ws, "NOT_IN_ROOM", msg.id);
        return;
      }
      const packet = {
        room: ws.roomId,
        nick: ws.nick,
        iv: String(body.iv || "").slice(0, 64),
        data: String(body.data || "").slice(0, 20000)
      };
      if (!packet.iv || !packet.data) {
        error(ws, "BAD_FRAME", msg.id);
        return;
      }
      const stored = { t: "CIPHER", ts: Date.now(), body: packet };
      const list = recent.get(ws.roomId) || [];
      list.push(stored);
      recent.set(ws.roomId, list.slice(-200));
      saveHist();
      broadcast(ws.roomId, "CIPHER", packet, null);
      send(ws, "ACK", { of: msg.id });
      return;
    }

    if (t === "PTT_START") {
      if (!ws.roomId) {
        error(ws, "NOT_IN_ROOM", msg.id);
        return;
      }
      const chan = pttChan(body);
      const key = floorKey(ws.roomId, chan);
      const cur = floors.get(key);
      const fresh = cur && cur.ws && cur.ws.readyState === 1 && (Date.now() - cur.ts) < 12000;
      if (fresh && cur.ws !== ws && cur.nick !== ws.nick) {
        error(ws, "PTT_BUSY", msg.id);
        return;
      }
      floors.set(key, { ws: ws, nick: ws.nick, ts: Date.now(), chan: chan });
      broadcast(ws.roomId, "PTT_START", { room: ws.roomId, nick: ws.nick, video: !!body.video, chan: chan }, null);
      send(ws, "ACK", { of: msg.id });
      return;
    }

    if (t === "PTT_CHUNK") {
      if (!ws.roomId) {
        error(ws, "NOT_IN_ROOM", msg.id);
        return;
      }
      const chan = pttChan(body);
      const cur = floors.get(floorKey(ws.roomId, chan));
      if (!cur || cur.ws !== ws) return;
      cur.ts = Date.now();
      const packet = {
        room: ws.roomId,
        nick: ws.nick,
        chan: chan,
        video: !!body.video,
        seq: Number(body.seq) || 0,
        mime: String(body.mime || "audio/webm").slice(0, 40),
        iv: String(body.iv || "").slice(0, 64),
        data: String(body.data || "").slice(0, 90000)
      };
      if (!packet.iv || !packet.data) {
        error(ws, "BAD_FRAME", msg.id);
        return;
      }
      broadcast(ws.roomId, "PTT_CHUNK", packet, ws);
      return;
    }

    if (t === "PTT_END") {
      if (ws.roomId) {
        const chan = pttChan(body);
        const key = floorKey(ws.roomId, chan);
        const cur = floors.get(key);
        if (cur && cur.ws === ws) floors.delete(key);
        broadcast(ws.roomId, "PTT_END", { room: ws.roomId, nick: ws.nick, chan: chan }, null);
      }
      send(ws, "ACK", { of: msg.id });
      return;
    }

    if (t === "CLEAR_MINE") {
      if (!ws.roomId) {
        error(ws, "NOT_IN_ROOM", msg.id);
        return;
      }
      const list = (recent.get(ws.roomId) || []).filter((h) => !h.body || h.body.nick !== ws.nick);
      recent.set(ws.roomId, list);
      saveHist();
      broadcast(ws.roomId, "CLEAR_MINE", { room: ws.roomId, nick: ws.nick }, null);
      send(ws, "ACK", { of: msg.id });
      return;
    }

    if (t === "MEDIA_START" || t === "MEDIA_END") {
      if (!ws.roomId) {
        error(ws, "NOT_IN_ROOM", msg.id);
        return;
      }
      broadcast(ws.roomId, t, {
        room: ws.roomId,
        nick: ws.nick,
        mime: String(body.mime || "").slice(0, 40),
        kind: String(body.kind || "image").slice(0, 12),
        name: String(body.name || "").slice(0, 80),
        total: Number(body.total) || 0
      }, t === "MEDIA_START" ? null : ws);
      send(ws, "ACK", { of: msg.id });
      return;
    }

    if (t === "MEDIA_CHUNK") {
      if (!ws.roomId) {
        error(ws, "NOT_IN_ROOM", msg.id);
        return;
      }
      const packet = {
        room: ws.roomId,
        nick: ws.nick,
        seq: Number(body.seq) || 0,
        mime: String(body.mime || "").slice(0, 40),
        kind: String(body.kind || "image").slice(0, 12),
        iv: String(body.iv || "").slice(0, 64),
        data: String(body.data || "").slice(0, 90000)
      };
      if (!packet.iv || !packet.data) {
        error(ws, "BAD_FRAME", msg.id);
        return;
      }
      broadcast(ws.roomId, "MEDIA_CHUNK", packet, ws);
      return;
    }

    error(ws, "UNKNOWN_TYPE", msg.id);
}

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  ws.hello = false;
  ws.roomId = null;
  ws.place = "";
  ws.country = String((req && req.headers && req.headers["cf-ipcountry"]) || "").slice(0, 2);
  ws.nick = "Гость-" + crypto.randomBytes(2).toString("hex");
  ws.on("message", (raw) => handleMessage(ws, raw));

  ws.on("close", () => {
    if (ws.roomId) {
      for (const [key, cur] of floors) {
        if (cur && cur.ws === ws) {
          floors.delete(key);
          broadcast(ws.roomId, "PTT_END", { room: ws.roomId, nick: ws.nick, chan: cur.chan || 0 }, null);
        }
      }
    }
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws);
      broadcast(ws.roomId, "PEERS", { room: ws.roomId, count: rooms.get(ws.roomId).size, names: nicksOf(ws.roomId), where: peersOf(ws.roomId) }, null);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("NGP/1 relay http://0.0.0.0:" + PORT + "  ws://host:" + PORT + "/ws");
});
