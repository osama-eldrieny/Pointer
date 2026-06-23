# 🐕 Pointer — `comments-skill/`

This directory is the Pointer application: a **zero-dependency** Node server, the `<pointer-feedback>` web component, the AI skill, and an optional CLI.

> 📖 **Start with the [root README](../README.md)** for the full overview and quick start. This file is a directory-level reference.

## Files

| File | Purpose |
|---|---|
| `server.js` | Zero-dependency Node server (`node:http` only); per-project JSON storage under `data/<project>/`; serves `pointer.js` + `skill.md` |
| `pointer.js` | The `<pointer-feedback>` web component (Shadow-DOM overlay), served to apps |
| `skill.md` | The AI skill (served at `/skill.md`); a repo installs it into `.claude/skills/` |
| `cli.js` | Optional `pointer` CLI (`serve` / `pull` / `push`) — also zero-dependency |
| `config.json` | Server config: `server_port`, `data_dir` |
| `CLAUDE_CODE_INTEGRATION.md` | How an AI tool applies pending feedback |
| `QUICK_REFERENCE.md` | One-page cheat sheet |

## Run (no install)

```bash
node server.js          # zero dependencies — no npm install
```

Deploy once: copy `server.js` + `pointer.js` + `skill.md` + `config.json` to any host and run `node server.js`.

## Enable in an app (no package, env-gated)

Add an inline guard to the app's `index.html` and set the env vars per environment:

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

```bash
# .env (omit / set false in production to disable)
VITE_POINTER_ENABLED=true
VITE_POINTER_SERVER=http://localhost:3001
VITE_POINTER_PROJECT=my-app
```

`VITE_POINTER_ENABLED` toggles the overlay; it is independent of `VITE_DEBUG` (which controls `data-component-source` tagging).

## Apply feedback (any AI tool, just curl)

Install the skill once: `curl -s $SERVER/skill.md -o .claude/skills/pointer-feedback/SKILL.md`. Then ask your AI "what are the pointer comments?" / "apply pending pointer comments". It reads `VITE_POINTER_*` from the app's `.env`, curls the server, applies via `source_path`, and PATCHes the comment to `applied`. (The optional `cli.js` `pull`/`push` do the same over HTTP.)

## Storage

```
data/<project>/comments.json   # append-only history, tagged {project, environment, stakeholder, author}
data/<project>/pending.json     # work queue, kept in sync by the server
```

See **[CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)** for the apply workflow (source resolution + the CSS "sacred rule").
