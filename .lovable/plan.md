

# Phase 1: High Commission Filter in Telegram Bot

## Current Flow
`/deal` → Platform selection (Israel/Thailand) → Categories → Products → Generate deal message

## Changes to `supabase/functions/telegram-bot-handler/index.ts`

### 1. Add "🔥 עמלה גבוהה" button to platform selection (line 337-343)
After choosing Israel or Thailand, add a third row with the high commission button:
```
[🇮🇱 ישראל] [🇹🇭 תאילנד]
[🔥 עמלה גבוהה ישראל] [🔥 עמלה גבוהה תאילנד]
```
Using callback data: `deal_platform:israel_hc` and `deal_platform:thailand_hc`

### 2. New handler: `handleDealPlatformHighCommission` 
- **Israel** (`aliexpress_feed_products`): Filter `is_campaign_product = TRUE AND commission_rate >= 0.15`
- **Thailand** (`feed_products`): Filter `commission_rate >= 0.15 AND out_of_stock = FALSE`
- Group by `category_name_hebrew`, count per category
- Display as buttons: `🏠 בית (45)`

### 3. New handler: `handleDealCategoryHighCommission`
- Same as `handleDealCategory` but with the high commission filter applied
- Show commission rate next to each product: `💰 ฿299 | 🔥 18% עמלה`
- Uses callback prefix `deal_hc_cat:` to distinguish from regular categories

### 4. Route new callbacks (lines 647-653)
- `deal_platform:israel_hc` / `deal_platform:thailand_hc` → `handleDealPlatformHighCommission`
- `deal_hc_cat:israel:קטגוריה` / `deal_hc_cat:thailand:קטגוריה` → `handleDealCategoryHighCommission`
- Product generation reuses existing `handleDealGenerate` (no change needed)

### Flow After Change
```text
/deal → Platform selection (with HC buttons)
  ├─ 🇮🇱 ישראל → regular categories → products
  ├─ 🇹🇭 תאילנד → regular categories → products  
  ├─ 🔥 עמלה גבוהה 🇮🇱 → HC categories (with counts) → HC products (with % commission)
  └─ 🔥 עמלה גבוהה 🇹🇭 → HC categories (with counts) → HC products (with % commission)
```

**Single file change**: `supabase/functions/telegram-bot-handler/index.ts`

