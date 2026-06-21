<img src="./assets/images/pointer-icon.png" alt="Pointer Logo" width="120" height="120">

# 🐕 Pointer

Quick, targeted feedback directly on HTML elements. No lengthy descriptions—just **click, comment, and sync with AI**.

> **Pointer** — Your team's fastest way to give element-level feedback on live HTML pages.

**For Designers, Front-end Developers, Business Analysts, Team Leads, Product Managers, and anyone on your team** — Give precise feedback on any element, discuss in context, and let AI apply the changes.

## Features

✨ **Bookmarklet-based** — Works on any localhost HTML page or static HTML file  
- **Localhost:** `http://localhost:3000`, `http://localhost:8000`, etc.
- **Static HTML:** `file:///path/to/your/page.html`

💾 **File-based storage** — Comments saved as plain JSON (no database needed)  
🎯 **Element selection** — Click any element to attach feedback  
🔄 **AI-ready** — Export pending comments for any AI agent to apply changes  
   (Claude Code, ChatGPT, Gemini, Copilot, or your favorite AI)  
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

You'll see:
```
🎯 HTML Comments server running at http://localhost:3001
📌 Bookmarklet page: http://localhost:3001/bookmarklet
```

> ⚠️ **IMPORTANT: Keep this terminal open** — the comments server must stay running for the bookmarklet to work.

### Step 3: Enable Comments (Choose One Method)

#### Method A: Using the Bookmarklet (Quick Testing)

1. Open `http://localhost:3001/bookmarklet` in your browser
2. **Drag the "Pointer" logo to your bookmarks bar** (click and hold, then drag)
3. The pointer bookmark should now appear in your browser's bookmarks as "🐕 Pointer"
4. On any page, click the bookmarklet to activate the comments UI

#### Method B: Direct Script Injection (Always On)

This method:
- ✅ Comments UI loads **automatically** on every page load
- ✅ No need to click the bookmarklet each time
- ✅ Comments persist across page refreshes
- ✅ Perfect for development workflows

For comments that are always open and survive page refreshes, add one of these script tags to your HTML `<head>` or before `</body>`:

**Option 1: Simple (uses browser cache)**
```html
<!-- HTML Comments Skill: Enables the comments UI on page load.
     Ensure the comments server is running on port 3001. -->
<script src="http://localhost:3001/inject.js" defer></script>
```

**Option 2: Always Fresh (cache busting for development)**
```html
<script>
  (function() {
    var s = document.createElement('script');
    s.src = 'http://localhost:3001/inject.js?t=' + Date.now();
    s.defer = true;
    document.head.appendChild(s);
  })();
</script>
```

**Which option to choose:**
- **Option 1:** Use for production or when you want browser caching
- **Option 2:** Use for development to always get the latest inject.js (cache busting)

### Step 4: Open Your Project in the Browser

**Open your Project HTML file in the browser** — either as a local server or directly:

- **Test file:** Open the included `test.html` file directly in your browser (file is at the project root)
- **Your project:** Open your own HTML file or project URL
- **Local server:** Open `http://localhost:8000`, `http://localhost:3000`, etc. (use whatever port your project runs on)
- **Static file:** Open `file:///path/to/your/project.html` (open HTML file directly without a server)

### Step 5: Start Commenting

1. **Click the "🐕 Pointer" bookmarklet** from your bookmarks bar if it's not opened
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

### Step 7: Queue Changes for your AI Agent

When ready to apply a comment:

1. Click **"Ready to Apply"** button on the comment
2. The status changes to **"Pending Apply"** (highlighted in yellow)
3. If the comment has replies, you can mark individual replies instead
4. The comment is now in the queue for your AI to process

### Step 8: Apply Changes with your AI Agent

Tell your AI agent in a new terminal to apply your pending comments. Examples:

**Claude Code:**
```
apply pending comments
```

**ChatGPT, Gemini, or other AI agents:**
```
Apply the pending comments from pending-apply.json. 
Read each comment, apply the requested changes to the corresponding HTML file,
add AI replies to comments.json showing what was changed,
and clear pending-apply.json when done.
```

Your AI agent will:
- Read all queued comments from `pending-apply.json`
- Apply each change to the corresponding HTML file
- Add an AI reply showing what was changed
- Mark the comment as ✓ Applied

**Refresh your browser** to see the changes. 

> 💡 **Pro tip:** If you want the browser to refresh automatically after applying comments, ask your AI agent to add a browser refresh step to the flow.

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
Pointer/
├── comments-skill/
│   ├── server.js                    # Express API server
│   ├── inject.js                    # Browser overlay & UI (~22KB)
│   ├── comments.json                # All comments (auto-created)
│   ├── pending-apply.json           # Work queue for AI apply
│   ├── config.json                  # Configuration
│   ├── package.json                 # Dependencies
│   ├── package-lock.json            # Locked dependencies
│   ├── README.md                    # Full documentation
│   ├── QUICK_REFERENCE.md           # Quick lookup
│   ├── SKILL_SETUP.md               # Setup guide
│   └── CLAUDE_CODE_INTEGRATION.md   # AI apply workflow
│
├── assets/
│   └── images/
│       ├── pointer-icon.png         # Main icon (draggable bookmark)
│       ├── pointer-icon-16.png      # Small icon variant
│       ├── pointer-icon-favicon.png # Favicon for bookmarklet page
│       └── favicon.ico              # Standard favicon
│
├── test.html                        # Example/demo page
├── README.md                        # Main documentation
└── package-lock.json                # Root dependencies lock
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

## Example Comment in comments.json

```json
{
  "id": "c_1718450000_abc123",
  "page_url": "file:///Users/you/project/test.html",
  "html_file_path": "../test.html",
  "element_selector": "body > main > h1.title",
  "element_snapshot": "<h1 class=\"title\">Dashboard</h1>",
  "element_tag": "h1",
  "element_classes": ["title"],
  "element_id": null,
  "computed_styles": {
    "font-size": "36px",
    "font-weight": "700"
  },
  "applied_css_rules": [],
  "parent_element_info": {
    "tag": "main",
    "classes": [],
    "id": null
  },
  "pin_x": 50.5,
  "pin_y": 75.0,
  "author": "Alice",
  "text": "Change font to Inter",
  "status": "applied",
  "scope": "element",
  "apply_to": "element-only",
  "created_at": "2026-06-16T10:00:00Z",
  "replies": [
    {
      "id": "r_1718450100_xyz",
      "author": "Bob",
      "text": "Suggested: use font-weight 600",
      "created_at": "2026-06-16T10:05:00Z",
      "status": "open"
    },
    {
      "id": "r_1718450150_uvw",
      "author": "Charlie",
      "text": "I think 700 is better",
      "created_at": "2026-06-16T10:10:00Z",
      "status": "pending-apply"
    },
    {
      "id": "r_1718450200_ai",
      "author": "AI",
      "is_ai": true,
      "text": "✓ Applied — Changed font-family to 'Inter', font-weight to 700",
      "created_at": "2026-06-16T10:15:00Z",
      "status": "applied"
    }
  ]
}
```

## Example Pending Apply in pending-apply.json

```json
{
  "id": "c_1718450000_abc123",
  "apply_comment": true,
  "apply_reply_ids": ["r_1718450150_uvw"],
  "original_comment": {
    "text": "Change font to Inter",
    "status": "applied"
  },
  "replies": [
    {
      "id": "r_1718450100_xyz",
      "author": "Bob",
      "text": "Suggested: use font-weight 600",
      "created_at": "2026-06-16T10:05:00Z",
      "status": "open"
    },
    {
      "id": "r_1718450150_uvw",
      "author": "Charlie",
      "text": "I think 700 is better",
      "created_at": "2026-06-16T10:10:00Z",
      "status": "pending-apply"
    }
  ],
  "element_selector": "body > main > h1.title",
  "page_url": "file:///Users/you/project/test.html",
  "author": "Alice",
  "created_at": "2026-06-16T10:00:00Z",
  "pin_x": 50.5,
  "pin_y": 75.0
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
