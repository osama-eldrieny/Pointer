# 🎯 Pointer Workflows — Quick Entry Point

**When asking Claude to work with Pointer, tell Claude one of these commands:**

---

## Command 1: Apply Pending Comments

### When to use:
You've added comments in the browser UI and marked them as "Pending Apply". Now you want Claude to **apply the changes to your HTML files**.

### What to say:
```
apply pending comments
```

### What happens:
1. Claude reads `pointer/comments-skill/pending-apply.json`
2. Claude edits your HTML files with the requested CSS changes
3. Claude marks comments as "applied" in `pointer/comments-skill/comments.json`
4. **Result:** Your HTML files are updated ✓

### More info:
📖 See: [`comments-skill/SKILL.md`](./SKILL.md) → WORKFLOW 1️⃣: APPLY PENDING COMMENTS

---

## Command 2: Merge Comments

### When to use:
A teammate shared a ZIP file with comments from a different environment (dev, staging, production). You want Claude to **import their comments into your local project** and map URLs automatically.

### What to say:
```
merge comments
```

### What happens:
1. Claude finds the ZIP file (or asks you to provide one)
2. Claude extracts comments and asks: "Map `dev.company.com` to which local URL? (e.g., `localhost:5000`)"
3. You respond with your local URL
4. Claude merges the comments into `pointer/comments-skill/comments.json`
5. Claude saves the mapping for future imports
6. **Result:** Team comments imported, no HTML files changed yet ✓

### More info:
📖 See: [`comments-skill/SKILL.md`](./SKILL.md) → WORKFLOW 2️⃣: MERGE COMMENTS

---

## Quick Comparison

| Aspect | Apply | Merge |
|--------|-------|-------|
| **Trigger** | You have pending comments | Teammate shares ZIP |
| **Command** | `"apply pending comments"` | `"merge comments"` |
| **Claude edits HTML?** | ✅ YES | ❌ NO |
| **Changes comment status?** | ✅ YES (marks as applied) | ❌ NO (preserves status) |
| **Asks about URLs?** | ❌ NO | ✅ YES (for new origins) |
| **Saves mappings?** | ❌ NO | ✅ YES (for future imports) |
| **Files modified** | HTML + comments.json | comments.json + url-mappings.json |

---

## Full Documentation

**Root Level (Primary):**
- **SKILL.md** — Complete workflow guide (primary source)
- **WORKFLOWS.md** — This file (quick entry point)
- **README.md** — Full project documentation

**Technical Reference (in comments-skill/):**
- **comments-skill/QUICK_REFERENCE.md** — Quick lookup for common tasks
- **comments-skill/CLAUDE_CODE_INTEGRATION.md** — Detailed guide with extra examples
- **comments-skill/SKILL_SETUP.md** — Architecture and v2.0 features

---

## Need Help?

### "I want to apply changes from comments"
→ Read: **WORKFLOW 1** in `SKILL.md`  
→ Tell Claude: `"apply pending comments"`

### "I want to import comments from a teammate"
→ Read: **WORKFLOW 2** in `SKILL.md`  
→ Tell Claude: `"merge comments"`

### "I need quick reference for common tasks"
→ Read: `QUICK_REFERENCE.md`

### "I want detailed examples and explanations"
→ Read: `CLAUDE_CODE_INTEGRATION.md`

### "I want to understand the project architecture"
→ Read: `SKILL_SETUP.md`

---

**Pro tip:** Always work in the project root (`pointer/` folder) when using Claude Code. This ensures all workflows work correctly from any working directory.
