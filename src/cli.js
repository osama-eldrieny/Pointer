#!/usr/bin/env node
/**
 * pointer — developer-side CLI for the Pointer feedback tool.
 *
 *   pointer serve                              Start the Pointer server (local / deploy-once)
 *   pointer pull --project <p> [--server URL]  Fetch a project's pending queue → .pointer/pending.json
 *   pointer push [--project <p>] [--server URL] Write applied results back to the server, clearing the queue
 *
 * `pull` is the one command a developer runs in their repo before asking an AI
 * tool to apply feedback. It writes a gitignored `.pointer/pending.json` that the
 * AI reads. After applying, `push` (or the AI doing PATCHes itself) marks each
 * comment `applied` and the server drops it from the project's queue.
 *
 * Defaults can also come from a local `.pointer/config.json`:
 *   { "project": "checkout-app", "server": "https://pointer.example.com" }
 */
const fs = require('fs');
const path = require('path');

const POINTER_DIR = path.resolve(process.cwd(), '.pointer');
const LOCAL_CONFIG = path.join(POINTER_DIR, 'config.json');
const PENDING_FILE = path.join(POINTER_DIR, 'pending.json');
const RESULTS_FILE = path.join(POINTER_DIR, 'results.json');

const parseArgs = (argv) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; }
      else args[key] = true;
    } else args._.push(a);
  }
  return args;
};

const readLocalConfig = () => {
  try { return JSON.parse(fs.readFileSync(LOCAL_CONFIG, 'utf8')); } catch (e) { return {}; }
};

const resolve = (args) => {
  const cfg = readLocalConfig();
  const project = args.project || cfg.project || process.env.POINTER_PROJECT;
  const server = (args.server || cfg.server || process.env.POINTER_SERVER || 'http://localhost:3001').replace(/\/$/, '');
  return { project, server };
};

const ensureDir = () => { if (!fs.existsSync(POINTER_DIR)) fs.mkdirSync(POINTER_DIR, { recursive: true }); };

const die = (msg) => { console.error('✗ ' + msg); process.exit(1); };

async function pull(args) {
  const { project, server } = resolve(args);
  if (!project) die('No project. Pass --project <name> or add it to .pointer/config.json');
  const url = `${server}/api/pending-apply?project=${encodeURIComponent(project)}`;
  let queue;
  try {
    const r = await fetch(url);
    if (!r.ok) die(`Server responded ${r.status} for ${url}`);
    queue = await r.json();
  } catch (e) { die(`Could not reach ${server} (${e.message})`); }

  ensureDir();
  fs.writeFileSync(PENDING_FILE, JSON.stringify(queue, null, 2));
  // Persist resolved defaults so subsequent push/pull need no flags.
  fs.writeFileSync(LOCAL_CONFIG, JSON.stringify({ project, server }, null, 2));
  console.log(`✓ Pulled ${queue.length} pending item(s) for "${project}" → ${path.relative(process.cwd(), PENDING_FILE)}`);
  if (queue.length) {
    console.log('\nHand this to your AI tool, e.g.:');
    console.log('  "Apply the pending feedback in .pointer/pending.json"');
  }
}

async function push(args) {
  const { project, server } = resolve(args);
  if (!project) die('No project. Pass --project <name> or add it to .pointer/config.json');

  // results.json (written by the AI) lists what was applied:
  //   [{ id, reply: "Applied ✓ — …", replyId? }]  replyId optional (applies a reply instead of the comment)
  let results = [];
  if (fs.existsSync(RESULTS_FILE)) {
    try { results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')); } catch (e) { die('Invalid .pointer/results.json'); }
  } else if (fs.existsSync(PENDING_FILE)) {
    // Fallback: mark everything currently pending as applied with a generic note.
    try { results = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')).map(p => ({ id: p.id, reply: 'Applied ✓' })); }
    catch (e) { die('Invalid .pointer/pending.json'); }
  } else {
    die('Nothing to push. Run `pointer pull` first, or write .pointer/results.json');
  }

  let ok = 0;
  for (const res of results) {
    const body = { project, status: 'applied' };
    // Append the AI reply by fetching current replies then PATCHing the merged set.
    try {
      const cur = await fetch(`${server}/api/comments?project=${encodeURIComponent(project)}`).then(r => r.json());
      const comment = cur.find(c => c.id === res.id);
      const replies = (comment && comment.replies) ? comment.replies.slice() : [];
      if (res.reply) replies.push({ id: 'r_' + Date.now() + '_ai', author: 'AI', text: res.reply, created_at: new Date().toISOString() });
      const r = await fetch(`${server}/api/comments/${res.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, replies, replyId: replies.length ? replies[replies.length - 1].id : undefined })
      });
      if (r.ok) ok++;
    } catch (e) { /* continue */ }
  }
  // Clear local queue artifacts.
  if (fs.existsSync(PENDING_FILE)) fs.unlinkSync(PENDING_FILE);
  if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);
  console.log(`✓ Pushed ${ok}/${results.length} applied result(s) for "${project}". Server queue cleared.`);
}

function serve() {
  require('./server.js');
}

const HELP = `pointer — element-level feedback, applied by any AI tool

Usage:
  pointer serve                                Start the Pointer server
  pointer pull  --project <p> [--server URL]   Fetch pending queue → .pointer/pending.json
  pointer push  [--project <p>] [--server URL] Write applied results back, clear the queue

Config (optional): .pointer/config.json { "project": "...", "server": "..." }
Env: POINTER_PROJECT, POINTER_SERVER`;

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  switch (cmd) {
    case 'serve': return serve();
    case 'pull': return pull(args);
    case 'push': return push(args);
    case 'help': case undefined: console.log(HELP); return;
    default: die(`Unknown command "${cmd}".\n\n${HELP}`);
  }
})();
