

## Plan: Update DAILY_SLOTS keywords in daily-recommendations

### Findings
The `matchesKeywords` function (lines 101-108) uses `productName.toLowerCase().includes(kw.toLowerCase())` — correct case-insensitive substring matching. No changes needed there.

### Changes
**File:** `supabase/functions/daily-recommendations/index.ts`

Replace the `DAILY_SLOTS` constant (lines 22-57) with the new expanded keyword lists provided by the user. The 5 slots remain the same categories but with much more specific and comprehensive `includeKeywords` and `excludeKeywords` to improve product relevance.

### Post-deploy
Run `daily-recommendations` manually and share the full log including which step (1/2/fallback) was triggered per slot.

