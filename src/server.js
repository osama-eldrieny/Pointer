/**
 * Pointer server — zero-dependency Node (node:http only).
 *
 * Run anywhere with `node server.js` — no `npm install`. Serves the web
 * component (/pointer.js), the AI skill (/skill.md), and the JSON API. Comment
 * logic lives in core.js; this file provides the HTTP wiring + filesystem store.
 * (For Netlify, netlify/functions/api.mjs reuses the same core with a Blobs store.)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config.json');
const { handleApi, STATUSES, DEFAULT_STATUS } = require('./core.js');

const PORT = process.env.POINTER_PORT || config.server_port || 3001;
const DATA_DIR = path.resolve(__dirname, process.env.POINTER_DATA || config.data_dir || './data');

// --- Filesystem store -------------------------------------------------------
// Comments are partitioned per project AND per status:
//   data/<project>/{open,pending-apply,applied}.json   # one file per status
//   data/<project>/pending.json                          # AI apply work queue
// The legacy single-file history (data/<project>/comments.json) is merged in on
// read and migrated into the per-status files on the next write, then removed.
// STATUSES / DEFAULT_STATUS come from core.js (single source of truth).
const projectDir = (project) => path.join(DATA_DIR, project);
const fileFor = (project, name) => path.join(projectDir(project), name);

const readArr = (file) => {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []; }
  catch (e) { console.error(`Error reading ${file}:`, e.message); return []; }
};
const writeArr = (project, name, data) => {
  const dir = projectDir(project);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fileFor(project, name), JSON.stringify(data, null, 2), 'utf8');
};

// Merge the per-status files (plus any legacy comments.json) into one history,
// ordered by creation time. Per-status files win over the legacy file by id.
const readComments = (project) => {
  const byId = new Map();
  for (const c of readArr(fileFor(project, 'comments.json'))) byId.set(c.id, c);
  for (const s of STATUSES) for (const c of readArr(fileFor(project, `${s}.json`))) byId.set(c.id, c);
  return [...byId.values()].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
};

// Split the array by status, write one file per status (always — empty files
// clear out comments that moved away), and drop the migrated legacy file.
const writeComments = (project, arr) => {
  const buckets = Object.fromEntries(STATUSES.map((s) => [s, []]));
  for (const c of arr) (buckets[c.status] || buckets[DEFAULT_STATUS]).push(c);
  for (const s of STATUSES) writeArr(project, `${s}.json`, buckets[s]);
  const legacy = fileFor(project, 'comments.json');
  if (fs.existsSync(legacy)) fs.rmSync(legacy);
};

const fsStore = {
  getComments: async (p) => readComments(p),
  setComments: async (p, arr) => writeComments(p, arr),
  getPending: async (p) => readArr(fileFor(p, 'pending.json')),
  setPending: async (p, arr) => writeArr(p, 'pending.json', arr),
};

// --- HTTP helpers (replacing express + cors) --------------------------------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const sendJson = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS });
  res.end(JSON.stringify(obj));
};
const sendText = (res, status, body, type = 'text/plain') => {
  res.writeHead(status, { 'Content-Type': type, ...CORS });
  res.end(body);
};
const sendFile = (res, file, type) => {
  if (!fs.existsSync(file)) return sendText(res, 404, `${path.basename(file)} not found`);
  res.writeHead(200, { 'Content-Type': type, ...CORS });
  res.end(fs.readFileSync(file));
};
const readBody = (req) => new Promise((resolve) => {
  let data = '', tooBig = false;
  req.on('data', (chunk) => { data += chunk; if (data.length > 10 * 1024 * 1024) { tooBig = true; req.destroy(); } });
  req.on('end', () => {
    if (tooBig) return resolve(null);
    if (!data) return resolve({});
    try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
  });
  req.on('error', () => resolve(null));
});

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  // Static: web component + AI skill
  if (method === 'GET' && pathname === '/pointer.js') {
    return sendFile(res, path.join(__dirname, 'pointer.js'), 'application/javascript; charset=utf-8');
  }
  if (method === 'GET' && pathname === '/skill.md') {
    return sendFile(res, path.join(__dirname, 'skill.md'), 'text/markdown; charset=utf-8');
  }
  if (method === 'GET' && pathname === '/favicon.ico') {
    const fav = path.join(__dirname, 'favicon.ico');
    if (fs.existsSync(fav)) {
      res.writeHead(200, { 'Content-Type': 'image/x-icon', 'Cache-Control': 'public, max-age=604800', ...CORS });
      return res.end(fs.readFileSync(fav));
    }
    return sendText(res, 404, 'Favicon not found');
  }

  // API → shared core
  if (pathname.startsWith('/api/')) {
    const body = (method === 'POST' || method === 'PATCH') ? await readBody(req) : {};
    if (body === null) return sendJson(res, 400, { error: 'Invalid or too-large JSON body' });
    const query = Object.fromEntries(url.searchParams);
    const result = await handleApi({ method, pathname, query, body, store: fsStore });
    if (result.status === 204) { res.writeHead(204, CORS); return res.end(); }
    return sendJson(res, result.status, result.json);
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`\n🐕 Pointer server running at http://localhost:${PORT}  (zero dependencies)`);
  console.log(`🧩 Web component: http://localhost:${PORT}/pointer.js`);
  console.log(`🧠 AI skill:      http://localhost:${PORT}/skill.md`);
  console.log(`💾 Project data:  ${DATA_DIR}/<project>/\n`);
});
