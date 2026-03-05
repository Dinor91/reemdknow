

# Feature: Weekly Message from `deals_sent` Table

## Overview

Replace the broken fuzzy-match weekly message system with a new `deals_sent` table that logs every deal generated via `/deal`. The weekly message (`/weekly`) will then pull from this table instead of trying to match order names to feed products.

## Step 1: Create `deals_sent` table (DB migration)

```sql
CREATE TABLE public.deals_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text,
  product_name text,
  product_name_hebrew text,
  platform text NOT NULL,
  category text,
  affiliate_url text,
  commission_rate numeric,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.deals_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on deals_sent"
  ON public.deals_sent FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read deals_sent"
  ON public.deals_sent FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
```

## Step 2: Save to `deals_sent` on deal generation

In `handleDealGenerate` (line 1083-1093), after the deal message is successfully generated and sent, insert a row:

```typescript
// After line 1093 (after sendMessage with the final deal)
await serviceClient.from("deals_sent").insert({
  product_id: productId,
  product_name: product.name,
  product_name_hebrew: product.name, // already Hebrew from getProductDisplayName
  platform: product.url?.includes("lazada") ? "thailand" : "israel",
  category: product.category,
  affiliate_url: product.url,
  commission_rate: product.commission_rate || null,
});
```

Need to also get `commission_rate` into the product object in `handleDealGenerate`. Currently it's missing for israel/aliexpress products. Will add it from the source queries (lines 1008-1045).

## Step 3: Rewrite `handleWeeklyPlatformMessage` (lines 344-469)

Replace the entire function with new logic:

1. **Data source:** Query `deals_sent` for the selected platform, last 7 days. If < 3 results, expand to 30 days.
2. **Diversity logic** with category groups:
   - Group 1 (kids): `ילדים`, `תינוקות`, `צעצועים`
   - Group 2 (gadgets): `גאדג'טים`, `אלקטרוניקה`, `אביזרי טלפון`, `כבלים ושעונים חכמים`
   - Group 3 (home): `בית`, `מטבח`, `ניקיון`, `ארגון`, `בית חכם`
3. **Selection:** Pick 1 most recent deal from each group. If a group has no deals, skip. Fill remaining slots (up to 3) with highest commission deals from remaining.
4. **Fallback:** If 0 deals found → "לא פורסמו דילים השבוע - צור דיל עם /deal"
5. **Message format:** Same template as current, with title rotation: הלהיט / הכי נמכר / הפתעת השבוע
6. **Links:** Use `affiliate_url` directly from `deals_sent` — no fuzzy matching needed

## Step 4: Add `commission_rate` to `handleDealGenerate` product object

Lines 1010-1018 (israel_editor_products) — add `commission_rate: null` (already there, but also check aliexpress_feed_products at 1034-1043 — add `commission_rate: aliProduct.commission_rate`).

Actually looking at the code, aliProduct already has `commission_rate` but it's not passed to the product object. Fix line 1035-1043 to include it.

## Changes Summary

| What | Where | Action |
|------|-------|--------|
| `deals_sent` table | DB migration | Create table + RLS |
| Save deal on generation | `handleDealGenerate` line 1093 | Insert after successful send |
| Add commission_rate | `handleDealGenerate` lines 1010, 1022 | Pass from source data |
| Rewrite weekly message | `handleWeeklyPlatformMessage` lines 344-469 | Query `deals_sent` + diversity logic |

**Single file edit** + 1 DB migration. Estimated: ~1 credit.

