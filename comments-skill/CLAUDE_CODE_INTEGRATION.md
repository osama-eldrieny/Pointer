# Applying Pointer Feedback with an AI Tool

Pointer collects element-level feedback from stakeholders (client / PM / tester / developer) across many projects and environments, then hands it to **any AI coding tool** (Claude Code, Cursor, …) to apply. This guide describes that apply step.

## The flow

```
1. Stakeholders comment via the <pointer-feedback> web component (in any environment)
   ↓
2. The Pointer server stores them, partitioned by project, under data/<project>/
   ↓
3. A stakeholder marks a comment "Ready to Apply" → it lands in that project's pending queue
   ↓
4. The developer, in their repo, pulls only their project's queue:
       npx pointer pull --project <their project>
   → writes a gitignored .pointer/pending.json
   ↓
5. The developer tells their AI tool: "Apply the pending feedback in .pointer/pending.json"
   ↓
6. The AI edits the real source files, then writes results back:
       npx pointer push           (or the AI PATCHes the server API directly)
   → each comment marked "applied" + an AI reply; the server clears the queue
   ↓
7. The dev server's own HMR/live-reload shows the change. (Pointer no longer forces reloads.)
```

## Key principle: `.pointer/pending.json` is self-contained

Each pending item carries everything needed to apply it — no need to cross-reference any other file:

| Field | Use |
|---|---|
| `project`, `environment`, `stakeholder`, `author` | Who/where the feedback came from |
| `source_path` | **The precise source location** (e.g. `src/components/Cart.tsx:42`), captured from the configurable `source-attr` if the app emits it |
| `element_snapshot` | Exact `outerHTML` of the element — fallback for finding source by search |
| `element_selector`, `element_classes`, `parent_element_info` | Element identity + DOM context |
| `applied_css_rules` | **Which CSS rules actually win on the element** (highest specificity) — drives correct CSS edits |
| `original_comment.text` + `replies` | The change request and full discussion thread |
| `apply_comment`, `apply_reply_ids` | Whether to apply the main comment and/or specific replies |

## How the AI should locate the source

**Resolution order:**

1. **`source_path` present →** open that `file:line` directly. In a monorepo this lands in the correct app/package as long as the path is repo-relative. This is the precise, preferred path.
2. **No `source_path` →** locate the source by codebase search, using (in order of signal):
   - `element_snapshot` text content (search the repo for the literal copy/markup),
   - `element_classes` and the selectors in `applied_css_rules` (find the component or stylesheet that defines them),
   - `parent_element_info` to disambiguate between similar elements.

> 💡 To make apply deterministic, have your app emit a source attribute on elements (e.g. `data-component-source="src/.../X.tsx:NN"`) and set `source-attr` on the web component to match. A build-time plugin to auto-emit this everywhere is on the roadmap.

## The CSS sacred rule (unchanged)

**When a comment asks for a style change, edit the CSS rule that is _actually_ styling the element — read `applied_css_rules` to see which rule wins by specificity — and update _that_ rule. Do not invent a new, more-specific element selector.**

Why: a new high-specificity rule can be overridden by, or fight with, the rule that's already applying, so the change silently doesn't take effect. In a framework app that winning rule usually lives in an external `.css`/`.scss`, a CSS module, or a styled-component — find it by search and edit it there.

**Example.** Element `<p class="section-label">` shows two applied rules:
```css
.section-label { margin: 0 0 18px 0; }
.field-box p   { margin: 0; }   /* ← this one wins (more specific) */
```
Comment: "add 6px margin bottom". ✅ Update `.field-box p { margin: 0 0 6px 0; }`. ❌ Don't add `.section-label { margin-bottom: 6px }` (overridden) or a brittle `body > … > p:nth-of-type(3)` rule.

## Writing results back

After editing, record what was applied so the server can mark comments and clear the queue. Two equivalent options:

**A. `pointer push`** — write `.pointer/results.json`, then run it:
```json
[
  { "id": "c_…", "reply": "Applied ✓ — set .btn { background:#16a34a } in src/components/Hero.tsx" }
]
```
`pointer push` appends each `reply` as an `AI` reply, sets the comment `status: "applied"`, and the server removes it from the project's pending queue. (With no `results.json`, `push` marks every currently-pending comment `applied` with a generic note.)

**B. Direct API** — `PATCH {server}/api/comments/:id` with `{ "project": "<p>", "status": "applied", "replies": [...with the AI reply...], "replyId": "<that reply id>" }`. The server syncs the pending queue automatically.

## API reference (project-scoped)

All comment routes require a `project` — in the query string for `GET`/`DELETE`, in the JSON body for `POST`/`PATCH`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/comments?project=P&page_url=…&environment=…` | Comments for a project (optionally filtered) |
| POST | `/api/comments` | Create (body includes `project`, `environment`, `stakeholder`, `source_path`, element context) |
| POST | `/api/comments/:id/reply` | Add a reply |
| PATCH | `/api/comments/:id` | Update status/text; syncs the pending queue |
| DELETE | `/api/comments/:id` | Delete a comment |
| GET | `/api/pending-apply?project=P` | The project's work queue |

## Edge cases

- **Stale selector / element moved:** prefer `source_path`; else match by `element_snapshot`, then by text content. If nothing matches, leave the comment unapplied and note why in the AI reply.
- **Multiple comments on one element:** apply in order.
- **Conflicting requests:** apply the most recent, or ask for clarification in the AI reply.
- **Multiple files / monorepo:** each comment resolves independently via its own `source_path`/search.
