# Claude Code Integration Guide

This document explains how to use Claude Code to apply pending HTML comments automatically.

## The Flow

```
1. User marks comment as "Pending Apply" via bookmarklet UI
   ↓
2. Comment is automatically copied to pending-apply.json
   ↓
3. User opens Claude Code and says: "apply pending comments"
   ↓
4. Claude reads pending-apply.json (the work queue)
   ↓
5. Claude applies each change to the HTML files on disk
   ↓
6. Claude updates comments.json with AI reply and removes from pending-apply.json
   ↓
7. User refreshes browser, sees changes live + green ✓ badges
```

## 🔑 Key Design Principle

**`pending-apply.json` is the single source of truth — completely self-contained.**

When applying pending comments:
- ✅ Read ONLY `pending-apply.json` — it has everything you need
- ✅ Full conversation history is included in the `replies` array for context
- ✅ All metadata (selectors, snapshots, etc.) is present
- ❌ Do NOT need to check `comments.json` while applying
- ❌ Do NOT need to cross-reference multiple files

After applying:
- Update `comments.json` with the results (mark as applied)
- Server auto-removes from `pending-apply.json`

This design prevents confusion and ensures the AI always has complete context.

## Example Prompt for Claude Code

Copy and paste this into Claude Code when you're ready to apply comments:

---

### Prompt Template

```
I'm using an HTML comments skill. Pending changes are in `pointer/comments-skill/pending-apply.json`.

**🔴 SACRED RULE: ALWAYS update the actual CSS rule that styles the element. NEVER create new element-specific selector rules.**

Why: The CSS rule identified in `applied_css_rules` is what's ACTUALLY styling the element. Update it directly.

The comment metadata includes element context:
- `element_selector`: CSS path to the element (e.g., `body > div > div:nth-of-type(2) > p`)
- `element_snapshot`: HTML of that element (e.g., `<p class="section-label">Auth Types</p>`)
- `element_classes`: CSS classes on it
- `parent_element_info`: Parent tag, classes, id (e.g., parent is `<div class="field-box">`)
- `computed_styles`: Current styles on the element
- `applied_css_rules`: **IMPORTANT** - Which CSS rules are ACTUALLY applying to this element
- `apply_to`: "element-only" = update rule for this element | "all-similar" = update rule for all with class

**WORKFLOW: Element + Comment → Understand → Update**

For each comment:
1. **Combine two inputs:**
   - Element metadata (selector, classes, parent, `applied_css_rules`)
   - Change request (comment `text` + `apply_to` field)

2. **Understand what's being asked:**
   - Analyze element: which CSS rule is ACTUALLY styling it? (from `applied_css_rules`)
   - Analyze request: what CSS property needs to change? (from `text`)

3. **Update the correct rule and save**

**If apply_to is "element-only":**

1. **Find the ACTUAL CSS rule** from `applied_css_rules`:
   - Don't assume from element's classes alone
   - Example: Element `<p class="section-label">` may appear to be styled by `.section-label` rule
   - But `applied_css_rules` shows `.field-box p { margin: 0; }` is what's actually applied (higher specificity)
   
2. **Interpret the change** from comment text:
   - "add 6px margin bottom" → change margin property to 6px
   - "change color to blue" → change color property
   - "increase font size" → increase font-size value

3. **🔴 CRITICAL: ALWAYS UPDATE THE ACTUAL CSS RULE - NEVER create element-specific selector rules:**
   - Find the existing CSS rule from `applied_css_rules`
   - Update THAT rule, nothing else
   - Find: `.field-box p { margin: 0 0 18px 0; }`
   - Change to: `.field-box p { margin: 0 }`
   - Save the HTML file
   
   **❌ WRONG:** Create `body > div > div > div:nth-of-type(3) > p { margin: 0 }`
   **✅ CORRECT:** Update `.field-box p { margin: 0 }`

4. **Parent context naturally limits scope:**
   - `.field-box p` already targets only `<p>` inside `.field-box`
   - Multiple elements sharing that rule get consistent changes
   - That's CORRECT behavior

**If apply_to is "all-similar":**
- User selected a pure CSS class
- Modify the global class rule
- This affects all elements with that class

**CRITICAL EXAMPLE:**

**Element**: `<p class="section-label">Auth Types</p>` in `<div class="field-box">`

**Current CSS:**
```css
.section-label { font-size: 11px; margin: 0 0 18px 0; }
.field-box p { margin: 0; }  /* ← This is what actually applies! */
```

**Comment**: "add 6px margin bottom"

**WRONG approach:** Modify `.section-label` rule
- Result: `.section-label { margin: 0 0 24px 0; }`
- Problem: The `.field-box p` rule overrides it, so change doesn't apply!

**CORRECT approach:** Modify the actual rule that applies
- Find: `.field-box p { margin: 0; }`
- Update to: `.field-box p { margin: 0 0 6px 0; }`
- Result: The element now has 6px margin-bottom as expected!

**Steps:**

1. Read `pointer/comments-skill/pending-apply.json`
2. **For each comment, follow this workflow:**

   **STEP A: Extract Element Information**
   - `element_selector` - the specific path to this element
   - `element_snapshot` - exact HTML of this element
   - `element_classes` - CSS classes on this element
   - `parent_element_info` - parent element's tag, classes, id
   - `applied_css_rules` - **which CSS rules are currently styling this element** (CRITICAL)
   
   **STEP B: Extract Change Request**
   - `text` - what does user want to change?
   - `apply_to` - "element-only" or "all-similar"?
   
   **STEP C: Analyze the Element**
   - Study `applied_css_rules` array to find which rule is ACTUALLY responsible for current styling
   - This is the most important step!
   - Example: Element may have class `.section-label` BUT be styled by `.field-box p` rule instead
   - The `applied_css_rules` array shows you which rule wins (has highest specificity)
   
   **STEP D: Interpret the Change**
   - Read comment text and understand what CSS property needs to change
   - Example: "add 6px margin bottom" → add margin-bottom property
   - Example: "change color to red" → update color property
   - Example: "make it bold" → set font-weight
   
   **STEP E: Update the Correct Rule**
   - Find the CSS rule from STEP C in the `<style>` tag
   - Modify THAT rule to apply the change
   - Save the HTML file
   
   **STEP F: Update Comment in comments.json**
   - Set status to "applied"
   
3. Remove from `pending-apply.json`
4. **Report the change**: "Updated `.field-box p` rule: changed margin from `0` to `0 0 6px 0`"
```

---

## Example: Applying a Real Comment

### Scenario: User clicks "Auth Types" label in connector card's Identity section

The element is: `<p class="section-label">Auth Types</p>` inside `<div class="field-box">`

### Step 1: User marks comment for apply

The comment in `pending-apply.json` includes:

```json
{
  "id": "c_1781540135907_n6ys5p",
  "element_selector": "body > div > div > div > div > div:nth-of-type(2) > div > div:nth-of-type(3) > p",
  "element_snapshot": "<p class=\"section-label\">Auth Types</p>",
  "element_classes": ["section-label"],
  "parent_element_info": {
    "tag": "div",
    "classes": ["field-box"],
    "id": null
  },
  "computed_styles": {
    "margin": "0px 0px 0px 0px",
    "font-size": "11px"
  },
  "applied_css_rules": [
    {
      "selector": ".section-label",
      "styles": "font-size: 11px; margin: 0 0 18px 0;"
    },
    {
      "selector": ".field-box p",
      "styles": "margin: 0;"
    }
  ],
  "text": "add extra 6px margin bottom",
  "apply_to": "element-only"
}
```

### Step 2: Claude Code reads and applies

Claude:
1. Reads `../Integration_Cards_Complete1.html`
2. Sees `apply_to: "element-only"` → apply to this specific element only
3. **Reads `applied_css_rules`** → TWO rules apply:
   - `.section-label { margin: 0 0 18px 0; }`
   - `.field-box p { margin: 0; }` ← **This one wins!** (more specific)
4. Reads `parent_element_info` → element is inside `.field-box`
5. Identifies that `.field-box p` is the actual rule styling the element
6. Interprets comment: "add 6px margin bottom" 
7. **Updates the actual rule**:
   ```css
   .field-box p { margin: 0 0 6px 0; }
   ```
   - This is the rule that actually applies to the element
   - Other `.field-box p` elements get this change too (they're similar in context)
   - Elements outside `.field-box` are not affected
8. Saves the HTML file
9. Sets status to "applied"

### Step 3: Result in comments.json

```json
{
  "id": "c_1781540135907_n6ys5p",
  "element_snapshot": "<p class=\"section-label\">Auth Types</p>",
  "text": "add extra 6px margin bottom",
  "status": "applied",
  "apply_to": "element-only",
  "replies": []
}
```

**The Difference:**
- ❌ Wrong: Create specific element rule → doesn't help because parent rule overrides it
- ✅ Correct: Find and update the actual rule that applies → change takes effect immediately

### Step 4: User sees the result

1. User refreshes browser on `http://localhost:8080/index.html`
2. Clicks the bookmarklet
3. Sidebar shows the comment with:
   - Green ✓ "Applied" badge
4. HTML page now has the new styles applied
5. User can export the updated HTML

---

## Handling Edge Cases

### When Element Selector is Stale

If the HTML has changed and the selector no longer works:

1. Claude tries the selector first: `document.querySelector(selector)`
2. If not found, Claude searches for the element by snapshot: `outerHTML === element_snapshot`
3. If still not found, Claude searches by text content
4. If none work: the comment stays visible in sidebar but won't apply

You can edit the comment or delete it and re-add it on the current element.

### Multiple Pending Comments on Same Element

Example:
- Comment 1: "Make this text bold"
- Comment 2: "Change color to blue"

Claude reads them in order and applies both to the same element sequentially.

### Comments Requesting Conflicting Changes

Example:
- Comment 1: "Make font size 16px"
- Comment 2: "Make font size 20px"

Claude should apply the last one. Typically the last marked-for-apply takes precedence.

---

## Claude Code Workflow in Detail

### 1. Read pending-apply.json
```javascript
// Pseudo-code
const fs = require('fs');
const pending = JSON.parse(fs.readFileSync('pointer/comments-skill/pending-apply.json', 'utf8'));
// That's it! All items in this file are ready to process
```

### 2. Group by HTML file (optional, for efficiency)
```javascript
const byFile = {};
pending.forEach(c => {
  if (!byFile[c.html_file_path]) byFile[c.html_file_path] = [];
  byFile[c.html_file_path].push(c);
});
```

### 3. Apply to each file
```javascript
Object.entries(byFile).forEach(([filePath, commentsForFile]) => {
  let html = fs.readFileSync(filePath, 'utf8');
  
  commentsForFile.forEach(comment => {
    // Get the element's CSS classes
    const elementClasses = comment.element_classes || [];
    
    // Parse HTML to modify CSS rules
    const DOM = new JSDOM(html);
    const doc = DOM.window.document;
    
    // Find and modify the <style> tag
    const styleTag = doc.querySelector('style');
    if (styleTag && elementClasses.length > 0) {
      let cssText = styleTag.textContent;
      
      // For each CSS class the element has, find and modify the rule
      elementClasses.forEach(className => {
        const classSelector = `.${className}`;
        // This is simplified - you'll need more robust CSS parsing for complex rules
        // Look for the rule and update it based on comment.text
        // Example: if comment says "add margin-bottom: 40px"
        // Find the rule: `.section-label { ... }` and add the style
        cssText = updateCSSRule(cssText, classSelector, comment.text);
      });
      
      styleTag.textContent = cssText;
      html = DOM.serialize();
    }
    
    // Update comment status
    comment.status = 'applied';
  });
  
  // Write updated HTML
  fs.writeFileSync(filePath, html, 'utf8');
});

// 4. Update comments.json and remove from pending-apply.json
const allComments = JSON.parse(fs.readFileSync('pointer/comments-skill/comments.json', 'utf8'));
pending.forEach(appliedComment => {
  const commentInFile = allComments.find(c => c.id === appliedComment.id);
  if (commentInFile) {
    commentInFile.status = 'applied';
  }
});
fs.writeFileSync('pointer/comments-skill/comments.json', JSON.stringify(allComments, null, 2), 'utf8');
fs.writeFileSync('pointer/comments-skill/pending-apply.json', '[]', 'utf8'); // Clear the queue
```

### 4. Efficiency Notes

Since `pending-apply.json` only contains items to process, you don't need to filter. Just read, process, and clear. Much simpler!

---

## Natural Language Interpretation

Claude needs to interpret plain English comments into actual HTML changes:

| Comment | Interpretation |
|---------|---|
| "Change font to Inter" | `style="font-family: 'Inter, sans-serif'"` |
| "Make it larger" | increase `font-size` by ~20% or from implicit to explicit |
| "Make the button red" | `style="background-color: red"` or `class="btn-red"` |
| "Fix typo: 'Welcom' → 'Welcome'" | find and replace text content |
| "Center this text" | `style="text-align: center"` |
| "Remove this element" | delete the entire tag |
| "Add padding" | `style="padding: 20px"` (or increase existing) |

Claude is good at this kind of interpretation, but for best results, comments should be:
- **Specific**: "Change color to #007bff" (better than "make it blue")
- **Contextual**: "Change the hero heading font to Inter" (better than "Change font")
- **Actionable**: "Increase button padding from 10px to 15px" (better than "Make button bigger")

---

## Testing Your Integration

### Test 1: Simple Text Change

1. Create a test comment: "Change the word 'Welcome' to 'Hello'"
2. Mark it as pending-apply
3. Tell Claude: "apply pending comments"
4. Claude should find the element and replace "Welcome" with "Hello"
5. Refresh browser → see change live

### Test 2: Style Change

1. Create a test comment: "Change the header background color to #f0f0f0"
2. Mark it as pending-apply
3. Tell Claude: "apply pending comments"
4. Claude should add or modify the `style` attribute to include `background-color: #f0f0f0`
5. Refresh browser → see change live

### Test 3: Multiple Comments

1. Add three different comments on different elements
2. Mark all as pending-apply
3. Tell Claude: "apply pending comments"
4. Claude should apply all three and show three AI replies

---

## Tips for Success

### Do:
- ✅ Be specific about what to change
- ✅ Reference the element clearly (e.g., "the hero title" not just "text")
- ✅ Tell Claude exactly what you want ("Change X to Y")
- ✅ Let Claude ask questions if it's unclear

### Don't:
- ❌ Assume Claude knows which element you mean if there are multiple similar ones
- ❌ Use vague terms ("make it better", "fix it")
- ❌ Ask for complex refactoring in a comment (use chat for that)

### If Claude Gets Stuck:
- Clarify the element in a reply on the comment
- Delete and re-comment with more specific wording
- Use Claude Code chat to discuss the change first, then mark for apply

---

## WORKFLOW 2: MERGE COMMENTS (Team Sync)

When a teammate shares comments from another environment (production, dev, staging), you need to merge them into your local project.

### Merge Workflow Overview

```
Teammate on dev.company.com adds comments
  ↓
Teammate clicks "Export ZIP" in bookmarklet
  ↓
Teammate shares ZIP with you
  ↓
You tell Claude: "merge comments"
  ↓
Claude extracts ZIP, asks about URL mapping
  ↓
Claude merges comments into your local storage
  ↓
Visit your local page in browser → see merged pins
```

### Critical Rules for Merge

🔴 **NEVER:**
- Edit HTML files during merge
- Change comment status
- Apply pending comments
- Clear pending-apply.json

✅ **ALWAYS:**
- Ask user about URL mappings for new origins
- Save mappings for future imports (persistent)
- Deduplicate by comment ID (skip if already imported)
- Preserve original comment status from ZIP

### Merge Workflow Steps

#### Step 1: Find and Extract ZIP

```bash
find . -maxdepth 2 -name "*.zip" -o -name "pointer-export.zip" | head -1
```

If found:
```bash
unzip pointer-export.zip -d pointer/comments-skill/import-staging/
```

#### Step 2: Read Imported Comments and Mappings

```javascript
const importedComments = JSON.parse(
  fs.readFileSync('pointer/comments-skill/import-staging/comments.json', 'utf8')
);
const currentMappings = JSON.parse(
  fs.readFileSync('pointer/comments-skill/url-mappings.json', 'utf8')
);
```

#### Step 3: Identify Unique Origins

```javascript
const uniqueOrigins = [...new Set(importedComments.map(c => {
  const url = new URL(c.page_url);
  return `${url.protocol}//${url.host}`;  // e.g., "https://www.uimarkets.com"
}))];
```

#### Step 4: Map Each Origin (Ask User if New)

**For each unique origin:**

```javascript
const mapping = currentMappings.find(group => 
  group.origins.includes(origin)
);

if (!mapping) {
  // NEW origin — ASK USER
  // "Found comments from https://www.uimarkets.com. 
  //  Map to which local URL? (e.g., http://localhost:5000)"
  // User responds with local URL
  // Save to url-mappings.json
}
```

#### Step 5: Transform Comments with Mapped URLs

```javascript
const transformedComments = importedComments.map(comment => {
  const commentOrigin = new URL(comment.page_url);
  const originString = `${commentOrigin.protocol}//${commentOrigin.host}`;
  
  const mapping = currentMappings.find(group => 
    group.origins.includes(originString)
  );
  
  const localOrigin = mapping.local_origin;
  const newPageUrl = comment.page_url.replace(originString, localOrigin);
  
  return {
    ...comment,
    page_url: newPageUrl,
    _imported: true,
    _import_source: originString
  };
});
```

#### Step 6-7: Merge into Storage Files

```javascript
// Merge into comments.json
const localComments = JSON.parse(
  fs.readFileSync('pointer/comments-skill/comments.json', 'utf8')
);
const merged = [...localComments, ...transformedComments];
const deduped = Object.values(
  Object.fromEntries(merged.map(c => [c.id, c]))
);
fs.writeFileSync(
  'pointer/comments-skill/comments.json',
  JSON.stringify(deduped, null, 2),
  'utf8'
);

// Merge into pending-apply.json (same logic)
const localPending = JSON.parse(
  fs.readFileSync('pointer/comments-skill/pending-apply.json', 'utf8')
);
const importedPending = transformedComments.filter(c => 
  c.status === 'pending-apply' || 
  (c.replies && c.replies.some(r => r.status === 'pending-apply'))
);
const mergedPending = [...localPending, ...importedPending];
const dedupedPending = Object.values(
  Object.fromEntries(mergedPending.map(c => [c.id, c]))
);
fs.writeFileSync(
  'pointer/comments-skill/pending-apply.json',
  JSON.stringify(dedupedPending, null, 2),
  'utf8'
);
```

#### Step 8: Save New Mappings

```javascript
fs.writeFileSync(
  'pointer/comments-skill/url-mappings.json',
  JSON.stringify(currentMappings, null, 2),
  'utf8'
);
```

#### Step 9: Cleanup

```bash
rm -rf pointer/comments-skill/import-staging/
rm -f pointer-export.zip
```

#### Step 10: Report Success

```
✓ Merged 12 comments
  - Added 12 new comments
  - Skipped 0 duplicates
  - Mapping: www.uimarkets.com → localhost:5000
  
Visit your local page to see the merged pins.
To apply any pending comments, say: "apply pending comments"
```

---

### Merge Workflow Example

**Scenario:** Teammate from dev team sends ZIP with 8 comments from `https://dev.company.com`

**User input:** "merge comments"

**Execution:**
1. Claude finds `pointer-export.zip`
2. Extracts to `pointer/comments-skill/import-staging/`
3. Reads 8 comments from `https://dev.company.com/dashboard`
4. Checks `pointer/comments-skill/url-mappings.json` → not found (first import from this origin)
5. **Asks user:** "Found 8 comments from https://dev.company.com. Map to which local URL?"
6. User responds: "http://localhost:3000"
7. Creates mapping:
```json
{
  "group_id": "dev_company",
  "origins": ["https://dev.company.com", "http://localhost:3000"],
  "local_origin": "http://localhost:3000",
  "created_at": "2026-06-26T15:30:00Z"
}
```
8. Transforms each comment: `https://dev.company.com/dashboard` → `http://localhost:3000/dashboard`
9. Merges into `pointer/comments-skill/comments.json`
10. Cleans up, reports success

**Next time:** Teammate sends more comments from same origin → mapping auto-applies, no questions asked

---

## FAQ

### Apply Workflow Questions

**Q: Can Claude apply comments to multiple HTML files?**
A: Yes! Each comment has `html_file_path`. Claude will read/edit multiple files as needed.

**Q: What if the HTML file doesn't exist?**
A: Claude should report an error. Check that `html_file_path` is correct relative to the project root.

**Q: Can I undo an applied comment?**
A: Technically, but there's no automatic undo. You'd need to:
1. Change comment status back to "pending-apply"
2. Have Claude revert the change
Or manually edit the HTML back.

Better practice: use a new comment if you need a different change.

**Q: Do comments persist after applying?**
A: Yes! Comments stay in `comments.json` with status "applied" and the AI reply. This creates a history of all changes made.

**Q: Can multiple people apply comments?**
A: Each time someone tells Claude to apply, it reads the current state of `comments.json`. As long as you're taking turns or working on different files, it should be fine. For concurrent work, coordinate who's applying when.

### Merge Workflow Questions

**Q: What is the merge workflow?**
A: When teammates work on different environments (dev, staging, production), they can export comments as ZIP. You import their ZIP, and Claude merges the comments into your local project while mapping URLs appropriately.

**Q: How does URL mapping work?**
A: When merging comments from a new origin (e.g., `https://dev.company.com`), Claude asks: "What local URL does this map to?" You respond (e.g., `http://localhost:3000`), and Claude saves this mapping. Next import from same origin auto-applies without asking.

**Q: What happens to duplicate comments?**
A: Comments are deduplicated by ID. If a comment with the same ID already exists locally, it's skipped. This prevents duplicates when re-importing.

**Q: Should I apply comments immediately after merging?**
A: No! Merge and Apply are separate actions. After merging, review comments in your browser first. Apply only when ready by saying "apply pending comments".

**Q: Will merged comments change my local HTML?**
A: No! Merging ONLY imports comments into storage. It does NOT edit HTML files. Only the Apply workflow edits HTML.

**Q: What if merged comments reference elements that don't exist locally?**
A: That's OK. Comments are stored with their selectors. If the element doesn't exist, the pin won't appear on the page, but the comment remains for reference. You can manually place the pin or update the element.

**Q: Can I merge from multiple teammates?**
A: Yes! Each teammate's ZIP can be merged independently. As long as their origins are mapped to your local URLs, comments will merge correctly.

---

## Example: Full Workflow Transcript

```
[User in Claude Code]
"Apply pending comments"

[Claude]
"I'll apply the pending comments from your HTML comments skill. Let me read the comments file first."
[Claude reads pointer/comments-skill/comments.json]

"Found 2 pending comments:
1. On index.html: 'Change header font to Inter'
2. On index.html: 'Make button red'

Let me apply these..."

[Claude edits index.html using the Edit tool]

"Applied both comments! Here's what changed:
- Added font-family: 'Inter, sans-serif' to the h1 element with id='header'
- Changed the button's background color to red

Updated comments.json with AI replies and marked both as 'applied'.
You can refresh your browser and click the bookmarklet to see the changes."

[User refreshes browser]
"✓ Comments show as applied with green badges and AI replies!"
```

---

## Next Steps

1. Create a test comment on your test.html
2. Mark it as "Pending Apply"
3. Open Claude Code and use the prompt from this guide
4. Watch Claude apply the change
5. Refresh your browser to see the result live

Enjoy faster feedback loops! 🚀
