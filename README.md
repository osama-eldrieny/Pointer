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
📦 **Zero dependencies** — the server is one Node file (`node:http` only); run it with `node src/server.js`, no `npm install`
🗂️ **Multi-project** — one server serves many apps (great for monorepos and separate repos)
👥 **Multi-stakeholder / multi-environment** — every comment is tagged `{ project, environment, stakeholder, author }`
🎯 **Element + source aware** — captures selector, snapshot, the CSS rules that actually apply, and an optional source path
🤖 **AI-agnostic** — the AI fetches/applies feedback with plain `curl` (Claude Code, Cursor, …); no client install
💾 **No database** — plain JSON files on the server, partitioned per project
🛡️ **Style-isolated UI** — the overlay renders in a Shadow DOM, so it never clashes with your app's CSS

## Quick start

### 1. Run the server (zero dependencies)

```bash
node src/server.js      # from the repo root — no npm install needed
```

You'll see:
```
🐕 Pointer server running at http://localhost:3001  (zero dependencies)
🧩 Web component: http://localhost:3001/pointer.js
🧠 AI skill:      http://localhost:3001/skill.md
💾 Project data:  .../data/<project>/
```

To **deploy once** for a team, copy the `src/` folder to any host and run `node src/server.js` — no build, no install.

### 2. Enable it in your app (no package, no build)

Pointer is configured by a small **`window.POINTER_CONFIG`** object — works on any page, including a
plain static site or a file opened as `file://`, with no build step. Add the two `<script>` tags in
the **`<head>`** and the `<pointer-feedback>` element in the **`<body>`**. The only URL you set is the
`pointer.js` script `src` (the `server` is derived from it):

```html
<head>
  <!-- … your existing head … -->

  <!-- Pointer feedback — config + component script (set the server URL once, in the src below) -->
  <script>
    window.POINTER_CONFIG = {
      project:     "my-site",  // ← a name for this app's feedback
      environment: "prod",     // optional: local / staging / prod / ...
      enabled:     true,       // optional: set false to keep the snippet but show nothing (e.g. in production)
      // server is optional — it defaults to the origin of the pointer.js script below.
      // Only set it here if you load pointer.js from a different origin than your Pointer server.
    };
  </script>
  <script src="https://YOUR_POINTER_SERVER/pointer.js" defer></script>
</head>

<body>
  <!-- … your page … -->

  <!-- the feedback overlay element -->
  <pointer-feedback></pointer-feedback>
</body>
```

That's the whole setup — copy-paste, no build.

<details>
<summary><b>Optional:</b> drive the values from <code>.env</code> instead (apps with a build step)</summary>

If you'd rather not hardcode the values, interpolate them into the snippet using whatever your build
tool exposes, falling back to the literal when no build runs:

```js
// `ENV` here is whatever your tool injects (e.g. process.env / import.meta.env)
project: ENV.POINTER_PROJECT || "my-site",
```

```bash
# .env — generic names; also read directly by the AI skill if present
POINTER_SERVER=http://localhost:3001
POINTER_PROJECT=checkout-app
POINTER_ENVIRONMENT=local
```
</details>

> **Tip:** include the snippet only where you want feedback — omit it in true public production to load nothing, or keep it and set `enabled: false` to leave it inert.

### 3. Give feedback

Open your app, enter your **name + role** once (Client / PM / Tester / Developer), click **➕ Comment**, click an element, and type your feedback. Pins and a sidebar show all comments. Mark a comment **Ready to Apply** when you want it actioned.

### 4. Apply with any AI tool (just curl — no install)

Install the AI skill once (committed to your repo). Use the **same server URL** you set in
`window.POINTER_CONFIG.server` / the `pointer.js` script `src` (e.g. `http://localhost:3001` locally,
or your deployed URL):

```bash
mkdir -p .claude/skills/pointer-feedback
curl -s https://YOUR_POINTER_SERVER/skill.md -o .claude/skills/pointer-feedback/SKILL.md
```

Then tell your AI tool **"what are the pointer comments?"** or **"apply pending pointer comments"**. The skill resolves `server`/`project` from the app's `.env` (`POINTER_*`) or the page's `window.POINTER_CONFIG`, `curl`s the server, applies each item via its `source_path`, and `PATCH`es the comment to `applied`. Your dev server's HMR shows the change live. See **[CLAUDE_CODE_INTEGRATION.md](docs/CLAUDE_CODE_INTEGRATION.md)** for source resolution + CSS rules.

## Where the server runs

One standalone, zero-dependency Node server — run it however suits you:

- **Local (solo):** `node src/server.js` on your machine; set the snippet's `server` to `http://localhost:3001`. Expose it with a tunnel (e.g. `cloudflared`) if remote stakeholders need it.
- **Deploy once (team):** deploy to Netlify (this repo) or copy the Node files to Render/Fly/a VPS; set the snippet's `server` to the stable URL. This is the zero-local-setup path for static / `file://` pages.

## Deploy to Netlify (free)

You don't need your own server — host Pointer on **Netlify's free tier** and get a permanent URL that stakeholders (and `file://` demos) can reach. This repo is already configured (`netlify.toml` + `netlify/functions/api.mjs`), so a brand-new Netlify user can ship it in a couple of minutes:

1. **Push this repo to GitHub** (or GitLab / Bitbucket).
2. **Create a free Netlify account** at [netlify.com](https://www.netlify.com) — sign up with your Git provider. No credit card required.
3. In the dashboard, click **Add new site → Import an existing project**, authorize your Git provider, and pick this repository.
4. **Leave the build settings as detected** — Netlify reads `netlify.toml` automatically (build command, publish dir `netlify/public`, and the `/api/*` function). There are **no environment variables to set**; comment storage uses **Netlify Blobs**, which is enabled automatically.
5. Click **Deploy**. When it finishes you'll get a URL like `https://your-site-name.netlify.app`.

That URL **is** your Pointer server. Wire your app to it by setting the `pointer.js` script `src` to `https://your-site-name.netlify.app/pointer.js` (the `server` is derived from it), and install the AI skill from `https://your-site-name.netlify.app/skill.md`.

**Free-tier notes:** Netlify's free plan covers generous bandwidth, serverless function invocations, and Blobs storage — comfortably enough for a feedback tool. There's no always-on server to pay for: the API runs as an on-demand function, and static files (`/pointer.js`, `/skill.md`) are served from the CDN.

## Storage

Comments live on the **server**, never in app repos:

```
src/data/<project>/comments.json   # full history (append-only)
src/data/<project>/pending.json     # work queue (auto-managed)
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
