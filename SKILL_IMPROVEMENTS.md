# Pointer Skill Documentation Improvements

## What Was Fixed

The SKILL.md file has been **completely reorganized and expanded** to explicitly guide Claude on the two distinct workflows: **Apply Pending Comments** and **Merge Comments**.

### Before
- ✗ Workflows were mixed together
- ✗ Merge instructions were buried at the end
- ✗ Not enough detail on URL mapping decisions
- ✗ No clear indication that merge and apply are different
- ✗ Claude would ask for clarification before following the workflow

### After
- ✅ **Two clearly separated workflows** at the top with a quick reference table
- ✅ **Critical rule in red**: Do NOT apply during merge
- ✅ **Detailed step-by-step instructions** for each workflow
- ✅ **Decision tree** showing which workflow to use based on user input
- ✅ **URL mapping structure** documented with examples
- ✅ **Common patterns** and troubleshooting for each workflow
- ✅ **Example conversation flows** showing expected behavior

---

## WORKFLOW 1: Apply Pending Comments

When user says: `"apply pending comments"`

**Process:**
1. Read `pending-apply.json` (the work queue)
2. For each pending comment:
   - Find the HTML element
   - Read the requested change
   - Update the CSS rule (the ACTUAL rule, not new ones)
   - Save the HTML file
3. Update status in `comments.json`
4. Clear `pending-apply.json`

**Files modified:** HTML files, `comments.json`, `pending-apply.json`

---

## WORKFLOW 2: Merge Comments

When user says: `"merge comments"` or `"import team comments"`

**Process:**
1. Find/extract new comments (ZIP or JSON)
2. Identify unique URL origins
3. FOR EACH new origin:
   - Check if already mapped
   - If YES: use existing mapping
   - If NO: **ask user** for mapping
4. Transform comments with mapped URLs
5. Merge into `comments.json` and `pending-apply.json`
6. Save mappings to `url-mappings.json`
7. **Do NOT apply changes** (do NOT edit HTML files)

**Files modified:** `comments.json`, `pending-apply.json`, `url-mappings.json`  
**Files NOT modified:** HTML files

---

## Key Improvements

### 1. **Quick Reference Table**
Shows at a glance which workflow to use:
- "apply pending comments" → Workflow 1
- "merge comments" → Workflow 2

### 2. **Critical Rules (in red)**
```
🔴 NEVER apply pending comments during merge
🔴 ONLY merge comments, do NOT edit HTML files
🔴 ASK USER about new URL mappings before proceeding
```

### 3. **Detailed Merge Workflow**
- Step-by-step URL mapping decision tree
- Handles existing mappings (auto-use)
- Handles new mappings (ask user)
- Saves mappings for future imports
- Deduplication logic
- Cleanup instructions

### 4. **URL Mapping Structure**
Documents the exact JSON format in `url-mappings.json`:
```json
{
  "group_id": "uimarkets",
  "origins": ["https://www.uimarkets.com", "http://localhost:5000"],
  "local_origin": "http://localhost:5000",
  "created_at": "2026-06-26T10:00:00Z"
}
```

### 5. **Decision Tree**
Clear flowchart showing which workflow to use based on user input.

### 6. **Example Conversations**
Real examples of how Apply and Merge workflows should work:

```
User: "merge comments from my teammate"
AI: Found www.uimarkets.com
    Map to localhost:5000? → YES
    ✓ Merged 12 comments
    To apply: say "apply pending comments"
```

---

## For Claude Code to Understand

The new SKILL.md format makes it immediately clear which workflow to follow:

1. **At the top:** Quick reference table shows which trigger word = which workflow
2. **Workflow labels:** `## WORKFLOW 1️⃣:` and `## WORKFLOW 2️⃣:` make it obvious they're separate
3. **Critical rules:** Repeated emphasis that merge ≠ apply
4. **Decision tree:** Explicit logic for choosing workflows
5. **Example flows:** Shows expected behavior

Claude will now:
- Recognize "merge comments" vs "apply pending comments" immediately
- Follow the correct workflow without asking for confirmation
- Ask user about URL mappings during merge (not apply)
- NOT apply pending comments when merging
- NOT edit HTML files when merging

---

## How to Use

Tell Claude Code:
- `"apply pending comments"` → Claude runs Workflow 1
- `"merge comments"` → Claude runs Workflow 2
- No need to provide extra instructions — Claude will read this SKILL.md

Claude will ask for URL mappings when needed, handle ZIP extraction, deduplicate comments, and save all mappings for future use.

---

## Files Updated

- `.claude/skills/pointer/SKILL.md` — Completely reorganized and expanded (~500 lines → ~400 lines, much clearer)
