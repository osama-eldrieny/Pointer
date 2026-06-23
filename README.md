# 🐕 Pointer

Quick, targeted feedback directly on web elements. No lengthy descriptions—just **click, comment, and hand it to any AI to apply**.

> **Pointer** — Your team's fastest way to give element-level feedback on any app, across every environment, and turn it into code.

## What it does

Stakeholders (client, PM, tester, developer) click any element on a running app and leave a short comment. Comments are collected by a small server, **partitioned by project and tagged by environment and stakeholder**. A developer then pulls their project's queue and tells any AI coding tool to apply the changes to the real source files.

```
Instead of:  "Go to the checkout page, find the header, make the title 24px"
With Pointer:  🐕 click the title → 💬 "Make this 24px" → ✨ AI applies it
```

## Features

✨ **Two-line install, no package** — apps just point a `<script>` + tag at a deployed server
📦 **Zero dependencies** — the server is one Node file (`node:http` only); run it with `node server.js`, no `npm install`
🗂️ **Multi-project** — one server serves many apps (great for monorepos and separate repos)
👥 **Multi-stakeholder / multi-environment** — every comment is tagged `{ project, environment, stakeholder, author }`
🎯 **Element + source aware** — captures selector, snapshot, the CSS rules that actually apply, and an optional source path
🤖 **AI-agnostic** — the AI fetches/applies feedback with plain `curl` (Claude Code, Cursor, …); no client install
💾 **No database** — plain JSON files on the server, partitioned per project
🛡️ **Style-isolated UI** — the overlay renders in a Shadow DOM, so it never clashes with your app's CSS

## Quick start

### 1. Run the server (zero dependencies)

```bash
cd comments-skill
node server.js          # no npm install needed
```

You'll see:
```
🐕 Pointer server running at http://localhost:3001  (zero dependencies)
🧩 Web component: http://localhost:3001/pointer.js
🧠 AI skill:      http://localhost:3001/skill.md
💾 Project data:  .../data/<project>/
```

To **deploy once** for a team, copy `server.js` + `pointer.js` + `skill.md` + `config.json` to any host and run `node server.js` — no build, no install.

### 2. Enable it in your app (no package, env-gated)

Pointer is a **review tool** — load it only in the environments where you want it, via a dedicated `VITE_POINTER_ENABLED` flag. Add an **inline guard** to your `index.html` (so a disabled env loads nothing):

```html
<script>
  if ("%VITE_POINTER_ENABLED%" === "true" && "%VITE_POINTER_SERVER%".indexOf("http") === 0) {
    var s = document.createElement("script");
    s.src = "%VITE_POINTER_SERVER%/pointer.js"; s.defer = true;
    document.head.appendChild(s);
    var el = document.createElement("pointer-feedback");
    el.setAttribute("project", "%VITE_POINTER_PROJECT%");
    el.setAttribute("server", "%VITE_POINTER_SERVER%");
    el.setAttribute("source-attr", "data-component-source");
    document.body.appendChild(el);
  }
</script>
```

Set the vars per environment (`.env`, `.env.staging`; omit in production to disable):

```bash
VITE_POINTER_ENABLED=true
VITE_POINTER_SERVER=http://localhost:3001
VITE_POINTER_PROJECT=checkout-app
```

> **Two independent switches:** `VITE_POINTER_ENABLED` controls the overlay; `VITE_DEBUG` (your app's own flag, if any) controls whether elements emit `data-component-source` for precise source paths. Turn both off in true public production.

> **Tip — precise applies:** if your app stamps elements with a source path (e.g. `data-component-source="src/components/Hero.tsx:14"`), Pointer captures it so the AI edits the exact file. Without it, the AI finds the source by searching your codebase using the captured element context.

### 3. Give feedback

Open your app, enter your **name + role** once (Client / PM / Tester / Developer), click **➕ Comment**, click an element, and type your feedback. Pins and a sidebar show all comments. Mark a comment **Ready to Apply** when you want it actioned.

### 4. Apply with any AI tool (just curl — no install)

Install the AI skill once (committed to your repo):

```bash
mkdir -p .claude/skills/pointer-feedback
curl -s http://localhost:3001/skill.md -o .claude/skills/pointer-feedback/SKILL.md
```

Then tell your AI tool **"what are the pointer comments?"** or **"apply pending pointer comments"**. The skill reads `VITE_POINTER_SERVER`/`VITE_POINTER_PROJECT` from the app's `.env`, `curl`s the server, applies each item via its `source_path`, and `PATCH`es the comment to `applied`. Your dev server's HMR shows the change live. See **[CLAUDE_CODE_INTEGRATION.md](comments-skill/CLAUDE_CODE_INTEGRATION.md)** for source resolution + CSS rules.

## Where the server runs

One standalone, zero-dependency Node server — run it however suits you:

- **Local (solo):** `node server.js` on your machine; point the app's `VITE_POINTER_SERVER` at `http://localhost:3001`. Expose it with a tunnel (e.g. `cloudflared`) if remote stakeholders need it.
- **Deploy once (team):** copy the few Node files to Render/Fly/a VPS and run `node server.js`; apps point `VITE_POINTER_SERVER` at the stable URL.

## Storage

Comments live on the **server**, never in app repos:

```
comments-skill/data/<project>/comments.json   # full history (append-only)
comments-skill/data/<project>/pending.json     # work queue (auto-managed)
```

Both are plain JSON, created lazily on first write. Override the location with `POINTER_DATA` (env) or `data_dir` in `config.json`.

## Limitations

- File-based, single-process writes (no locking) — coordinate concurrent applies
- No built-in auth / access control (roadmap)
- No real-time multi-user sync

## Creator

**Osama Eldrieny** — [Website](https://www.osamaeldrieny.com/) · [LinkedIn](https://www.linkedin.com/in/osamaeldrieny/)

## License

MIT
