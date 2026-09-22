/**
 * Karavan relay — NGP/1
 */
const http = require("http");
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

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json",
  ".apk": "application/vnd.android.package-archive"
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

function nicksOf(roomId) {
  const set = rooms.get(roomId);
  if (!set) return [];
  const names = [];
  set.forEach((s) => {
    if (s.nick) names.push(String(s.nick).slice(0, 32));
  });
  return names;
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
  if (urlPath === "/naryad") {
    const NARYAD_FILE = path.join(ROOT, "naryad.json");
    const today = new Date().toISOString().slice(0, 10);
    const loadN = () => {
      let data = { date: today, naryad: {}, incidents: [] };
      try { data = JSON.parse(fs.readFileSync(NARYAD_FILE, "utf8")); } catch (e) {}
      if (data.date !== today) data = { date: today, naryad: {}, incidents: [] };
      data.naryad = data.naryad || {};
      data.incidents = data.incidents || [];
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
          data.naryad = {
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
  let file = urlPath === "/" ? "/index.html" : urlPath;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
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
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);
      send(ws, "JOINED", {
        room,
        nick,
        peers: rooms.get(room).size,
        names: nicksOf(room),
        history: recent.get(room) || []
      }, msg.id);
      broadcast(room, "PEERS", { room, count: rooms.get(room).size, names: nicksOf(room) }, null);
      return;
    }

    if (t === "LEAVE") {
      if (ws.roomId && rooms.has(ws.roomId)) {
        rooms.get(ws.roomId).delete(ws);
        broadcast(ws.roomId, "PEERS", { room: ws.roomId, count: rooms.get(ws.roomId).size, names: nicksOf(ws.roomId) }, null);
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
      const owner = floors.get(ws.roomId);
      if (owner && owner !== ws && owner.readyState === 1) {
        error(ws, "PTT_BUSY", msg.id);
        return;
      }
      floors.set(ws.roomId, ws);
      broadcast(ws.roomId, "PTT_START", { room: ws.roomId, nick: ws.nick }, null);
      send(ws, "ACK", { of: msg.id });
      return;
    }

    if (t === "PTT_CHUNK") {
      if (!ws.roomId) {
        error(ws, "NOT_IN_ROOM", msg.id);
        return;
      }
      if (floors.get(ws.roomId) !== ws) {
        error(ws, "PTT_BUSY", msg.id);
        return;
      }
      const packet = {
        room: ws.roomId,
        nick: ws.nick,
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
      if (ws.roomId && floors.get(ws.roomId) === ws) floors.delete(ws.roomId);
      if (ws.roomId) broadcast(ws.roomId, "PTT_END", { room: ws.roomId, nick: ws.nick }, null);
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

wss.on("connection", (ws) => {
  ws.hello = false;
  ws.roomId = null;
  ws.nick = "Гость-" + crypto.randomBytes(2).toString("hex");
  ws.on("message", (raw) => handleMessage(ws, raw));

  ws.on("close", () => {
    if (ws.roomId && floors.get(ws.roomId) === ws) {
      floors.delete(ws.roomId);
      broadcast(ws.roomId, "PTT_END", { room: ws.roomId, nick: ws.nick }, null);
    }
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws);
      broadcast(ws.roomId, "PEERS", { room: ws.roomId, count: rooms.get(ws.roomId).size }, null);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("NGP/1 relay http://0.0.0.0:" + PORT + "  ws://host:" + PORT + "/ws");
});
