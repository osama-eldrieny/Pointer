# Pointer Feedback Skill

Manage HTML comments and apply feedback using Claude Code.

## 🎯 Quick Reference: TWO DISTINCT WORKFLOWS

| User says... | Workflow | Action |
|---|---|---|
| **"apply pending comments"** | Apply Workflow | Read `pointer/comments-skill/pending-apply.json`, apply changes to HTML, update status to ✓ applied |
| **"merge comments"** | Merge Workflow | Read new comments/ZIP, map URLs, merge into storage, ask about mappings |

⚠️ **CRITICAL:** These are DIFFERENT workflows. Do NOT mix them up.
- **Apply** = execute pending changes (edits HTML files, modifies `pointer/comments-skill/pending-apply.json`)
- **Merge** = import team comments (only modifies `pointer/comments-skill/comments.json`, `pointer/comments-skill/pending-apply.json`, `pointer/comments-skill/url-mappings.json` — does NOT edit HTML files, does NOT change comment status)

---

## WORKFLOW 1️⃣: APPLY PENDING COMMENTS

**Triggered by:** User says "apply pending comments"  
**Files modified:** 
- HTML files (edits)
- `pointer/comments-skill/comments.json` (status updates)
- `pointer/comments-skill/pending-apply.json` (cleared)

**Files read:**
- `pointer/comments-skill/pending-apply.json`
- `pointer/comments-skill/comments.json`

### Detailed Steps

#### Step 1: Read the work queue

```bash
cat pointer/comments-skill/pending-apply.json
```

If empty (`[]`), stop and tell user: "No pending comments to apply."

Each pending item contains:
- `id` — unique comment ID
- `html_file_path` — which HTML file to edit (e.g., `"../test.html"`)
- `element_selector` — CSS path (e.g., `"body > h1.title"`)
- `element_snapshot` — exact HTML (e.g., `"<h1 class='title'>Dashboard</h1>"`)
- `applied_css_rules` — **array of CSS rules actually styling this element** (ordered by specificity)
- `text` — what change is requested (e.g., "Make this 24px")
- `apply_to` — either `"element-only"` or `"all-similar"`
- `apply_reply_ids` — (optional) specific replies to mark as applied

#### Step 2: For each pending comment, apply the change

**2a. Find the element in the HTML file:**
1. Use `element_selector` to locate the element
2. If selector doesn't work, search by `element_snapshot` (the exact HTML)
3. If not found, tell user: "Comment ID {id} can't be found — HTML may have changed"

**2b. Understand the requested change:**
- Read comment `text` (e.g., "Make this font-size 24px")
- Understand WHAT needs to change and HOW

**2c. CRITICAL: Find the ACTUAL CSS rule being applied**
- Look at `applied_css_rules` array (last rule in array has highest specificity = actually applies)
- **NEVER create new rules** — always modify existing rules from this array
- Example:
  ```
  applied_css_rules: [".title", ".main-section .title", ".field-box p"]
  ↑ Modify the LAST one (highest specificity)
  ```

**2d. Update that CSS rule in the HTML file's `<style>` tag:**
```html
<!-- Before -->
<style>
  .field-box p { margin: 0; }
</style>

<!-- After: Apply "add 6px margin bottom" -->
<style>
  .field-box p { margin: 0 0 6px 0; }
</style>
```

**2e. Save the HTML file**

#### Step 3: Update status in comments.json

Read and update `pointer/comments-skill/comments.json`:

```javascript
const allComments = JSON.parse(fs.readFileSync('pointer/comments-skill/comments.json', 'utf8'));
const comment = allComments.find(c => c.id === pendingItem.id);

if (comment) {
  comment.status = 'applied';  // Mark comment as ✓ applied
  
  // If specific replies were marked for apply, mark only those
  if (pendingItem.apply_reply_ids && pendingItem.apply_reply_ids.length > 0) {
    pendingItem.apply_reply_ids.forEach(replyId => {
      const reply = comment.replies.find(r => r.id === replyId);
      if (reply) reply.status = 'applied';
    });
  }
}
// Save updated comments.json
fs.writeFileSync('pointer/comments-skill/comments.json', JSON.stringify(allComments, null, 2), 'utf8');
```

#### Step 4: Clear the queue

```bash
echo "[]" > pointer/comments-skill/pending-apply.json
```

#### Step 5: Done!

Tell user:
```
✓ Applied {N} pending comments to {M} HTML files
  - Refresh browser to see changes
```

---

## WORKFLOW 2️⃣: MERGE COMMENTS

**Triggered by:** User says "merge comments" or "import team comments"  
**Files modified:** 
- `pointer/comments-skill/comments.json`
- `pointer/comments-skill/pending-apply.json`
- `pointer/comments-skill/url-mappings.json`

**Files read:**
- New comments (ZIP or JSON)
- `pointer/comments-skill/comments.json`
- `pointer/comments-skill/url-mappings.json`

**HTML files:** NOT modified (merge only, no applying)

### Critical Rules

🔴 **NEVER apply pending comments during merge**  
🔴 **ONLY merge comments, do NOT:**
   - Edit HTML files
   - Change comment status (leave as-is from imported comments)
   - Apply any pending comments
   - Clear pending-apply.json

🔴 **ASK user about new URL mappings before proceeding**

### Detailed Steps

#### Step 1: Find and extract the new comments

**Option A: ZIP file provided**
```bash
find . -maxdepth 2 -name "*.zip" -o -name "pointer-export.zip" | head -1
```

If found:
```bash
unzip pointer-export.zip -d pointer/comments-skill/import-staging/
```

**Option B: User provides JSON directly**
- Accept the JSON object/array from user
- Save to temporary staging area

**Option C: Neither**
- Ask user: "Please provide a ZIP file or JSON comments to merge"
- Stop

#### Step 2: Read imported comments and mappings

```javascript
const importedComments = JSON.parse(fs.readFileSync('pointer/comments-skill/import-staging/comments.json', 'utf8'));
const currentMappings = JSON.parse(fs.readFileSync('pointer/comments-skill/url-mappings.json', 'utf8'));
```

#### Step 3: Identify unique origins in imported comments

Extract all unique origins from `page_url`:
```javascript
const uniqueOrigins = [...new Set(importedComments.map(c => {
  const url = new URL(c.page_url);
  return `${url.protocol}//${url.host}`;  // e.g., "https://www.uimarkets.com"
}))];
```

Example output:
```
["https://www.uimarkets.com", "https://staging.api.com"]
```

#### Step 4: FOR EACH unique origin, determine mapping

**For each origin:**

1. **Check if already mapped** in `url-mappings.json`:
   ```javascript
   const existingGroup = currentMappings.find(group => 
     group.origins.includes(origin)
   );
   ```

2. **If YES (already mapped):**
   - Use existing mapping
   - Continue to next origin
   - Example: `"https://www.uimarkets.com"` → already maps to `"http://localhost:5000"`

3. **If NO (new origin):**
   - **ASK USER:** "Found comments from `{origin}`. What local URL does this map to? (e.g., `http://localhost:3000`)"
   - User responds with local URL
   - **SAVE this mapping** to `url-mappings.json` for future imports

#### Step 5: Transform imported comments with mapped URLs

For each imported comment:

```javascript
const transformedComments = importedComments.map(comment => {
  // Find the mapping for this comment's origin
  const commentOrigin = new URL(comment.page_url);
  const originString = `${commentOrigin.protocol}//${commentOrigin.host}`;
  
  const mapping = currentMappings.find(group => 
    group.origins.includes(originString)
  );
  
  if (!mapping) {
    // This shouldn't happen if Step 4 was done correctly
    throw new Error(`No mapping found for ${originString}`);
  }
  
  // Get the local origin to map to (first origin in group, or specified local origin)
  const localOrigin = mapping.local_origin || mapping.origins[0];
  
  // Replace the origin in page_url
  const newPageUrl = comment.page_url.replace(originString, localOrigin);
  
  // Recompute html_file_path (same logic as in server.js)
  const newHtmlFilePath = mapUrlToFilePath(newPageUrl);
  
  return {
    ...comment,
    page_url: newPageUrl,
    html_file_path: newHtmlFilePath,
    _imported: true,  // Flag for browser to use fuzzy matching
    _import_source: originString  // Track where it came from
  };
});
```

#### Step 6: Merge into comments.json

Merge new comments into `pointer/comments-skill/comments.json`:

```javascript
const localComments = JSON.parse(fs.readFileSync('pointer/comments-skill/comments.json', 'utf8'));
const merged = [...localComments, ...transformedComments];

// Deduplicate by ID (skip if ID already exists)
const deduped = Object.values(
  Object.fromEntries(merged.map(c => [c.id, c]))
);

fs.writeFileSync('pointer/comments-skill/comments.json', JSON.stringify(deduped, null, 2), 'utf8');
```

Report deduplication: "Skipped X duplicate comments (already imported)"

#### Step 7: Merge into pending-apply.json (same logic)

Merge pending comments into `pointer/comments-skill/pending-apply.json`:

```javascript
const localPending = JSON.parse(fs.readFileSync('pointer/comments-skill/pending-apply.json', 'utf8'));
const importedPending = transformedComments.filter(c => 
  c.status === 'pending-apply' || (c.replies && c.replies.some(r => r.status === 'pending-apply'))
);

const mergedPending = [...localPending, ...importedPending];
const dedupedPending = Object.values(
  Object.fromEntries(mergedPending.map(c => [c.id, c]))
);

fs.writeFileSync('pointer/comments-skill/pending-apply.json', JSON.stringify(dedupedPending, null, 2), 'utf8');
```

#### Step 8: Save new mappings

```javascript
fs.writeFileSync('pointer/comments-skill/url-mappings.json', JSON.stringify(currentMappings, null, 2), 'utf8');
```

#### Step 9: Cleanup

```bash
rm -rf pointer/comments-skill/import-staging/
rm -f pointer-export.zip
```

#### Step 10: Report success to user

```
✓ Merged {N} comments
  - Added X new comments
  - Skipped Y duplicates
  - Mapping: www.uimarkets.com → localhost:5000
  - Mapping: staging.api.com → localhost:3000 (new)

Next: Visit each page in your browser to see the merged pins.
Note: If a mapped comment's element no longer exists, you can place the pin manually.

⚠️ To apply these comments, say: "apply pending comments"
```

---

## Common Patterns (Apply Workflow)

| Request | Action |
|---------|--------|
| "Make this text bold" | Find the element's CSS rule, add `font-weight: bold;` |
| "Change color to blue" | Find the rule, change/add `color: blue;` |
| "Add 10px padding" | Find the rule, add/modify `padding: 10px;` |
| "Increase font size" | Find the rule, increase the `font-size` value |
| "Remove this element" | Delete the entire HTML element (remove from DOM) |
| "Fix typo: X → Y" | Find and replace text content in the element |

---

## Apply Type Modifiers

### `apply_to: "element-only"`
- Modify CSS rule for THIS specific element only
- Only elements in that rule's context are affected
- Example: `.field-box p` affects only `<p>` tags inside `.field-box`

### `apply_to: "all-similar"`
- User selected a pure CSS class selector (e.g., `.button`)
- Modify the global class rule
- **All elements with that class** are affected everywhere
- Higher impact, use carefully

---

## Handling Stale Selectors (Apply Workflow)

If `element_selector` doesn't work in the HTML:

1. Try using `element_snapshot` to find the element
2. Search by text content (if available)
3. If not found, tell user: "Comment ID {id} can't be found — the HTML may have changed since the comment was created"
4. **Do NOT proceed with other comments** — stop and report

---

## URL Mapping Structure

The `pointer/comments-skill/url-mappings.json` file stores groups of related URLs:

```json
[
  {
    "group_id": "uimarkets",
    "origins": ["https://www.uimarkets.com", "http://localhost:5000"],
    "local_origin": "http://localhost:5000",
    "created_at": "2026-06-26T10:00:00Z"
  },
  {
    "group_id": "staging_api",
    "origins": ["https://staging.api.com", "http://localhost:3000"],
    "local_origin": "http://localhost:3000",
    "created_at": "2026-06-26T11:30:00Z"
  }
]
```

Each group has:
- `group_id` — unique identifier
- `origins` — array of URLs that are considered equivalent
- `local_origin` — the local development URL
- `created_at` — when the mapping was created

When merging, if a new origin is found, ask user which local URL it should map to, then create/add to a group.

---

## Troubleshooting

### Apply Workflow Issues

**Q: What if multiple CSS rules apply to the element?**
A: The `applied_css_rules` array is ordered by specificity. **Always update the last rule** (highest specificity = what actually applies).

**Q: Should I create new CSS rules?**
A: NO. Always modify existing rules from `applied_css_rules`. Creating new rules with higher specificity is fragile and wrong.

**Q: What if the element doesn't exist anymore?**
A: Stop applying that comment. Report to user: "Element no longer exists in HTML for comment {id}"

### Merge Workflow Issues

**Q: What if the imported comments already exist locally (duplicate IDs)?**
A: Skip them during merge. Report: "Skipped X duplicate comments (already imported)"

**Q: What if a new origin isn't mapped?**
A: Stop and ask the user: "Found comments from {origin}. What local URL does this map to?"

**Q: What if imported comments have elements that don't exist locally?**
A: That's OK — merge them anyway. Browser will try fuzzy pin matching (due to `_imported: true` flag). If matching fails, user can manually place pins.

**Q: Should I apply comments after merging?**
A: NO, NEVER. Only merge when user says "merge comments". **Do NOT apply pending comments** — that's a separate action only when user explicitly says "apply pending comments". After merging, tell user: "Merged {N} comments. Comments are ready to apply when you're ready. To apply any pending comments, say: 'apply pending comments'"

**Q: Will merging change the status of comments?**
A: NO. Keep imported comments exactly as they are (preserve their status from the ZIP). Only update status during the APPLY workflow, never during merge.

---

## Decision Tree: Which Workflow?

```
User says...
│
├─ "apply pending comments" / "apply comments"
│  └─ → WORKFLOW 1: APPLY PENDING COMMENTS
│     • Read: pointer/comments-skill/pending-apply.json
│     • EDIT HTML files (apply CSS changes)
│     • UPDATE: pointer/comments-skill/comments.json (status → "applied")
│     • CLEAR: pointer/comments-skill/pending-apply.json
│     • Result: HTML files changed, comments marked ✓
│
├─ "merge comments" / "import team comments" / "import comments"
│  └─ → WORKFLOW 2: MERGE COMMENTS
│     • READ: ZIP or JSON with new comments
│     • MERGE: pointer/comments-skill/comments.json
│     • MERGE: pointer/comments-skill/pending-apply.json
│     • SAVE: pointer/comments-skill/url-mappings.json
│     • DO NOT: Edit HTML files
│     • DO NOT: Change comment status
│     • DO NOT: Apply pending comments
│     • DO NOT: Clear pending-apply.json
│     • Result: Comments imported, mappings saved, no HTML changed
│
└─ Anything else
   └─ Ask for clarification
```

---

## Example Conversation Flow

### Apply Workflow

```
User: "apply pending comments"

AI: Reading pointer/comments-skill/pending-apply.json...
    Found 3 pending comments.
    
    Applying changes:
    • test.html — Updated .main-section h1 (font-size: 24px)
    • test.html — Updated .button (color: blue)
    • about.html — Updated .title (font-weight: bold)
    
    ✓ Applied 3 comments to 2 HTML files
    
    Updating pointer/comments-skill/comments.json...
    Clearing pointer/comments-skill/pending-apply.json...
    
    Done! Refresh your browser to see the changes.
```

### Merge Workflow

```
User: "merge comments from my teammate"

AI: Looking for ZIP file...
    Found: pointer-export.zip
    
    Extracting to pointer/comments-skill/import-staging/...
    
    Analyzing imported comments:
    Found 12 comments from: www.uimarkets.com
    
    Checking pointer/comments-skill/url-mappings.json...
    This is a NEW origin (not mapped yet).
    
    Question: www.uimarkets.com corresponds to which local URL?
    (e.g., http://localhost:5000)

User: "localhost:5000"

AI: Saving mapping to pointer/comments-skill/url-mappings.json...
    ✓ Mapping saved: www.uimarkets.com → http://localhost:5000
    
    Transforming imported comments...
    Merging into pointer/comments-skill/comments.json...
    Merging into pointer/comments-skill/pending-apply.json...
    
    Cleaning up import-staging folder...
    
    ✓ Merged 12 comments
    - Added 12 new comments
    - Skipped 0 duplicates
    - Mapping saved: www.uimarkets.com → http://localhost:5000
    
    Visit the page in your browser to see the merged pins.
    Comments are ready to apply when you're ready.
    
    To apply any pending comments, say: "apply pending comments"
```

---

**For more details, see:**
- `comments-skill/CLAUDE_CODE_INTEGRATION.md` — Integration guide
- `comments-skill/server.js` — Backend implementation
- `comments-skill/config.json` — Configuration options
