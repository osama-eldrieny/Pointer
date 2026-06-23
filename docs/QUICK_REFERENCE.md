# Quick Reference Card

## Run the server (zero dependencies)
```bash
node server.js            # no npm install → http://localhost:3001
```

## Enable in an app (no package, no build)
Scripts go in `<head>`, the element in `<body>` — works on static sites and `file://`:
```html
<head>
  <script>
    window.POINTER_CONFIG = {
      project:     "my-app",  // ← change me
      environment: "prod",
      enabled:     true,      // set false to keep the snippet but show nothing
      // server defaults to the pointer.js script origin below — set the URL once there.
    };
  </script>
  <script src="https://YOUR_POINTER_SERVER/pointer.js" defer></script>
</head>
<body>
  <!-- … your page … -->
  <pointer-feedback></pointer-feedback>
</body>
```

## Give feedback
1. Open the app → enter **name + role** once (Client / PM / Tester / Developer)
2. **➕ Comment** → click an element → type feedback
3. **💬** opens the sidebar; **Ready to Apply** queues a comment for the AI

## Apply (any AI tool, just curl)
```bash
# install the skill once — same server URL as window.POINTER_CONFIG.server (e.g. http://localhost:3001)
curl -s https://YOUR_POINTER_SERVER/skill.md -o .claude/skills/pointer-feedback/SKILL.md
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
