# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pointer is an element-level feedback tool. Stakeholders (client / PM / tester / developer) click any element on a running app and leave a short comment via a **web component**; a small server collects those comments **partitioned by project** and tagged with `{ environment, stakeholder, author }`; a developer later pulls their project's queue and tells **any AI tool** to apply the changes to the real source files. No database, no auth — JSON files on the server + an Express API.

The tool lives in **`src/`** (`server.js`, `core.js`, `cli.js`, `pointer.js`, `skill.md`, `config.json`, and runtime `data/`). The `demo/` folder holds a demo page (`test.html`) and its `assets/`; Netlify deploy files live in `netlify/` + `netlify.toml`; extra docs live in `docs/`. The repo root holds only `README.md`, `CLAUDE.md`, `package.json`, and `netlify.toml`.

## Commands

All from the repo root:

```bash
node src/server.js   # zero dependencies — NO npm install. Runs on port 3001.

# optional developer-side CLI (cli.js, exposed as bin "pointer"; also zero-dep)
npx pointer pull --project <p> [--server URL]   # fetch queue → .pointer/pending.json
npx pointer push [--project <p>]                # write applied results back, clear queue
```

The server and CLI use only Node built-ins (`node:http`, `fs`, global `fetch`) — no dependencies, no install. No tests or linter. `node --check src/<file>.js` for a quick syntax check.

## Architecture

Three parts, communicating only through HTTP and per-project JSON files:

1. **`pointer.js`** — the `<pointer-feedback>` **custom element** (browser). Configured by HTML attributes or a `window.POINTER_CONFIG` object (attributes take precedence, then `window.POINTER_CONFIG`, then defaults): `project` (required), `environment`, `server` (defaults to the script's own origin), `source-attr` (default `data-component-source`), and `enabled` (default `true`; set `false` to render nothing). The component bails before any DOM work when `enabled` is false. Its UI (toolbar, sidebar, pins, comment popover, identity modal) renders inside a **Shadow DOM** so it can't collide with the host app's CSS; only the hover-highlight (`.pointer-feedback-hl`) is injected into the host's light DOM. On first use it asks for name + role (stored in `localStorage` as `pointer_author`/`pointer_role`). On capture it records `element_selector` (via `generateSelector`), `element_snapshot`, `element_classes`, `parent_element_info`, `computed_styles`, `applied_css_rules` (rules that actually match, read from `document.styleSheets`), and `source_path` (walks up to the nearest ancestor carrying the configured `source-attr`). There is **no auto-reload** — dev-server HMR shows applied changes.

2. **`server.js`** — **zero-dependency** `node:http` server (no Express/cors; small helpers provide CORS, JSON-body parsing, and param routing). Owns all file I/O, **partitioned by project** under `src/data/<project>/` (override via `POINTER_DATA`/`data_dir`). `requireProject` validates `project` (alphanumerics/`._-` only — blocks path traversal) from the query string (GET/DELETE) or body (POST/PATCH). Serves `pointer.js` and `skill.md`. Storage helpers (`readComments`/`writeComments`/`readPendingApply`/`writePendingApply`) take a project and lazily create its dir/files.

3. **`cli.js`** (`pointer`) — developer ergonomics over the API: `pull` fetches a project's pending queue into a gitignored `.pointer/pending.json`; `push` reads `.pointer/results.json` (`[{id, reply}]`) and PATCHes each comment to `applied` + an AI reply, clearing the server queue; `serve` runs the server.

### Storage layout

```
src/data/<project>/open.json            # comments with status "open"
src/data/<project>/pending-apply.json   # comments with status "pending-apply"
src/data/<project>/applied.json         # comments with status "applied"
src/data/<project>/pending.json         # work queue; server keeps it in sync inside PATCH /api/comments/:id
```

History is partitioned **one JSON file per status**; every comment is tagged `{project, environment, stakeholder, author}`. The store splits the array by `status` on write (one file per status, empty files included so moved comments are cleared) and merges them — ordered by `created_at` — on read. A legacy single-file `comments.json` (or, on Netlify Blobs, a `<project>/comments` key) is merged in on read and migrated into the per-status files on the next write, then deleted. `core.js` is untouched: it still sees one `getComments`/`setComments` array; the split lives entirely in each `store`.

`pending.json` entries are **self-contained** (selectors, snapshot, `applied_css_rules`, `source_path`, full `replies`, `apply_comment`/`apply_reply_ids`) so the AI never needs another file to apply them.

### The apply workflow (core reason an AI is involved)

Documented in `docs/CLAUDE_CODE_INTEGRATION.md`. In short: `pointer pull` → read `.pointer/pending.json` → for each item resolve source by **(1) `source_path` if present (open that `file:line`), else (2) codebase search** using `element_snapshot` text, `element_classes`, and `applied_css_rules` selectors → edit → `pointer push`.

**Sacred CSS rule:** for style changes, edit the rule that *actually wins* on the element (read `applied_css_rules`, which is ordered by what matches) — never invent a new, more-specific selector, since the existing winning rule may override it. That rule often lives in an external `.css`/`.scss`/CSS-module/styled-component the AI must find by search.

## Hosting (two documented modes, one binary)

- **Local + tunnel:** run the server locally, expose via cloudflared/ngrok, point the component's `server` attribute at the tunnel. Files are on the dev's machine (AI can read `src/data/<project>/` directly).
- **Deploy once:** host on Render/Fly/VPS for a stable URL remote stakeholders reach; devs `pointer pull`.

## Gotchas

- **Single-process, file-based writes, no locking.** Every API call does a full read-modify-write of a project's JSON. Assume one applier per project at a time.
- **`server.js` calls a hardcoded Google Apps Script URL** (`GOOGLE_SCRIPT_URL`) on each comment/reply to bump a global usage counter — fire-and-forget, failures swallowed, but it is an external network call.
- **Comments persist after applying** (status `applied` + AI reply) — the history is intentional.
- The web component reads cross-origin stylesheets best-effort (CORS may block `cssRules`); same-origin/dev-server CSS is fully captured.

## Out of scope (roadmap)

Build-time plugin to auto-emit the source attribute everywhere; stakeholder auth/access control; real-time multi-user sync; CSS-in-JS/CSS-Modules/Tailwind-aware editing; a project/environment dashboard.
