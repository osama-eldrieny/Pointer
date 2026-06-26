# Quick Reference Card

## Server Status
✅ **Running on** `http://localhost:3001`

## Bookmarklet
```
javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3001/inject.js?t='+Date.now();document.head.appendChild(s);})()
```

### How to Install
1. Open `http://localhost:3001/bookmarklet`
2. Drag "HTML Comments" to your bookmarks bar
3. (Or manually add the above code as a bookmark)

## Usage Steps

### 1. Open HTML Page
```
http://localhost:8080/your-page.html
```

### 2. Click Bookmarklet
- Toolbar appears top-right
- "Name?" prompt on first use (stored in localStorage)

### 3. Add Comments
- Click **"+ Comment"** button
- Click any element to comment
- Type feedback
- Submit → numbered pin appears

### 4. Manage Comments
- Click **"Comments (N)"** to open sidebar
- See all comments with author, timestamp, replies
- Click "Reply" to discuss changes
- Click "Mark Apply" to queue comment for AI
- Click "Mark Apply" on any reply to queue that specific reply (for iterative refinements)

### 5. Apply with Claude Code
Copy-paste into Claude Code:

```
Apply pending comments. Read pending-apply.json, 
apply each to its HTML file, mark status as applied,
and remove from pending-apply.json when done.
```

Claude will:
- Read `pending-apply.json` (the work queue)
- Edit HTML files on disk
- Mark comments/replies as applied in `comments.json`
- Clear `pending-apply.json` when done

## Config
File: `comments-skill/config.json`

```json
{
  "url_base": "http://localhost:8080",  ← Change if needed
  "project_root": "../",                 ← Path to HTML files
  "server_port": 3001
}
```

## TWO WORKFLOWS

### 1. Apply Pending Comments (Execute changes)
```
User: "apply pending comments"
  ↓
Claude reads pointer/comments-skill/pending-apply.json
  ↓
Claude edits HTML files (CSS changes)
  ↓
Claude updates pointer/comments-skill/comments.json (status → "applied")
  ↓
Result: HTML files changed, comments marked ✓
```

### 2. Merge Comments (Import team feedback)
```
User: "merge comments"
  ↓
Claude finds ZIP file or reads JSON
  ↓
Claude asks: "Map URL to local? (e.g., dev.company.com → localhost:5000)"
  ↓
Claude merges into pointer/comments-skill/comments.json
  ↓
Claude saves mapping to pointer/comments-skill/url-mappings.json
  ↓
Result: Comments imported, HTML NOT changed, mappings saved for next import
```

---

## Comments Storage

**pointer/comments-skill/comments.json** — All comments with full history
```json
[
  {
    "id": "c_...",
    "page_url": "...",
    "html_file_path": "./index.html",
    "element_selector": "#header h1",
    "author": "Alice",
    "text": "Change font to Inter",
    "status": "open",              ← open | pending-apply | applied
    "replies": [
      {
        "id": "r_...",
        "author": "Bob",
        "text": "Actually, use Roboto instead",
        "status": "open",           ← Replies now track status too!
        "created_at": "..."
      }
    ]
  }
]
```

**pointer/comments-skill/pending-apply.json** — Work queue (auto-managed, read by Claude Code)
```json
[
  {
    "id": "c_...",
    "status": "pending-apply",
    ... (full comment object)
  }
]
```
⚠️ Don't edit manually — server manages it automatically

**pointer/comments-skill/url-mappings.json** — Environment mappings (for merge workflow)
```json
[
  {
    "group_id": "dev_company",
    "origins": ["https://dev.company.com", "http://localhost:5000"],
    "local_origin": "http://localhost:5000",
    "created_at": "2026-06-26T15:30:00Z"
  }
]
```
⚠️ Auto-populated during merge — ask Claude to merge comments to create mappings

## API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/comments?page_url=...` | Get comments for page |
| GET | `/api/pending-apply` | Get pending comments (for Claude Code) |
| POST | `/api/comments` | Add comment |
| PATCH | `/api/comments/:id` | Update status/text (moves to pending-apply.json if status="pending-apply") |
| POST | `/api/comments/:id/reply` | Add reply |
| DELETE | `/api/comments/:id` | Delete comment (and remove from pending-apply.json) |

## Common Prompts for Claude Code

### Apply Pending Comments

**Quick:**
```
Apply pending comments.
```

**Detailed (recommended):**
```
Apply pending comments from pointer/comments-skill/pending-apply.json.
Read element_selector and element_snapshot to locate each element.
Update the CSS rule from applied_css_rules (never create new rules).
Update pointer/comments-skill/comments.json: mark as status "applied".
```

### Merge Comments

**Quick:**
```
Merge comments.
```

**Detailed (recommended):**
```
Merge comments from ZIP file. Read pointer/comments-skill/url-mappings.json.
For each unique origin in comments, ask user what local URL it maps to.
Save mappings to url-mappings.json for future imports.
Merge into pointer/comments-skill/comments.json and pending-apply.json.
Do NOT edit HTML files or apply comments.
```

### Key Principles

**Apply workflow:**
- Read ONLY `pointer/comments-skill/pending-apply.json` (self-contained)
- Update `pointer/comments-skill/comments.json` (mark as applied)
- Edit HTML files

**Merge workflow:**
- Read ZIP or JSON comments
- Ask user about URL mappings
- Merge into storage files
- Do NOT edit HTML files
- Save mappings for future use

## Troubleshooting

### Server won't start
```bash
# Check port 3001
lsof -i :3001

# Kill process if running
kill -9 <PID>

# Start fresh
cd comments-skill && npm start
```

### Server running but bookmarklet not loading
- Check browser console: `F12` → Console tab
- Look for CORS or network errors
- Ensure config.json `url_base` matches your localhost port

### Comments not showing
- Refresh browser
- Open browser console (F12)
- Check that comments.json exists
- Verify config.json paths are correct

### HTML not updating after Claude applies
- Refresh browser (Cmd+R or Ctrl+R)
- Click bookmarklet again
- Comments should show as green ✓

## Files at a Glance

| File | Purpose |
|------|---------|
| `pointer/comments-skill/server.js` | Node.js API server |
| `pointer/comments-skill/inject.js` | Browser overlay UI |
| `pointer/comments-skill/comments.json` | All comments (full history) |
| `pointer/comments-skill/pending-apply.json` | Work queue for Claude Code (auto-managed) |
| `pointer/comments-skill/url-mappings.json` | Environment mappings (for team sync) |
| `pointer/comments-skill/config.json` | Configuration |
| `pointer/comments-skill/README.md` | Full documentation |
| `pointer/comments-skill/CLAUDE_CODE_INTEGRATION.md` | Detailed Claude Code guide |

## What Gets Stored Where

| Data | Location |
|------|----------|
| All comments (history) | `pointer/comments-skill/comments.json` |
| Pending comments (work queue) | `pointer/comments-skill/pending-apply.json` |
| URL mappings (team sync) | `pointer/comments-skill/url-mappings.json` |
| User name | Browser localStorage |
| Server config | `pointer/comments-skill/config.json` |
| HTML files | Your project (wherever they are) |

## Performance Notes

- **inject.js**: ~22KB (loaded via bookmarklet)
- **Comments.json**: ~1KB per comment (plain text)
- **API response**: <10ms for typical operations
- **Browser memory**: ~5MB when sidebar open

## Security Notes

- ✓ No authentication needed (local use)
- ✓ No external APIs called
- ✓ CORS set to `*` (safe for localhost)
- ✓ Comments.json is plain JSON (edit directly if needed)
- ⚠ Not suitable for production/internet-facing use

## Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Submit comment | Ctrl+Enter (in textarea) |
| Close popover | Esc |
| Open sidebar | Click Comments button |
| Close sidebar | Click X in header |

(Browser defaults apply for other shortcuts)

## File Size Summary

```
server.js         ~15 KB
inject.js         ~22 KB
package.json      ~1 KB
config.json       <1 KB
bookmarklet.txt   <1 KB
README.md         ~20 KB
SKILL_SETUP.md    ~15 KB
CLAUDE_CODE...    ~20 KB
Total:            ~94 KB (excluding node_modules)
```

## Next Steps

1. ✅ Server running
2. ⬜ Serve test.html on localhost:8080
3. ⬜ Test bookmarklet on test page
4. ⬜ Add a test comment
5. ⬜ Mark as pending-apply
6. ⬜ Tell Claude Code to apply
7. ⬜ See changes live

---

**For detailed docs, see:**
- `README.md` — Full guide
- `SKILL_SETUP.md` — Setup & API
- `CLAUDE_CODE_INTEGRATION.md` — Claude workflow
