

# Phase 3: Weekly Links Fix, Events Diversity, and Coupons Feature

## File: `supabase/functions/telegram-bot-handler/index.ts`

### Fix 1: Weekly Links — Abandon Fuzzy Match, Use Fallback Strategy

The current fuzzy match (lines 382-407) uses `ilike` on `product_name` with first 30 chars from orders. This fails because order names (from API) rarely match feed product names.

**New approach:**
1. Query top 3 products by commission from orders (keep existing logic)
2. For each product, try matching by progressively shorter substrings (30 → 20 → 15 chars)
3. If no match found, pick a **random high-commission product** from the feed table as fallback (ensures 3 links always present)
4. Add a guard: if fewer than 3 products have links after all attempts, fill remaining slots with top feed products that have `tracking_link IS NOT NULL`
5. **Rule**: Message never sends with fewer than 3 links

### Fix 2: Events — One Product Per Category (Diversity)

Current code (lines 525-561) queries top 3 by commission — often same category.

**Change:** Use `DISTINCT ON (category_name_hebrew)` logic:
- For Israel: query `aliexpress_feed_products` grouped, pick top 1 per category by commission, take first 3 distinct categories
- For Thailand: same with `feed_products`
- Add AI translation for Thai product names (reuse the same Gemini call pattern from weekly)

### Feature: Coupons

**Database:** Create `promo_coupons` table with columns: `id`, `platform` (text), `coupon_code` (text), `discount_description` (text), `valid_until` (date), `is_active` (boolean default true), `created_at` (timestamptz). RLS: admin-only write, service role read from edge function.

**Bot commands:**
- `/coupons` or `/קופונים` — queries active coupons where `valid_until >= today`, groups by platform, formats as message with "copy for group" button
- `/addcoupon platform code description date` — admin inserts a new coupon via Telegram (parsed from message text)

**Message format:**
```
🎁 קופוני מבצע פעילים:

🇮🇱 AliExpress:
• SAVE8 — $8 הנחה מעל $50 (עד 8/3)

📋 איך משתמשים? הזן את הקוד בקופה לפני תשלום!
```

**Integration with deal generation:** In `handleDealGenerate`, also check `promo_coupons` for active coupons matching the platform, and pass to the deal message generator (in addition to event codes).

## Changes Summary

| What | Where (lines) | Action |
|------|---------------|--------|
| Weekly link matching | 382-407 | Rewrite with fallback strategy |
| Weekly guard | 377-380 | Ensure 3 links minimum |
| Events product diversity | 525-561 | DISTINCT ON category logic |
| Events Thai name translation | 553-558 | Add AI call for Thai names |
| `promo_coupons` table | DB migration | Create table + RLS |
| `/coupons` handler | New function | Query + format active coupons |
| `/addcoupon` handler | New function | Parse text + insert coupon |
| Deal generation coupon check | 981-986 | Also check `promo_coupons` |
| Route new commands | 1089-1098 | Add `/coupons`, `/addcoupon` |
| `/start` menu | 128-133 | Add coupons button |

