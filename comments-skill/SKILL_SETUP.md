# HTML Comments Skill — Implementation Complete ✓

## What Was Built

A **Figma-style commenting overlay** for HTML pages with **Claude Code integration**. Team members can:

1. ✅ Click elements on any localhost HTML page to add comments
2. ✅ See all comments in a sidebar with author, timestamp, and reply threads
3. ✅ Mark comments as "Pending Apply" to queue them for Claude Code
4. ✅ Tell Claude Code "apply pending comments" — Claude reads `comments.json`, edits HTML files, and marks them as applied
5. ✅ Export clean HTML without the commenting overlay

---

## Files Created

| File | Purpose |
|------|---------|
| `server.js` | Express server — CRUD API, serves inject.js |
| `inject.js` | Client overlay UI (vanilla JS, ~900 lines) |
| `comments.json` | All comments with full history |
| `pending-apply.json` | Work queue (auto-managed by server) |
| `config.json` | Configuration (project_root, url_base, port) |
| `package.json` | Dependencies (express, cors) |
| `bookmarklet.txt` | One-liner to load skill in browser |
| `README.md` | Full documentation |
| `.gitignore` | Excludes node_modules, comments.json, etc. |

---

## Current Status

✅ **Server running** on `http://localhost:3001`
✅ **API endpoints** tested and working
✅ **Bookmarklet page** available at `http://localhost:3001/bookmarklet`
✅ **Test page** created at `../test.html`

---

## Quick Test (Right Now)

### 1. Open Test Page
Navigate to `http://localhost:8080/test.html` in your browser (assuming you have a local server on 8080, or modify the URL).

If you don't have a local server, you can serve the test page with:
```bash
cd /Users/osamaeldrieny/Sandbox/"New Project"
python3 -m http.server 8080
```
Then open `http://localhost:8080/test.html`.

### 2. Get the Bookmarklet
1. Open `http://localhost:3001/bookmarklet`
2. Drag "HTML Comments" to your bookmarks bar
3. Or copy the snippet from `bookmarklet.txt`

### 3. Add a Comment
1. Click the bookmarklet on the test page
2. A toolbar appears top-right
3. Click "+ Comment"
4. Click any element (e.g., the title or a paragraph)
5. Type a comment in the popover
6. Submit
7. See the numbered pin on the element
8. Click the pin to open the sidebar

### 4. Mark for AI Apply
1. In the sidebar, find your comment
2. Click "Mark Apply" → status becomes orange "Pending Apply"
3. Click "Export HTML" to download the current state

---

## Integration with Claude Code

This is where the magic happens. When you're ready to apply comments:

### Tell Claude Code to Apply

In your Claude Code chat, simply say:

```
Apply pending comments
```

Or with more detail:

```
Apply all pending comments. Read pending-apply.json, 
apply each change to the corresponding HTML file, 
and mark status as applied.
```

The skill automatically:
- Moves comments marked "Pending Apply" to `pending-apply.json`
- Removes them when they're applied or deleted
- So Claude Code only needs to read `pending-apply.json` to know what to process

Claude will:
- Read your `comments.json` (it's just JSON, no special parsing needed)
- Edit your HTML files on disk
- Update the comment file with "applied" status
- Tell you what was changed

### Then Refresh

1. Refresh the browser on your HTML page
2. Click the bookmarklet again
3. Your comments now show green ✓ pins
4. Export the updated HTML if needed

---

## Example Workflow

```
Team creates mockup in AI
  ↓
Markup ready for review
  ↓
QA/Designer opens page + clicks bookmarklet
  ↓
"Change the header font to Inter"
"Make the button red"
"Fix typo in footer"
  ↓
All comments marked as "Pending Apply"
  ↓
Tell Claude Code: "Apply pending comments"
  ↓
Claude Code reads comments.json, edits HTML, marks as applied
  ↓
Refresh browser → all changes live
  ↓
Export updated HTML
  ↓
Done!
```

No meetings. No notebooks. No back-and-forth chat. Just annotate and apply.

---

## Configuration

### URL Mapping

By default, `config.json` is set up to map:
```
http://localhost:8080/index.html → ../index.html
http://localhost:8080/pages/home.html → ../pages/home.html
```

If your setup is different, edit `config.json`:

```json
{
  "project_root": "../",
  "server_port": 3001,
  "url_base": "http://localhost:8080",
  "comments_file": "./comments.json"
}
```

For example, if your HTML files are in a sibling folder:
```json
{
  "project_root": "../../my-html-project/",
  "url_base": "http://localhost:3000"
}
```

---

## API Reference

All endpoints are on `http://localhost:3001`.

### GET `/api/comments?page_url=<url>`
Fetch all comments for a page.

**Response:**
```json
[
  {
    "id": "c_1718450000_abc",
    "page_url": "http://localhost:8080/index.html",
    "html_file_path": "./index.html",
    "element_selector": "#header h1",
    "element_snapshot": "<h1>Welcome</h1>",
    "pin_x": 12.5,
    "pin_y": 8.3,
    "author": "Alice",
    "text": "Change font to Inter",
    "status": "open",
    "created_at": "2026-06-15T10:00:00Z",
    "replies": [
      { "id": "r_...", "author": "Bob", "text": "Agreed", "created_at": "..." },
      { "id": "r_...", "author": "AI", "text": "Applied ✓ — Changed font-family", "created_at": "..." }
    ]
  }
]
```

### POST `/api/comments`
Create a comment.

**Request:**
```json
{
  "page_url": "http://localhost:8080/index.html",
  "element_selector": "#header h1",
  "element_snapshot": "<h1>Welcome</h1>",
  "pin_x": 12.5,
  "pin_y": 8.3,
  "author": "Alice",
  "text": "Change font to Inter"
}
```

### PATCH `/api/comments/:id`
Update status or text.

**Request:**
```json
{
  "status": "pending-apply"
}
```

### POST `/api/comments/:id/reply`
Add a reply to a comment.

**Request:**
```json
{
  "author": "Bob",
  "text": "Agreed, let's do it"
}
```

### DELETE `/api/comments/:id`
Delete a comment and all its replies.

---

## Troubleshooting

### Server won't start
- Check that port 3001 is not in use: `lsof -i :3001`
- Kill any process on 3001: `kill -9 <pid>`
- Try again: `npm start`

### Bookmarklet not loading
- Ensure `npm start` is running
- Check that you're on `http://localhost:8080/` (not `https://`)
- Open browser console (F12) and look for errors

### Comments don't save
- Check that `comments.json` is readable: `ls -la comments.json`
- Verify `config.json` has correct paths

### Element not re-matching after HTML changes
- The skill tries multiple strategies: selector → snapshot → text content
- If none work, the comment stays in sidebar but pin disappears
- Refresh and re-mark the element

---

## Next Steps

1. **Test it out** — Open `test.html`, add comments, mark for apply
2. **Set up your project** — Place this `comments-skill` folder in your actual project
3. **Configure URLs** — Edit `config.json` if needed
4. **Share with team** — Send them the bookmarklet link
5. **Integrate with Claude Code** — Tell Claude to apply pending comments when ready

---

## Tips for Claude Code Integration

When asking Claude to apply comments, be specific:

### Good prompts:
- "Apply pending comments to my HTML files"
- "Apply all pending-apply comments from comments.json"
- "Make the changes described in the pending comments and update their status to applied"

### Less helpful:
- "Fix the HTML" (Claude won't know to read comments.json)
- "Update the website" (too vague)

### Example full prompt for Claude Code:

```
I have an HTML project with a comments skill in `comments-skill/`.

Comments are stored in `comments-skill/comments.json` as an array where each comment has:
- id, page_url, html_file_path, element_selector, element_snapshot, text, status, replies

I need you to:
1. Read comments.json
2. Find all comments where status === "pending-apply"
3. For each pending comment:
   a. Read the HTML file at html_file_path
   b. Find the target element using element_selector (or element_snapshot if selector fails)
   c. Apply the change from comment.text
   d. Save the updated HTML
4. For each applied comment:
   a. Add a reply object with author: "AI", text: "Applied ✓ — [summary of change]", created_at: timestamp
   b. Change status to "applied"
5. Save the updated comments.json
6. Report what was applied

Here are my HTML files: [list your files or point Claude to the folder]
```

---

## Support

- Check `README.md` for detailed usage instructions
- API errors are logged to console — check `npm start` output
- Browser console (F12) shows client-side errors

---

## Architecture Summary

```
Browser
  ├─ Bookmarklet injects script from localhost:3001
  ├─ inject.js renders toolbar + overlay UI
  └─ User comments, marks for apply
       ↓
Comments Server (Node.js + Express)
  ├─ Serves inject.js to browser
  ├─ Handles comment CRUD via API
  └─ Reads/writes comments.json
       ↓
comments.json (plain JSON)
  └─ Readable by Claude Code
       ↓
Claude Code
  ├─ Reads comments.json
  ├─ Edits HTML files on disk
  └─ Marks comments as "applied"
```

No databases, no complex auth, no cloud dependencies. Just a local server + JSON file + Claude Code.

---

**Built with ❤️ for faster design feedback loops**
