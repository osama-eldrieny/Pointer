<img src="./assets/images/pointer-icon.png" alt="Pointer Logo" width="120" height="120">

# 🐕 Pointer

Quick, targeted feedback directly on HTML elements. No lengthy descriptions—just **click, comment, and sync with AI**.

> **Pointer** — Your team's fastest way to give element-level feedback on live HTML pages.

**For Designers, Front-end Developers, Business Analysts, Team Leads, Product Managers, and anyone on your team** — Give precise feedback on any element, discuss in context, and let AI apply the changes.

</br>
</br>

## 🚀 Quick Navigation

**Just want to use Claude Code?** → Go to [`WORKFLOWS.md`](./WORKFLOWS.md) ⭐  
**First time setting up?** → Scroll down to [Quick Start](#quick-start)  
**Looking for something specific?**
- 📖 Features → See [Features](#features) below
- 🤖 Claude Code guide → See [`SKILL.md`](./SKILL.md)
- 🔧 Technical details → See [`comments-skill/README.md`](./comments-skill/README.md)
- ❓ Troubleshooting → See [`SKILL.md`](./SKILL.md) or [`comments-skill/QUICK_REFERENCE.md`](./comments-skill/QUICK_REFERENCE.md)

</br>

## 📚 Documentation Guide

**Where to go depends on what you need:**

| Need | File | Purpose |
|------|------|---------|
| **Using with Claude Code** | [`WORKFLOWS.md`](./WORKFLOWS.md) | Quick guide: which command to use |
| **Claude Code detailed guide** | [`SKILL.md`](./SKILL.md) | Complete workflow documentation & examples |
| **Setup & browser usage** | Below | Install and test Pointer locally |
| **Technical reference** | [`comments-skill/`](./comments-skill/) | API, config, implementation details |

**Quick Paths:**
- 🎯 **Apply comments with Claude Code:** WORKFLOWS.md → SKILL.md → `"apply pending comments"`
- 👥 **Merge team comments:** WORKFLOWS.md → SKILL.md → `"merge comments"`
- 🏗️ **Build with Pointer API:** See comments-skill/README.md

</br>

## 📁 Project Structure

```
pointer/
├── README.md ......................... This file (overview & setup)
├── SKILL.md .......................... 🤖 How to use with Claude Code ⭐
├── WORKFLOWS.md ...................... 🎯 Which command to use ⭐
│
├── comments-skill/
│   ├── README.md ..................... Technical documentation
│   ├── server.js ..................... Express API server
│   ├── inject.js ..................... Browser overlay UI
│   ├── comments.json ................. Comments storage
│   ├── pending-apply.json ............ Work queue for Claude Code
│   ├── url-mappings.json ............ URL environment mappings
│   ├── config.json ................... Configuration
│   │
│   ├── QUICK_REFERENCE.md ........... Quick lookup guide
│   ├── CLAUDE_CODE_INTEGRATION.md ... Detailed Claude guide
│   ├── SKILL_SETUP.md ............... Architecture & v2.0 features
│   └── package.json .................. Dependencies
│
├── .claude/
│   ├── settings.json ................. 🔧 AI directives (local)
│   └── skills/pointer/SKILL.md ....... Reference copy (local)
│
├── assets/
│   └── images/pointer-icon.png ....... Logo
│
└── test.html ......................... Example demo page
```

**Documentation hierarchy:**
- **Root level** (README, SKILL.md, WORKFLOWS.md): User-facing, setup, Claude Code usage
- **comments-skill/**: Technical reference, API, implementation

</br>
</br>

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

</br>
</br>


## Why Pointer?

**❌ The old way (lengthy and error-prone):**
```
Go to the contact page, find the header section, and change the title size to 24px
```

**✅ The Pointer way (precise and instant):**
```
Make this 24px
```

1. 🐕 Click the element
2. 💬 Say "Make this 24px"
3. ✨ Done — AI gets it instantly

</br>
</br>


## Perfect for:

👨‍💼 **Product Managers**  
Validate requirements before design, generate specs directly from live pages, gather feedback faster

🎨 **Designers**  
Convert requirements and user stories to interactive designs using AI, get precise feedback from stakeholders, streamline design reviews with visual comments

📋 **Business Analysts**  
Prepare detailed user stories based on design mockups, validate business requirements against implementation

🧪 **QA/Testers**  
Highlight bugs and issues instantly without screenshot tools, give feedback faster with visual context, create test cases from comments

💻 **Front-end Developers**  
Fix issues directly with AI assistance, iterate on live pages in real-time, pair with AI for live coding sessions

⚡ **Team Leads**  
Facilitate faster design reviews and feedback loops, reduce communication overhead across team

</br>
</br>


## Quick Start (Setup & Browser Usage)

This section covers installation and local testing. 
**For Claude Code integration, see [`WORKFLOWS.md`](./WORKFLOWS.md) and [`SKILL.md`](./SKILL.md)**

</br>

### Step 1: Clone the Repository

```bash
git clone https://github.com/osama-eldrieny/Pointer.git
```

</br>

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

<div style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
  <strong>⚠️ IMPORTANT: Keep this terminal open</strong> — the comments server must stay running for the bookmarklet to work.
</div>


</br>

### Step 3: Enable Comments with Bookmarklet (Quick Testing)

1. Open `http://localhost:3001/bookmarklet` in your browser
2. **Drag the "Pointer" logo to your bookmarks bar** (click and hold, then drag)
3. The pointer bookmark should now appear in your browser's bookmarks as "🐕 Pointer"
4. On any page, click the bookmarklet to activate the comments UI

</br>

### Step 4: Setup AI Agent Integration (One-Time Only)

The Pointer skill is automatically set up and documented at the **project root**:
- `SKILL.md` — Complete workflow documentation
- `WORKFLOWS.md` — Quick entry point
- `.claude/settings.json` — AI directives

**Important:** When using Claude Code with Pointer, open it at the **project root** (the `pointer/` folder):

```
✅ CORRECT: Open Claude Code at /Users/oo/Desktop/Pointer/ (project root)
❌ WRONG: Open Claude Code at /Users/oo/Desktop/Pointer/comments-skill/
```

Once set up, you can simply tell Claude Code:
- `"apply pending comments"` — Claude will read `SKILL.md` and apply all queued changes
- `"merge comments"` — Claude will read `SKILL.md` and import team comments with URL mapping

</br>

### 🤖 Claude Code Integration Guide

Pointer has two main workflows with Claude Code:

#### ✨ Workflow 1: Apply Pending Comments
Apply changes from comments you've marked as "Pending Apply"
```
Tell Claude Code: "apply pending comments"
```
Claude will:
- Read pending changes from `pending-apply.json`
- Apply CSS changes to your HTML files
- Mark comments as "✓ Applied"
- Refresh your browser to see changes

#### ✨ Workflow 2: Merge Comments
Import comments from teammates (team collaboration feature)
```
Tell Claude Code: "merge comments"
```
Claude will:
- Find your ZIP file with team comments
- Ask you to map URLs (dev.company.com → localhost:5000)
- Merge comments into your project
- Save mappings for future imports

#### 📖 Complete Guides
- Quick start? → Read [`WORKFLOWS.md`](./WORKFLOWS.md)
- Detailed guide? → Read [`SKILL.md`](./SKILL.md)

**Important:** Open Claude Code at **project root**, not in comments-skill/ folder

</br>

### Step 5: One-Time Setup - Pointer for Easy Access

Benefits of this one-time setup:
- ✅ Comments UI loads **automatically** on every page load
- ✅ No need to click the bookmarklet each time
- ✅ Comments persist across page refreshes
- ✅ Perfect for development workflows

To make Pointer always open and survive page refreshes, add one of these script tags to your HTML `<head>` or before `</body>`:

**Option 1: Add this code in `<head>` tag**
```html
<!-- HTML Comments Skill: Enables the comments UI on page load.
     Ensure the comments server is running on port 3001. -->
<script src="http://localhost:3001/inject.js" defer></script>
```

**Option 2: Or add this code**
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

</br>

### Step 6: Open Your Project in the Browser

**Open your Project HTML file in the browser** — either as a local server or directly:

- **Test file:** Open the included `test.html` file directly in your browser (file is at the project root)
- **Your project:** Open your own HTML file or project URL
- **Local server:** Open `http://localhost:8000`, `http://localhost:3000`, etc. (use whatever port your project runs on)
- **Static file:** Open `file:///path/to/your/project.html` (open HTML file directly without a server)


</br>


### Step 7: Start Commenting

1. **Click the "🐕 Pointer" bookmarklet** from your bookmarks bar if it's not opened
2. A toolbar appears in the top-right corner
3. Click **"+ Add Comment"** button
4. **Click any element on the page** to attach a comment
5. Type your feedback and submit
6. See **numbered pins** appear on the element


</br>


### Step 8: View & Manage Comments

1. Click **"All Comments"** button in the toolbar
2. The sidebar opens showing all comments on the page
3. You can:
   - **Reply** to comments to discuss changes
   - **Delete** comments you no longer need
   - **Read** full comment history with replies


</br>


### Step 9: Queue Changes for your AI Agent

When ready to apply a comment:

1. Click **"Ready to Apply"** button on the comment
2. The status changes to **"Pending Apply"** (highlighted in yellow)
3. If the comment has replies, you can mark individual replies instead
4. The comment is now in the queue for your AI to process

</br>



### Step 10: Apply Pending Comments

Once the skill file is set up (Step 4), simply tell Claude Code:

```
apply pending comments
```

Claude will:
- Read all queued comments from `pending-apply.json`
- Apply each change to the corresponding HTML file
- Mark the comment/reply status as ✓ Applied

**Refresh your browser** to see the changes.

> 💡 **Pro tip:** If you want the browser to refresh automatically after applying comments, ask Claude to add a browser refresh step to the flow.

**That's it!** Your HTML is now updated with all the changes. 🎉

</br>
</br>

## New Features (v2.0)

### 🤖 Claude Code Integration (NEW!)
Two powerful commands for AI-assisted workflows:

**Apply Pending Comments**
```
apply pending comments
```
Tell Claude Code to automatically apply CSS changes to your HTML files.
See: [`SKILL.md`](./SKILL.md) → Workflow 1

**Merge Comments**
```
merge comments
```
Import comments from teammates with automatic URL mapping across environments.
See: [`SKILL.md`](./SKILL.md) → Workflow 2

---

### 🌐 Live URL Commenting

The bookmarklet now works on **any page** — not just localhost!

- ✅ Production sites
- ✅ Dev/staging environments (https://dev.company.com)
- ✅ Static HTML files (file://)
- ✅ Any localhost port

Simply click the bookmarklet on any page and start commenting. Comments are saved to your local server.

### 🗺️ Environment Mapping

Same page served under different URLs? Pointer merges comments automatically.

**Example:**
- Dev version: `https://dev.company.com/dashboard`
- Local version: `http://localhost:3000/dashboard`

Set up a mapping group once, and comments from dev appear on localhost automatically.

**How to use:**
1. Click "🗺 Manage Mappings" link on the bookmarklet page
2. Create a new group with both origins
3. Comments from one origin appear on the other

### 👥 Team Sync with Comments

Share comments from your teammate's machine directly.

**How it works:**
1. Teammate clicks "📦 Export ZIP" on their mappings page
2. Teammate shares the ZIP with you
3. You tell Claude Code: `merge comments`
4. Claude reads the SKILL.md and:
   - Extracts comments from the ZIP
   - Maps teammate's URLs to your local URLs (asks if new)
   - Saves the mapping for future imports
   - Merges all comments into your local project

**Key benefit:** Comments stay private (no cloud upload). Mappings persist, so repeat imports are automatic.

### 🏗️ Per-Project Setup

Run Pointer inside each project for isolated comments:

```bash
# Project 1
cd project-alpha
pointer/comments-skill npm start    # :3001

# In another terminal
# Project 2
cd project-beta
pointer/comments-skill npm start    # :3001 (after closing project-alpha)
```

One bookmarklet works for all projects — comments are naturally isolated per project.

</br>
</br>

## API Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/comments?page_url=...` | Fetch comments for a page |
| POST | `/api/comments` | Create a comment |
| POST | `/api/comments/:id/reply` | Add reply to comment |
| PATCH | `/api/comments/:id` | Update status (for AI apply workflow) |
| DELETE | `/api/comments/:id` | Delete comment |


</br>
</br>

## Apply with Claude Code

Mark comments as **"pending-apply"** in the UI, then tell Claude Code:

```
Apply pending comments from pending-apply.json. Read the file,
apply each requested change to its HTML file, mark status as applied,
and clear pending-apply.json when done.
```

Claude will:
- Read `pending-apply.json` (auto-generated work queue)
- Edit HTML files on disk
- Mark comments/replies as ✓ applied in `comments.json`

See [CLAUDE_CODE_INTEGRATION.md](comments-skill/CLAUDE_CODE_INTEGRATION.md) for details.


</br>
</br>


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

</br>
</br>


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


</br>
</br>

## Storage

- **comments.json** — All comments with full history (append-only)
- **pending-apply.json** — Work queue (auto-managed, cleared after applying)

Both are plain JSON — edit directly if needed.


</br>
</br>


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


</br>
</br>


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

</br>
</br>


## Workflow

1. **Add** — Click element, type feedback, submit
2. **Discuss** — Reply in context with team
3. **Mark** — Click "Mark Apply" when ready for AI
4. **Apply** — Tell Claude Code "apply pending comments"
5. **Done** — Changes live, status → ✓


</br>
</br>

## Why This Approach?

- **No database** — Plain JSON files, easy to version control
- **No auth** — Local team skill, no user management needed
- **No external API** — Claude Code applies changes locally
- **Portable** — Ship with your project, works anywhere
- **Transparent** — See exactly what's being applied


</br>
</br>

## Limitations

- Local/localhost only (not internet-facing)
- Single-process concurrency (file-based writes)
- No real-time sync across multiple users
- Node.js 14+ required



</br>
</br>

## Troubleshooting

**Server won't start?**
```bash
# Kill process on port 3001
kill -9 $(lsof -t -i :3001)

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


</br>
</br>

## Creator

**Osama Eldrieny**
- 🌐 [Website](https://www.osamaeldrieny.com/)
- 💼 [LinkedIn](https://www.linkedin.com/in/osamaeldrieny/)


</br>
</br>

## License

MIT


</br>
</br>

## See Also

### 🤖 For Claude Code Users
- [`WORKFLOWS.md`](./WORKFLOWS.md) — Which command to use (Start here!)
- [`SKILL.md`](./SKILL.md) — Complete workflow guide with examples

### 📚 For Technical Details
- [`comments-skill/README.md`](./comments-skill/README.md) — Full technical documentation
- [`comments-skill/QUICK_REFERENCE.md`](./comments-skill/QUICK_REFERENCE.md) — Quick lookup
- [`comments-skill/CLAUDE_CODE_INTEGRATION.md`](./comments-skill/CLAUDE_CODE_INTEGRATION.md) — Detailed guide
- [`comments-skill/SKILL_SETUP.md`](./comments-skill/SKILL_SETUP.md) — Architecture & v2.0 features

### 🔗 Documentation Hierarchy
```
You are here: README.md (overview & setup)
   ↓
For Claude Code? → WORKFLOWS.md (quick) or SKILL.md (detailed)
For technical details? → comments-skill/ folder
```
