# 🐕 Pointer

A collaborative commenting overlay for HTML pages that integrates with Claude Code. Team members can annotate elements on any localhost HTML page, then use Claude Code to automatically apply all pending changes at once.

**Created by [Osama Eldrieny](https://www.osamaeldrieny.com/)** | [LinkedIn](https://www.linkedin.com/in/osamaeldrieny/)

## Quick Start

### 1. Install Dependencies
```bash
cd comments-skill
npm install
```

### 2. Start the Server
```bash
npm start
```

The server will start on `http://localhost:3001` and output:
```
🎯 HTML Comments server running at http://localhost:3001
📌 Bookmarklet page: http://localhost:3001/bookmarklet
💾 Comments stored in: ./comments.json
```

### 3. Get the Bookmarklet

Open http://localhost:3001/bookmarklet in your browser and drag the **"HTML Comments"** link to your bookmarks bar.

Alternatively, copy the bookmarklet from `bookmarklet.txt`:
```
javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3001/inject.js?t='+Date.now();document.head.appendChild(s);})()
```

### 4. Use the Tool

1. Open any HTML page in your browser (e.g., `http://localhost:8080/index.html`)
2. Click the **"HTML Comments"** bookmarklet
3. A toolbar appears in the top-right corner
4. Click **"+ Comment"** and click any element to add a comment
5. Each comment gets a numbered pin on the element
6. View all comments in the sidebar — you can reply, delete, or mark for AI apply
7. You can also mark individual replies for AI apply after discussing changes

### 5. Apply Comments with Claude Code

When you're ready to apply comments:

1. In Claude Code, tell it: **"apply pending comments"**
2. Claude will:
   - Read `comments-skill/pending-apply.json` (contains only comments marked for apply)
   - Apply each comment to the corresponding HTML file on disk
   - Add an AI reply showing what was changed
   - Update comment status to "Applied" ✓

3. Refresh your browser and click the bookmarklet again — you'll see the applied changes

## How It Works

### Comment Storage

**comments.json** stores all comments with full history:
- Contains all comments regardless of status
- Each comment includes element selector, snapshot, pin position, replies
- Used by the UI to display comments in the sidebar

**pending-apply.json** stores only comments ready for AI processing:
- Auto-created when you click "Mark Apply" on a comment
- Contains a copy of the comment with `status: 'pending-apply'`
- Claude Code reads this file to know exactly what changes to apply
- Automatically cleaned up when comments are applied or deleted
- This clean separation means Claude doesn't need to filter — it just reads the queue

### Reply-Level Apply

When a comment has replies, you can mark individual user replies for application:

- **Mark Replies**: Click "Mark Apply" on any user reply (not on AI replies)
- **Status Tracking**: Each reply has its own status: `open`, `pending-apply`, or `applied`
- **Conversation History**: When applying a marked reply, Claude sees the full comment conversation for context
- **Iterative Feedback**: Mark an initial comment for apply → Claude applies it → User replies with refinements → Mark the refinement for apply → Claude applies the revision

**Example workflow:**
```
1. Comment: "Change gap to 20px" → Mark Apply
2. Claude applies: "Applied ✓ — Changed space-y-3 to space-y-5"
3. User replies: "Actually, 20px is too much"
4. Mark this reply for apply
5. Claude applies refinement: "Applied ✓ — Changed to space-y-4 (15px)"
```

### Integration with Claude Code

The workflow is clean and efficient:

1. **Mark for apply**: Click `[Mark Apply]` on a comment or reply → automatically moved to `pending-apply.json`
2. **Tell Claude**: In Claude Code chat, say "apply pending comments"
3. **Claude reads**: `comments-skill/pending-apply.json` with full element context including:
   - Element path, classes, parent info
   - `applied_css_rules` - **which CSS rules are ACTUALLY styling this element**
   - Current computed styles
4. **Claude processes**: For each comment:
   - **Extracts element context**: selector, classes, parent, `applied_css_rules`
   - **Extracts change request**: reads comment `text` to understand what to change
   - **Analyzes which rule applies**: looks at `applied_css_rules` array to find ACTUAL rule styling the element
   - **Example**: Element `<p class="section-label">` in `<div class="field-box">` 
     - May have class `.section-label`
     - But is ACTUALLY styled by `.field-box p { margin: 0; }` rule (higher specificity)
     - `applied_css_rules` shows: `.field-box p` is what's active
   - **Updates that specific rule**: Changes `.field-box p { margin: 0; }` to `.field-box p { margin: 0 0 6px 0; }`
   - **If `apply_to: "element-only"`** → Rule targets element in its context only
   - **If `apply_to: "all-similar"`** → Rule is global, affects all with that class
5. **Claude updates**: 
   - Modifies the HTML file on disk (finds and updates the actual CSS rule)
   - Adds AI reply showing which rule was updated and the result
   - Removes the comment from `pending-apply.json`
   - Sets comment status to `applied`
6. **Verify**: Refresh browser, click bookmarklet — see the applied changes with AI explanations

**🔒 Critical Rule:** Find and update the CSS rule that's ACTUALLY styling the element:
- The skill captures which rules apply via `applied_css_rules`
- Claude finds the most relevant/specific rule affecting the element
- Claude updates THAT rule, not creating new ones
- Changes apply immediately because the rule is already active
- Parent context (like `.field-box p`) naturally limits scope to similar elements

## Configuration

Edit `config.json` to customize:

```json
{
  "project_root": "../",           // Path to your project (relative to comments-skill/)
  "server_port": 3001,              // Port for the comments server
  "url_base": "http://localhost:8080", // Base URL of your localhost
  "comments_file": "./comments.json" // Where to store comments
}
```

**URL Mapping**: The skill maps page URLs to file paths:
- `http://localhost:8080/index.html` → `../index.html` (relative to comments-skill/)
- `http://localhost:8080/pages/about.html` → `../pages/about.html`

Adjust `project_root` if your HTML files are in a different location.

## File Structure

```
comments-skill/
├── server.js          # Express server (handles CRUD, serves inject.js)
├── inject.js          # Client overlay (vanilla JS, no build needed)
├── comments.json      # All comments (auto-created on first comment)
├── pending-apply.json # Queue of comments ready for AI to process (auto-created when marked apply)
├── config.json        # Configuration
├── package.json       # Dependencies
├── bookmarklet.txt    # Bookmarklet one-liner
└── README.md          # This file
```

**Why two files?**
- `comments.json`: Complete history for the UI to display in sidebar (includes all replies with status)
- `pending-apply.json`: Work queue for Claude Code — it's the single source of truth for what needs to be processed

**pending-apply.json Structure (Self-Contained):**

`pending-apply.json` is the **single source of truth** for applying changes. It contains all information needed — no need to reference `comments.json`:

```json
{
  "id": "c_1234_abc",
  "apply_type": "reply",
  "apply_reply_id": "r_1",
  "original_comment": {
    "text": "Change gap to 20px",
    "status": "applied"
  },
  "replies": [
    {
      "id": "r_ai",
      "author": "AI",
      "text": "Applied ✓ — Changed space-y-3 to space-y-5",
      "status": "applied"
    },
    {
      "id": "r_user_1",
      "author": "Osama",
      "text": "Actually make it 15px",
      "status": "pending-apply"
    },
    {
      "id": "r_user_2",
      "author": "Osama",
      "text": "looks not enough space, make it more",
      "status": "open"
    }
  ],
  "element_selector": "body > div > main > ...",
  "element_snapshot": "<div class=\"space-y-5\">...</div>",
  "html_file_path": "../test.html",
  "page_url": "http://localhost:8000/test.html",
  "author": "Osama",
  "created_at": "2026-06-15T20:11:45.226Z",
  "pin_x": 64.27,
  "pin_y": 18.15
}
```

**When Claude applies a pending item:**

1. **Read ONLY `pending-apply.json`** — it's completely self-contained
2. **Understand the context:**
   - Read `apply_type`: "reply" or "comment"
   - Read `apply_reply_id`: which reply to apply (if reply-level)
   - Read conversation history in `replies` array for context
   - Read the requested change from the marked reply's text
3. **Apply the change** based on element_selector and the request
4. **Update `comments.json`:**
   - Find the comment by id
   - Mark the applied reply as `status: "applied"`
   - Add a new AI reply documenting what was changed
5. **Remove from `pending-apply.json`** (server handles this automatically)

**Why this design is better:**
- ✅ No need to cross-reference multiple files
- ✅ Reduces chance of confusion or mistakes
- ✅ `pending-apply.json` is the work queue — complete and standalone
- ✅ Cleaner separation of concerns: queue (pending-apply) vs history (comments)

## Tips

### For Teams
- Each team member installs the bookmarklet once
- Everyone shares the same `comments.json` (if on a shared machine or LAN)
- Comments are attributed to whoever's name was entered on first use
- Reply to discuss changes before Claude applies them

### Troubleshooting

**"Cannot connect to comments server"**
- Ensure `npm start` is running in `comments-skill/`
- Check that port 3001 is not blocked

**Comments don't show up after refresh**
- Verify `comments.json` exists and contains data
- Check that the URL in the browser matches `url_base` in `config.json`

**Element selector not working**
- The comment skill falls back to snapshot matching (exact HTML) and text content matching
- If the element has changed significantly, it may not re-match — but the comment stays visible in the sidebar

**Browser blocked mixed content (HTTPS → HTTP)**
- Use `http://` pages locally during development
- For production, serve the comments server over HTTPS

## Claude Code Prompt Examples

When using Claude Code to apply comments:

> "Apply pending comments. Read `comments-skill/pending-apply.json`, apply each change to the corresponding HTML file, add an AI reply to the comment in `comments.json` with what you changed, and remove the comment from `pending-apply.json`."

Or simply:

> "Apply pending comments"

Claude Code will:
1. Read `pending-apply.json`
2. For each comment: find the element, apply the change, update the HTML file
3. Add an AI reply in `comments.json` with what was changed
4. Remove from `pending-apply.json` and set status to `applied`

## License

Open source — use and modify freely.
