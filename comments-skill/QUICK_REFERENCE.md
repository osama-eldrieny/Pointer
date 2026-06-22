# Quick Reference Card

## Run the server (zero dependencies)
```bash
node server.js            # no npm install → http://localhost:3001
```

## Enable in an app (no package, env-gated)
Inline guard in `index.html`:
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
`.env` (omit/false in production to disable):
```
VITE_POINTER_ENABLED=true
VITE_POINTER_SERVER=http://localhost:3001
VITE_POINTER_PROJECT=my-app
```

## Give feedback
1. Open the app → enter **name + role** once (Client / PM / Tester / Developer)
2. **➕ Comment** → click an element → type feedback
3. **💬** opens the sidebar; **Ready to Apply** queues a comment for the AI

## Apply (any AI tool, just curl)
```bash
# install the skill once
curl -s http://localhost:3001/skill.md -o .claude/skills/pointer-feedback/SKILL.md
# then: "what are the pointer comments?"  /  "apply pending pointer comments"
```

## API (project-scoped)
`project` is required — in the query for GET/DELETE, in the body for POST/PATCH.

| Method | Endpoint |
|---|---|
| GET | `/api/comments?project=P&page_url=…` |
| POST | `/api/comments` |
| POST | `/api/comments/:id/reply` |
| PATCH | `/api/comments/:id` |
| DELETE | `/api/comments/:id` |
| GET | `/api/pending-apply?project=P` |

## Storage (on the server)
```
data/<project>/comments.json   # history
data/<project>/pending.json     # work queue
```
Override location with `POINTER_DATA` env or `data_dir` in `config.json`.

See **README.md** and **CLAUDE_CODE_INTEGRATION.md** for full details.
