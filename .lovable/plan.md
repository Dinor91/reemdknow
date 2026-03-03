

## Phase 3: High Commission Support for AliExpress

### API Verification Results
- `featured-promo` API: **WORKS** - returns 151 active promo campaigns
- `hot-products` API: **WORKS** - returns `commission_rate` ("7.0%") and `hot_product_commission_rate` ("4.0%") per product
- DB `aliexpress_feed_products.commission_rate`: 198 products at 7%, 18 at 9%, 13 at 3%

### Changes

#### 1. DinoChat.tsx - Add High Commission Option to Israel Deal Flow

After platform "Israel" is selected in the deal flow, **before** showing categories, add a sorting prompt:

```
"🛒 מיון רגיל (לפי מכירות) או 🔥 עמלה גבוהה?"
```

Two buttons: `{ label: "🛒 רגיל", value: "normal" }` and `{ label: "🔥 עמלה גבוהה", value: "high_commission" }`

New state: `flowHighCommission: boolean` (default false)

**When high commission selected:**
- In `handleCategorySelect` for Israel, add `.gte('commission_rate', 0.09)` filter and `.order('commission_rate', { ascending: false })` 
- Show commission badge on product cards: `<Badge>עמלה {rate}%</Badge>`

**Intent detection addition:**
- Keywords "עמלה גבוהה" / "high commission" → start deal flow with `flowHighCommission = true` pre-set

#### 2. DinoChat.tsx - Commission Badge on Product Cards

In the product card rendering section, when `commission_rate` exists on a product, show a green badge: `🔥 {rate}%`

Add `commission_rate` to the `ProductItem` interface.

#### 3. DinoChat.tsx - Flow Changes

Modify `handlePlatformSelect`:
- If `activeFlow === "deal"` and `platform === "israel"` → show commission sorting prompt first
- If `platform === "thailand"` → go directly to categories (no commission data for Lazada)

New handler `handleCommissionChoice(choice)`:
- Sets `flowHighCommission` state
- Then calls `showCategoryPicker(platform)`

Modify `handleCategorySelect` for Israel path:
- If `flowHighCommission`: filter `commission_rate >= 0.09`, order by `commission_rate DESC` then `sales_30d DESC`
- Include `commission_rate` in the SELECT and map it to ProductItem

#### 4. Graceful Fallback

If high commission query returns 0 products → show message "לא נמצאו מוצרים עם עמלה גבוהה בקטגוריה הזו, מציג מוצרים רגילים..." and fall back to normal sort.

### Files to Edit
- `src/components/DinoChat.tsx` — add commission flow step, badge rendering, new state

### No Edge Function Changes Needed
Commission data already exists in `aliexpress_feed_products.commission_rate`. This is purely a client-side filtering/display change.

