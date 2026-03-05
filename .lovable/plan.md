
# Phase 3: Completed ✅

## Changes Made

### 1. Weekly Links — Fallback Strategy ✅
- Progressive substring matching (30→20→15 chars) instead of single fuzzy match
- Fallback to top feed products when no match found
- Guard: message won't send with fewer than 3 links

### 2. Events — Category Diversity ✅
- Fetches 50 products, picks 1 per unique category (max 3)
- AI translation for Thai product names in events
- Commission filter < 50% maintained

### 3. Coupons Feature ✅
- `promo_coupons` table created with admin-only RLS
- `/coupons` command shows active coupons grouped by platform
- `/addcoupon` command for admin to add coupons via Telegram
- Deal generation checks `promo_coupons` when no event code exists
- Coupons button added to /start menu
