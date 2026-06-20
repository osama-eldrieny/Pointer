# 🐕 Pointer

Quick, targeted feedback directly on HTML elements. No lengthy descriptions—just **click, comment, and sync with AI**.

> **Pointer** — Your team's fastest way to give element-level feedback on live HTML pages.

## Features

✨ **Bookmarklet-based** — Works on any localhost HTML page  
💾 **File-based storage** — Comments saved as plain JSON (no database needed)  
🎯 **Element selection** — Click any element to attach feedback  
🔄 **AI-ready** — Export pending comments for Claude Code to apply changes  
📝 **Threaded replies** — Discuss changes in context before applying  
🎨 **Visual highlighting** — See which elements have comments  
📍 **Pin positions** — Comments follow elements during scroll/zoom  

## Why Pointer?

Instead of lengthy feedback like:
> *"Go to the contact page, find the header section, and change the title size to 24px"*

With Pointer, just:
1. 🐕 Click the element
2. 💬 Say "Make this 24px"
3. ✨ Done — AI gets it instantly

**Perfect for:**
- 👥 Design reviews with developers
- 🤖 Feeding feedback to AI for implementation
- ⚡ Quick iteration loops
- 📱 Testing live pages (localhost, staging, production)

## Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/osama-eldrieny/Pointer.git
```

### Step 2: Start the Comments Server (Terminal 1)

Navigate to the skill folder and start the server:

```bash
cd Pointer/comments-skill
npm install
npm start
```

> ⚠️ **IMPORTANT: Keep this terminal open** — the comments server must stay running for the bookmarklet to work.

You'll see:
```
🎯 HTML Comments server running at http://localhost:3001
📌 Bookmarklet page: http://localhost:3001/bookmarklet
```

### Step 3: Enable Comments (Choose One Method)

#### Method A: Using the Bookmarklet (Quick Testing)

1. Open `http://localhost:3001/bookmarklet` in your browser
2. **Drag the "Pointer" button to your bookmarks bar** (click and hold, then drag)
3. The button should now appear in your browser's bookmarks
4. On any page, click the bookmarklet to activate the comments UI

**Tip:** The bookmarklet works like a browser bookmark — drag it to your toolbar for quick access.

#### Method B: Direct Script Injection (Persistent)

For persistent comments that survive page refreshes, add this script tag to your HTML `<head>` or before `</body>`:

```html
<!-- HTML Comments Skill: Enables the comments UI on page load.
     Ensure the comments server is running on port 3001. -->
<script src="http://localhost:3001/inject.js" defer></script>
```

This method:
- ✅ Comments UI loads **automatically** on every page load
- ✅ No need to click the bookmarklet each time
- ✅ Comments persist across page refreshes
- ✅ Perfect for development workflows

**Choose this method if:** You want comments to always be available while developing.

### Step 4: Open Your Project in the Browser

**Open your Project HTML file in the browser** — either as a local server or directly:

- **Test file:** Open the included `test.html` file directly in your browser (file is at the project root)
- **Your project:** Open your own HTML file or project URL
- **Local server:** Open `http://localhost:8000`, `http://localhost:3000`, etc. (use whatever port your project runs on)
- **Static file:** Open `file:///path/to/your/project.html` (open HTML file directly without a server)

### Step 5: Start Commenting

1. **Click the "HTML Comments" bookmarklet** from your bookmarks bar
2. A toolbar appears in the top-right corner
3. Click **"+ Add Comment"** button
4. **Click any element on the page** to attach a comment
5. Type your feedback and submit
6. See **numbered pins** appear on the element

### Step 6: View & Manage Comments

1. Click **"All Comments"** button in the toolbar
2. The sidebar opens showing all comments on the page
3. You can:
   - **Reply** to comments to discuss changes
   - **Delete** comments you no longer need
   - **Read** full comment history with replies

### Step 7: Queue Changes for your AI Agent (e.g., Claude)

When ready to apply a comment:

1. Click **"Ready to Apply"** button on the comment
2. The status changes to **"Pending Apply"** (highlighted in yellow)
3. If the comment has replies, you can mark individual replies instead
4. The comment is now in the queue for AI to process

### Step 8: Apply Changes with your AI Agent (Claude)

Tell Claude Code to apply your pending comments:

```
apply pending comments
```

Claude will:
- Read all queued comments from `pending-apply.json`
- Apply each change to the corresponding HTML file
- Add an AI reply showing what was changed
- Mark the comment as ✓ Applied
- **Browser automatically refreshes** to show the changes

**That's it!** Your HTML is now updated with all the changes. 🎉

## API Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/comments?page_url=...` | Fetch comments for a page |
| POST | `/api/comments` | Create a comment |
| POST | `/api/comments/:id/reply` | Add reply to comment |
| PATCH | `/api/comments/:id` | Update status (for AI apply workflow) |
| DELETE | `/api/comments/:id` | Delete comment |

## Apply with Claude Code

Mark comments as **"pending-apply"** in the UI, then tell Claude Code:

```
Apply pending comments from pending-apply.json. Read the file,
apply each requested change to its HTML file, add AI replies to comments.json,
and clear pending-apply.json when done.
```

Claude will:
- Read `pending-apply.json` (auto-generated work queue)
- Edit HTML files on disk
- Update `comments.json` with AI replies
- Mark comments as ✓ applied

See [CLAUDE_CODE_INTEGRATION.md](comments-skill/CLAUDE_CODE_INTEGRATION.md) for details.

## File Structure

```
comments-skill/
├── server.js              # Express API server
├── inject.js              # Browser overlay & UI (~22KB)
├── comments.json          # All comments (auto-created)
├── pending-apply.json     # Work queue for Claude Code
├── config.json            # Configuration
├── package.json           # Dependencies
├── README.md              # Full documentation
├── QUICK_REFERENCE.md     # Quick lookup
└── CLAUDE_CODE_INTEGRATION.md  # AI apply workflow

test.html                 # Example/demo page
```

## Configuration

Edit `comments-skill/config.json`:

```json
{
  "project_root": "../",            // Path to HTML files
  "server_port": 3001,              // Server port
  "url_base": "http://localhost:8000", // Your local server URL
  "comments_file": "./comments.json" // Where comments are stored
}
```

## Storage

- **comments.json** — All comments with full history (append-only)
- **pending-apply.json** — Work queue (auto-managed, cleared after applying)

Both are plain JSON — edit directly if needed.

## Example Comment

```json
{
  "id": "c_1718450000_abc123",
  "page_url": "http://localhost:8000/test.html",
  "html_file_path": "./test.html",
  "element_selector": "#hero h1",
  "author": "Alice",
  "text": "Change font to Inter",
  "status": "open",
  "created_at": "2026-06-16T10:00:00Z",
  "replies": [
    {
      "id": "r_1718450100_xyz",
      "author": "Bob",
      "text": "Agreed, looks better",
      "status": "open"
    },
    {
      "id": "r_1718450200_ai",
      "author": "AI",
      "text": "Applied ✓ — Changed font-family to Inter",
      "status": "applied"
    }
  ]
}
```

## Workflow

1. **Add** — Click element, type feedback, submit
2. **Discuss** — Reply in context with team
3. **Mark** — Click "Mark Apply" when ready for AI
4. **Apply** — Tell Claude Code "apply pending comments"
5. **Done** — AI replies appear, changes live, status → ✓

## Why This Approach?

- **No database** — Plain JSON files, easy to version control
- **No auth** — Local team skill, no user management needed
- **No external API** — Claude Code applies changes locally
- **Portable** — Ship with your project, works anywhere
- **Transparent** — See exactly what's being applied

## Limitations

- Local/localhost only (not internet-facing)
- Single-process concurrency (file-based writes)
- No real-time sync across multiple users
- Node.js 14+ required

## Troubleshooting

**Server won't start?**
```bash
# Check port
lsof -i :3001

# Kill if stuck
kill -9 <PID>

# Start fresh
npm start
```

**Bookmarklet not loading?**
- Check browser console (F12)
- Verify `config.json` url_base matches your server
- Ensure CORS is enabled (it is by default)

**Comments not showing?**
- Refresh page
- Check `comments-skill/comments.json` exists
- Verify paths in config are correct

## Creator

**Osama Eldrieny**
- 🌐 [Website](https://www.osamaeldrieny.com/)
- 💼 [LinkedIn](https://www.linkedin.com/in/osamaeldrieny/)

## License

MIT

## See Also

- [Full Documentation](comments-skill/README.md)
- [Quick Reference](comments-skill/QUICK_REFERENCE.md)
- [Claude Code Integration](comments-skill/CLAUDE_CODE_INTEGRATION.md)
- [Setup Guide](comments-skill/SKILL_SETUP.md)
