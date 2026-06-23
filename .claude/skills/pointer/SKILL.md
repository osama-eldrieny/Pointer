# Pointer Feedback Skill

Apply pending HTML comments using Claude Code.

## Quick Start

When a user tells you to "apply pending comments", follow this workflow:

```
1. Read comments-skill/pending-apply.json (the work queue)
2. For each comment: apply the change to the HTML file
3. Mark status as "applied" in comments.json
4. Done!
```

## The Workflow

### Step 1: Read the work queue
```javascript
const pending = JSON.parse(fs.readFileSync('./comments-skill/pending-apply.json', 'utf8'));
```

Each item contains:
- `id` — unique comment ID
- `html_file_path` — which HTML file to edit
- `element_selector` — CSS path to the element
- `element_snapshot` — HTML of the element
- `element_classes` — CSS classes on the element
- `applied_css_rules` — **which CSS rules are ACTUALLY styling this element**
- `text` — what change is requested
- `apply_to` — "element-only" or "all-similar"

### Step 2: Apply changes

For each comment:

1. **Find the element** using `element_selector` or `element_snapshot`
2. **Understand the request** from comment `text`
3. **Find the actual CSS rule** from `applied_css_rules` (this is critical!)
4. **Update that rule** in the HTML file's `<style>` tag
5. **Save the file**

### Step 3: Update comments.json

```javascript
// Find the comment in comments.json
const comment = allComments.find(c => c.id === appliedComment.id);
if (comment) {
  comment.status = 'applied';
  // Mark any replies as applied
  if (appliedComment.apply_reply_ids && appliedComment.apply_reply_ids.length > 0) {
    appliedComment.apply_reply_ids.forEach(replyId => {
      const reply = comment.replies.find(r => r.id === replyId);
      if (reply) reply.status = 'applied';
    });
  }
}
```

### Step 4: Clear the queue
```javascript
fs.writeFileSync('./comments-skill/pending-apply.json', '[]', 'utf8');
```

## Critical Rule: Update the ACTUAL CSS Rule

**🔴 ALWAYS update the CSS rule that's ACTUALLY styling the element (from `applied_css_rules`), NEVER create new element-specific selector rules.**

**Example:**
```html
<p class="section-label">Auth Types</p> in <div class="field-box">

Current CSS:
.section-label { font-size: 11px; margin: 0 0 18px 0; }
.field-box p { margin: 0; }  ← This one wins! (higher specificity)

Comment: "add 6px margin bottom"

❌ WRONG: Modify .section-label { margin: 0 0 24px 0; }
  → Doesn't work because .field-box p overrides it

✅ CORRECT: Modify .field-box p { margin: 0 0 6px 0; }
  → This is what's actually styling the element
```

## Apply Types

### `apply_to: "element-only"`
- Update the CSS rule that applies to this specific element
- Only elements in that rule's context are affected
- Example: `.field-box p` affects only `<p>` inside `.field-box`

### `apply_to: "all-similar"`
- User selected a pure CSS class selector
- Update the global class rule
- All elements with that class are affected

## Common Patterns

| Request | Action |
|---------|--------|
| "Make this text bold" | Find the element's CSS rule, add `font-weight: bold;` |
| "Change color to blue" | Find the rule, change/add `color: blue;` |
| "Add 10px padding" | Find the rule, add/modify `padding: 10px;` |
| "Increase font size" | Find the rule, increase the `font-size` value |
| "Remove this element" | Delete the entire HTML element |
| "Fix typo: X → Y" | Find and replace text content |

## Handle Stale Selectors

If the element selector no longer works:
1. Try using `element_snapshot` (the exact HTML) to find it
2. Search by text content
3. If still not found, tell the user the comment can't be applied to the current HTML

## Example Prompt for Users

Users can tell Claude Code:
```
apply pending comments
```

Claude will automatically read this skill and apply all pending comments.

## Troubleshooting

**Q: What if multiple rules apply to the element?**
A: Use `applied_css_rules` array — it's ordered by specificity. The last rule is what actually applies.

**Q: What if I'm not sure which rule to update?**
A: Check `applied_css_rules` in the comment data. Update the most specific rule that matches the parent context.

**Q: Should I add new CSS rules?**
A: No. Always update existing rules. Creating new rules with more specific selectors is wrong and won't work reliably.

---

**Need more details?** See `comments-skill/CLAUDE_CODE_INTEGRATION.md` in the Pointer repository.
