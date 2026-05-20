## Scout Drafts Tab — UI/UX Overhaul

Refactor `src/components/admin/v2/ScoutDraftsTab.tsx` only. No DB, query, or approval-logic changes.

### 1. Time-Based Grouping
Bucket `visible` drafts by `created_at` (local time) into:
- **היום** (Today)
- **אתמול** (Yesterday)
- **השבוע** (last 7 days, excluding above)
- **ישן יותר** (Older)

Render each non-empty bucket as a section: sticky-ish header with the label + count badge, followed by its card grid. Keep current sort (newest first) within each bucket.

### 2. Compact Cards (default state)
Replace the current tall card with a compact horizontal layout:
- Square thumbnail (`image_url`, ~96–112px) on the right (RTL)
- Title (`product_name_hebrew` → fallback English), 2-line clamp
- One meta row: price (`$X.XX`), category badge (`category_name_hebrew`), platform badge (AE/Amazon)
- No `audit_notes`, no rating, no sales in compact view (keeps it dense)

### 3. Expand/Collapse `audit_notes`
- Per-card local `expanded` state (`useState<Record<string, boolean>>`)
- Toggle button: "הצג פוסט מלא" / "הסתר פוסט" with chevron icon
- When expanded: reveal a `whitespace-pre-wrap` block of the full `audit_notes` inside the card
- Disable button when `audit_notes` is empty

### 4. "צפה במוצר" Button
- New secondary button next to "אישור ושליחה"
- Icon: `ExternalLink` from lucide-react
- `onClick`: `window.open(d.tracking_link, "_blank", "noopener,noreferrer")`
- Disabled when `tracking_link` is missing
- Existing buttons preserved: Approve, Copy (WhatsApp — already returns raw `audit_notes`), Archive

### Layout
Action row order (RTL): `[אישור ושליחה] [צפה במוצר] [וואטסאפ] [ארכיון]` + the expand toggle on its own row above actions.

### Out of Scope
- No changes to `load()`, filters, KPI card, archive flow, `handleApprove`, `handleCopy`, or `post-scout-draft`.
- No schema or edge function changes.
- `formatForWhatsApp` remains unused (copy still pulls raw `audit_notes`).

### Files Touched
- `src/components/admin/v2/ScoutDraftsTab.tsx` (single-file refactor)
