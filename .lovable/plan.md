

## Plan: Refactor daily-recommendations to slot-based selection

### Single file change: `supabase/functions/daily-recommendations/index.ts`

### 1. Add `DAILY_SLOTS` constant (after imports)
5 fixed slots as specified by user, each with `name`, `category`, `includeKeywords`, `excludeKeywords`.

### 2. Add `selectProductForSlot` function
Shared function accepting `db`, `table`, `slot`, `salesColumn`, `recentDealIds`.

**3-step selection logic:**

- **Step 1**: Query 200 products from category with `commission_rate >= 0.15`, `out_of_stock = false`, `tracking_link IS NOT NULL`, ordered by `last_shown ASC NULLS FIRST`. Client-side filter: exclude recent deals (30d), exclude recently shown (7d), must match ≥1 includeKeyword, must not match any excludeKeyword. Score survivors: `(rating * 0.4) + (Math.log(sales+1) * 0.35) + (commission_rate * 0.25)`. Pick highest.

- **Step 2** (if step 1 empty): Same query but WITHOUT `last_shown` freshness filter — allows recently shown products. Same keyword filters and scoring.

- **Step 3 / Fallback** (if step 2 empty): Best product from category, no keyword filters at all. Just highest scored.

Each step logs: slot name, candidates count, which step triggered, selected product name.

Update `last_shown = now()` for the chosen product.

### 3. Rewrite `getIsraelRecommendations`
- Loop `DAILY_SLOTS`, call `selectProductForSlot` with table `aliexpress_feed_products`, salesColumn `sales_30d`
- Map results with Israel formatting (USD price, Hebrew name)

### 4. Rewrite `getThailandRecommendations`
- Same loop with table `feed_products`, salesColumn `sales_7d`
- Thailand formatting (THB price)

### 5. Update `sendRecommendations`
- Remove the bulk `last_shown` update at the end (now handled per-slot inside `selectProductForSlot`)

### What stays unchanged
- `sendMessage`, `sendPhoto` helpers
- `sendRecommendations` display/Telegram logic (minus the removed bulk update)
- `resetCategoryIfExhausted` helper
- `RecommendedProduct` interface
- `serve()` handler
- All other files

