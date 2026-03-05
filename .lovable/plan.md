

# Final Critical Fixes — Weekly Data Source + Events Categories

**Estimated credits: 1 (single file edit, no DB changes)**

## Fix 1: Weekly Message — Orders Only, No Feed Fallback

**Problem:** Lines 416-440 fill missing links with random feed products that the community never bought.

**Changes to `handleWeeklyPlatformMessage` (lines 344-489):**

1. **Expand time window if needed:** Query 7 days first. If < 3 products, expand to 30 days. If still < 3, show "אין מספיק נתונים השבוע".
2. **Remove feed fallback entirely** (delete lines 416-440). Only show products from actual orders.
3. **Link matching:** Keep progressive fuzzy match (lines 390-411) but if no link found for an order product, still include the product name without a link rather than substituting a random feed product.
4. **Relax the 3-link guard** (lines 442-447): Allow messages with 1-3 products. Only block if 0 products found.

## Fix 2: Events — Verify DISTINCT ON Category Works

**Problem:** The diversity logic (lines 576-584, 606-614) iterates sorted by `commission_rate DESC` and picks first per category. This works correctly IF categories are varied in the data. The real issue may be that most high-commission products share the same category.

**Change:** Also sort by `category_name_hebrew` as secondary sort to ensure the iteration encounters different categories early. Add a minimum commission threshold (e.g., `> 0.05`) to avoid zero-commission noise products.

## Summary

| Change | Lines | Action |
|--------|-------|--------|
| Weekly: add 30-day fallback window | 348-380 | Expand query if < 3 results |
| Weekly: remove feed product fallback | 416-440 | Delete entirely |
| Weekly: relax 3-link minimum | 442-447 | Allow 1+ products |
| Events: improve category diversity sort | 572, 603 | Add secondary sort |

**Single file:** `supabase/functions/telegram-bot-handler/index.ts`

