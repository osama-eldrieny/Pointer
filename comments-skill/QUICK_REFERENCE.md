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

## Comments Storage

**comments.json** — All comments with full history
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

**pending-apply.json** — Work queue (auto-managed, read by Claude Code)
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

### Quick and simple
```
Apply pending comments.
```

### With full instructions (recommended)
```
Apply pending comments from pending-apply.json. This file is self-contained with everything you need:
- If apply_type is "reply": apply only the marked reply's requested change (full conversation in replies array for context)
- If apply_type is "comment": apply the main comment
- Read element_selector and element_snapshot to locate the element
- Read the marked item's text to understand what change is requested
- Apply to the HTML file at html_file_path
- Update comments.json: mark the applied item as status: "applied"
- pending-apply.json will be auto-cleared by the server
```

### Key principle
**Read ONLY `pending-apply.json`** — it contains all info needed. No need to reference `comments.json` while applying. The pending-apply.json queue is self-contained and the single source of truth for what to apply.

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
| `server.js` | Node.js API server |
| `inject.js` | Browser overlay UI |
| `comments.json` | All comments (full history) |
| `pending-apply.json` | Work queue for Claude Code (auto-managed) |
| `config.json` | Configuration |
| `README.md` | Full documentation |
| `CLAUDE_CODE_INTEGRATION.md` | Claude Code workflow |

## What Gets Stored Where

| Data | Location |
|------|----------|
| All comments (history) | `comments.json` |
| Pending comments (work queue) | `pending-apply.json` |
| User name | Browser localStorage |
| Server config | `config.json` |
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
