---
name: pointer-feedback
description: Use when the user asks about Pointer feedback or comments on an app — e.g. "what are the pointer comments", "show pointer feedback", "any feedback on <app>", "apply pending pointer comments". Reads config from the app's .env (VITE_POINTER_*), fetches the feedback JSON from the Pointer server with curl, then lists or applies the comments. No Pointer install required.
---

# Pointer Feedback

**Pointer** collects element-level feedback on a running app. A stakeholder (client / PM / tester / developer) clicks an element and leaves a comment; comments are stored on a **Pointer server** (not in this repo). This skill fetches and works with that feedback using only `curl` — nothing needs to be installed locally.

Two things the user typically asks for:
- **"What are the Pointer comments?"** → list the feedback (this skill's default).
- **"Apply the pending Pointer comments"** → edit the source for each queued item (section 4).

---

## Step 1 — Resolve config from the app's `.env`

Pointer is wired into an app via an **env-gated inline snippet** in `index.html`. The config lives in that app's `.env` (Vite vars), which is the source of truth. **Do not hardcode anything** — read it.

1. **Find the app.** It's the one whose `.env` defines `VITE_POINTER_*` (a monorepo may have several; pick the one the user means, else ask):
   ```bash
   grep -rl "VITE_POINTER_SERVER" apps/*/.env 2>/dev/null || grep -rl "pointer-feedback" apps/*/index.html
   ```
   Let `APP_DIR` be that app's directory (e.g. `apps/tuwaiq-clubs`).

2. **Read the values** from `$APP_DIR/.env`:
   ```bash
   envval(){ grep -E "^$1=" "$APP_DIR/.env" | head -1 | cut -d= -f2- | tr -d "'\""; }
   SERVER=$(envval VITE_POINTER_SERVER)
   PROJECT=$(envval VITE_POINTER_PROJECT)
   ENABLED=$(envval VITE_POINTER_ENABLED)
   SRC_ATTR=data-component-source   # the attribute the app emits for source paths
   ```
   - If `PROJECT` is empty, fall back to the `project` set in the inline snippet (`grep -oE 'setAttribute\("project", *"[^"]+"' "$APP_DIR/index.html"`) or the app directory name.
   - If `SERVER` is empty, ask the user for the Pointer server URL.

You now have `SERVER`, `PROJECT`, and `SRC_ATTR`.

---

## Step 2 — Build the data-fetch curl

- **All comments** for the project (use this for "what are the comments?"):
  ```bash
  curl -s "$SERVER/api/comments?project=$PROJECT"
  ```
- **Only the items queued to apply**:
  ```bash
  curl -s "$SERVER/api/pending-apply?project=$PROJECT"
  ```
- Optional filters on the comments endpoint: `&page_url=<url>` and `&environment=<env>`.

If the request fails, the server is likely not running or `SERVER` is wrong — tell the user the resolved `SERVER`/`PROJECT` so they can check.

---

## Step 3 — Show the comments

Parse the JSON and present a compact, readable list. For each comment show: number, the text, who left it (`author` + `stakeholder`), the `environment`, the `status` (`open` / `pending-apply` / `applied`), and `source_path` (the file:line of the element). Include replies if any.

Example shape of one comment:
```json
{ "id": "c_…", "text": "make it primary", "author": "Moamen", "stakeholder": "Developer",
  "environment": "local", "status": "pending-apply",
  "source_path": "tuwaiq-clubs/src/app/components/landing/TopClubsSection.tsx:42",
  "element_classes": ["border","border-primary-500","text-primary-500", "…"],
  "applied_css_rules": [ … ], "replies": [ … ] }
```

---

## Step 4 — Apply (only when the user asks to apply)

For each pending item (from the `pending-apply` endpoint):

1. **Locate the source.**
   - If `source_path` is present, open it. Try it relative to the repo root first; if not found and the repo has an `apps/` dir (Nx/monorepo), try `apps/<source_path>` — many setups emit paths relative to `/apps/`.
   - If `source_path` is absent, find the source by searching for the `element_snapshot` text or the `element_classes`.
2. **Make the change** the comment asks for.
   - **Tailwind apps:** the visible styling is in the element's `className`. Use `element_classes` / `element_snapshot` to find the element in the source and edit the classes (e.g. "make it primary" → swap the outline classes `border border-primary-500 text-primary-500` for the filled variant `bg-primary-500 text-white`). `applied_css_rules` is usually just `*` and not useful for Tailwind.
   - **Plain CSS/SCSS apps:** edit the rule that *actually wins* (read `applied_css_rules`) — never invent a new, more-specific selector that could be overridden.
3. **Write the result back** so the comment is marked applied and the server clears it from the queue:
   ```bash
   curl -s -X PATCH "$SERVER/api/comments/<id>" \
     -H 'Content-Type: application/json' \
     -d '{"project":"'"$PROJECT"'","status":"applied",
          "replyId":"r_ai_1",
          "replies":[{"id":"r_ai_1","author":"AI","text":"Applied ✓ — <what changed and where>"}]}'
   ```
   (Preserve any existing replies: fetch the comment first, append your reply, and send the full `replies` array with `replyId` set to your new reply's id.)
4. The app's dev server (Vite HMR) reflects the change live — no manual reload.

---

## Notes

- This skill needs no Pointer clone or CLI — only `curl`. The Pointer **server** is the only Pointer instance.
- Config lives at the source of truth (the app's `.env` `VITE_POINTER_*`), so this stays correct if it changes.
- This file was installed by fetching `<server>/skill.md` into `.claude/skills/pointer-feedback/SKILL.md` and is yours to edit — tweak the formatting, defaults, or apply rules to fit this repo.
