

## Problem Analysis

The `sync-campaigns-manual` function currently fetches Hot Products **globally** (no `category_ids` parameter), which returns only ~48 products on 1 page. Yesterday's 1,652 result came from a version that iterated over **AliExpress category IDs** — each category returns up to 50 products per page × multiple pages, multiplied across all categories.

The current code (lines 155-161):
```text
fetchProductsDynamic(
  'aliexpress.affiliate.hotproduct.query',
  { sort: 'LAST_VOLUME_DESC' },   // ← no category_ids!
  20 pages, 'Hot Products'
)
```

This fetches one global query that exhausts at page 1 with 48 items.

## Root Cause
The per-category iteration logic was never added to `sync-campaigns-manual`. The `aliexpress-api` and `sync-aliexpress-products` functions support `category_ids`, but the campaign sync doesn't use it.

## Fix Plan

**Modify `sync-campaigns-manual/index.ts`** — replace the single global Hot Products call with a per-category loop:

1. **Define AliExpress category IDs** — the main ones that map to the Hebrew categories:
   ```text
   const ALIEXPRESS_CATEGORY_IDS = [
     "44", "18", "21", "502", "2",    // Electronics, Sports, Toys, Phones, Cars
     "1503", "6", "15", "200003655",  // Home, Jewelry, Shoes, Tools
     "26", "200003498", "66", "7",    // Home Garden, Health, Bags, Computers
     "100003109", "322",              // Lighting, Security
   ]
   ```

2. **Loop over categories** — for each category ID, call `fetchProductsDynamic` with `category_ids: catId`, max 5 pages each (250 products per category). This yields ~15 categories × ~100-250 quality products = 1,500-3,750 total.

3. **Keep Featured Promo** as-is (it returns 0 currently but no harm).

4. **Merge & deduplicate** — same logic already exists.

5. **Add a timeout safeguard** — track elapsed time, stop after 120 seconds to stay within Edge Function limits.

### Code Changes (single file)

**`supabase/functions/sync-campaigns-manual/index.ts`**:
- Add `ALIEXPRESS_CATEGORY_IDS` array (~15 category IDs)
- Replace lines 155-161 (single `fetchProductsDynamic` for Hot Products) with a loop:
  ```
  for each categoryId:
    fetchProductsDynamic('hotproduct.query', { category_ids: categoryId, sort: 'LAST_VOLUME_DESC' }, maxPages: 5)
    merge into hotRaw
    break if elapsed > 120s
  ```
- Update summary to include per-category breakdown

No other files need changes. Dino and Telegram bot already call `sync-campaigns-manual` correctly.

