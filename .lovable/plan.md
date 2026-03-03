

## Plan: Campaign Import + Survey Categories + Smart Features

### Part 1: Campaign Import System

**New Edge Function: `supabase/functions/sync-campaigns-manual/index.ts`**
- Reuse the AliExpress API helpers (signature, `callAliExpressAPI`) from `sync-aliexpress-products`
- Call `featuredpromo.get` to list active campaigns
- Call `featuredpromo.products.get` to fetch products (pages 1-2, 50 each)
- Filter: products with `commission_rate` present, `evaluate_rate` >= 90% (≈ rating 4.5+)
- Upsert into `aliexpress_feed_products` with `is_campaign_product = true`
- Auto-generate affiliate links for products missing `promotion_link`
- Return summary: campaigns found, products imported, avg commission rate

**DB Migration:**
- Add `is_campaign_product BOOLEAN DEFAULT false` column to `aliexpress_feed_products`

**Config:** Add `[functions.sync-campaigns-manual] verify_jwt = false` to `supabase/config.toml`

**DinoChat.tsx changes:**
- Add intent detection: "ייבא קמפיינים" / "קמפיינים" / "campaigns" → new `sync_campaigns` flow
- Call the edge function via `supabase.functions.invoke("sync-campaigns-manual")`
- Show progress message, then report results

**dino-chat edge function:**
- Add `action: "sync_campaigns"` handler that proxies to `sync-campaigns-manual`

### Part 2: Survey Categories (Israel Daily Deals)

**Replace `ALIEXPRESS_CATEGORIES` constant in DinoChat.tsx:**

```typescript
const ALIEXPRESS_CATEGORIES = [
  { label: "🏠 גאדג׳טים ובית חכם", value: "gadgets_smart_home", filterValues: ["15", "44", "7", "202192403", "200003498"] },
  { label: "🧩 משחקים ופתרונות לילדים", value: "games_kids", filterValues: ["26", "200001393"] },
  { label: "⚡ מוצרי חשמל קטנים", value: "small_appliances", filterValues: ["44", "100007070"] },
  { label: "🏕️ ציוד לנסיעות וטיולים", value: "travel_outdoor", filterValues: ["18", "200003655"] },
  { label: "🚙 אביזרים לרכב ולאופנוע", value: "automotive", filterValues: ["34", "131"] },
  { label: "⭐ הנמכרים ביותר", value: "best", filterValues: "all" as const },
];
```

The exact `category_id` values will be cross-referenced with existing DB data to ensure matches.

### Part 3: Smart Features

**3A: Smart Coupon - "🔍 בדוק קופונים" button**
- In `handleProductSelect`, after selecting a product, add a button option: `{ label: "🔍 בדוק קופונים", value: "check_coupons" }`
- When clicked, opens the product's AliExpress page in a new tab (where coupons are displayed)
- No new DB table needed for MVP — just a UX shortcut

**3B: Campaign Health Traffic Light (in proactive alerts)**
- In `dino-chat/index.ts` `getProactiveAlerts`: query `aliexpress_feed_products` for `is_campaign_product = true` count
- 🟢 >= 50: "✅ מצב מעולה — X מוצרי קמפיין"
- 🟡 1-49: "⚠️ שים לב — רק X מוצרי קמפיין"
- 🔴 0: "❌ אין קמפיינים — הרץ ייבוא"

**3C: Daily Goal Tracking**
- In `DinoChat.tsx`, after opening chat, query `button_clicks` for today's entries with `button_type = 'deal_generated'`
- Display in alerts area: "📊 היום: X/2 דילים"
- If X >= 2: "🎉 יעד יומי הושלם!"
- Track deal generation by inserting a `button_clicks` record when `generate_deal` succeeds

### Files to Edit

| File | Changes |
|------|---------|
| **New:** `supabase/functions/sync-campaigns-manual/index.ts` | Campaign import edge function |
| `supabase/config.toml` | Add sync-campaigns-manual config |
| `supabase/functions/dino-chat/index.ts` | Add sync_campaigns action, campaign health alert, daily goal tracking |
| `src/components/DinoChat.tsx` | Survey categories, sync command, coupon button, daily goal display |
| **DB Migration** | Add `is_campaign_product` column to `aliexpress_feed_products` |

### Category ID Verification

Before finalizing the survey category mappings, I'll query the DB to verify which `category_id` values actually exist in `aliexpress_feed_products` to ensure the filter values produce results.

