

## Raw Data Findings — Commission & Orders Debug

### TASK 3 Results (DB Verification) — Already Confirmed

```text
AVG(commission_rate) = 0.0719 (7.19%)
Commission distribution:
  0.09 → 20 products
  0.07 → 185 products
```

All 205 products are either 7% or 9%. No 13-16% as expected.

---

### TASK 1 Findings: Commission — ROOT CAUSE IDENTIFIED

I fetched a real product from AliExpress API (Toys category). Here is the **complete raw JSON** for commission-related fields:

```text
"commission_rate": "7.0%"
"hot_product_commission_rate": "8.0%"
```

That's it. **No `incentive_commission_rate` field exists in the response.** The field name was assumed but the API does not return it.

The real hidden field is **`hot_product_commission_rate`** — this is the bonus commission for hot products (8% in this case, total = 7% + 8% = 15%).

The current code does `product.incentive_commission_rate` which is always `undefined` → `0`.

Also: the `featuredpromo.get` API returns **only campaign names and product counts** — no commission rate per campaign. The commission info is per-product, embedded in the product response.

### TASK 2 Findings: Orders — ROOT CAUSE IDENTIFIED

The `order-list` API returns:
```json
{
  "resp_code": 407,
  "resp_msg": "The pattern of input params is invalid"
}
```

I tested with both default and explicit date params — same error. The issue is the **date format**. The current code sends `YYYY-MM-DD HH:MM:SS` but the AliExpress API expects dates as **epoch timestamps** (milliseconds) or a specific format. The `order.list` API for affiliates requires `start_time` and `end_time` as **strings in format `yyyy-MM-dd HH:mm:ss`** but crucially **without status filter for initial testing**, and **the tracking_id must match exactly**.

However, the more likely issue: `aliexpress.affiliate.order.list` may require **Advanced API** permissions which your Standard API account may not have. Error code 407 = "invalid input pattern" is a common obfuscated error when the API method is not authorized.

---

### Implementation Plan

#### Fix 1: Commission — Use `hot_product_commission_rate` (the real hidden field)

**File: `supabase/functions/sync-campaigns-manual/index.ts`**

Change the commission calculation from:
```javascript
const incentiveRate = product.incentive_commission_rate 
  ? parseFloat(String(product.incentive_commission_rate)) : 0
```
To:
```javascript
const hotRate = product.hot_product_commission_rate 
  ? parseFloat(String(product.hot_product_commission_rate).replace('%','')) : 0
```

Also fix `baseRate` parsing — the API returns `"7.0%"` as a string with `%`:
```javascript
const baseRate = product.commission_rate 
  ? parseFloat(String(product.commission_rate).replace('%','')) : 0
```

Total = `(baseRate + hotRate) / 100`

Expected result: products with `hot_product_commission_rate` will show 15% (7+8) instead of 7%.

#### Fix 2: Add permanent `debug-product` action to `aliexpress-api`

**File: `supabase/functions/aliexpress-api/index.ts`**

Add case `"debug-product"` that:
1. Fetches 1 hot product with `pageSize=1`
2. Returns the **complete raw product object** (all fields, no truncation)
3. Separately lists all fields containing "rate", "commission", "bonus", "incentive", "promotion"
4. Admin-only (no auth needed since `verify_jwt=false`, but only accessible via Dino)

#### Fix 3: Orders — Try without status filter + better error logging

**File: `supabase/functions/aliexpress-api/index.ts`**

In the `order-list` case:
1. Remove default `status` filter (`body.status` only if explicitly provided — don't default to `"payment_completed"`)
2. Log full request params + full response (not truncated) for debugging
3. Try alternative date format if 407 persists
4. Add clear error message: if resp_code=407, return `"Order List API may require Advanced API permissions"`

#### Fix 4: Re-run campaign sync after commission fix

Deploy → run `sync-campaigns-manual` → verify with:
```sql
SELECT commission_rate, COUNT(*) FROM aliexpress_feed_products 
WHERE is_campaign_product = true AND out_of_stock = false 
GROUP BY commission_rate ORDER BY commission_rate DESC;
```

Expected: mixed rates including 0.15 (15%) for hot products.

### Execution Order
1. Fix commission parsing in `sync-campaigns-manual` (hot_product_commission_rate + % strip)
2. Add `debug-product` action to `aliexpress-api` (permanent)
3. Fix `order-list` default status + error handling in `aliexpress-api`
4. Deploy all three functions
5. Run sync → validate commission rates
6. Test order-list → confirm if it's permissions or date format

