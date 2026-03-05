

# Fix: Weekly Message — Skip Products Without Affiliate Links

**File:** `supabase/functions/telegram-bot-handler/index.ts`

## Current behavior (line 419)
Products are added to the list regardless of whether a link was found. The comment on line 422 says "show products from orders even without links."

## Changes

### 1. Only keep products WITH links (line 419)
Change the push to only add products that have a matching affiliate link:
```typescript
if (link) {
  productsWithLinks.push({ name: p.name, link });
}
```

### 2. Update the guard (lines 383-386)
Move the "no data" check to AFTER link matching (after line 420), since the relevant count is products-with-links, not just orders:
- After line 420, check `if (productsWithLinks.length === 0)` → show "אין מספיק נתונים"
- Remove or keep the existing early guard at line 383 (it still helps for zero orders)

### 3. Delete dead comment (line 422)
Remove `// No feed fallback — show products from orders even without links`

### 4. Lines 449-454 — no change needed
The loop already handles variable-length `productsWithLinks` correctly (1-3 items).

| Line | Change |
|------|--------|
| 419 | Wrap in `if (link)` |
| 420-422 | Add post-match guard for 0 links |
| 422 | Delete comment |

Single file edit, no DB changes.

