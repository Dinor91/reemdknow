

# Phase 2 Fixes: Weekly Message, Events, and Cosmetics

## Summary
Three changes to `supabase/functions/telegram-bot-handler/index.ts`:

### Fix 1: Weekly Message — Real Affiliate Links, No Prices/Commissions
**Current problem:** Weekly message shows commission amounts and prices to the community. No affiliate links included.

**Solution:** Rewrite `handleWeeklyPlatformMessage` (lines 344-432):
- Query top 3 products from `orders_lazada` / `orders_aliexpress` by commission (most sold)
- For each product, find matching affiliate link from `feed_products` (Lazada) or `aliexpress_feed_products` (AliExpress) by fuzzy matching on product name
- If no match found, skip the link
- Change AI prompt to follow the user's exact template:
  - Opening: warm thank-you paragraph
  - 3 products with titles like "📍 הלהיט:", "📍 הכי נמכר:", "📍 הפתעת השבוע:"
  - Each product: short name (max 5 words) + `🔗 [affiliate_url]`
  - No prices, no commissions, no commission percentages
  - Closing: "פספסתם? הכל בהיסטוריה. שאלות? שלחו הודעה!"
- Product names: for Thailand (Thai names), use AI to generate a short Hebrew name; for Israel, use `product_name` directly shortened

### Fix 2: Events — Filter 50%+ Commission, Separate Platforms
**Current problem:** Events show products with 70%+ commission (data errors) and mix platforms.

**Solution:** Update `handleEvents` (lines 463-536):
- Add `commission_rate < 0.50` filter to both AliExpress and Lazada queries (line 497, 514)
- Add platform selection buttons first (like `/weekly`): "🇮🇱 אירועים ישראל" / "🇹🇭 אירועים תאילנד"
- Filter events by selected platform before showing products

### Fix 3: Rating Format
Already done with `formatRating` using `toFixed(2)`. No further changes needed.

### Fix 4: Thai Product Names — Hebrew Fallback
Already handled by `getProductDisplayName`. The weekly message fix above will add AI-based short Hebrew name generation for Thai products.

## Files to Change
- `supabase/functions/telegram-bot-handler/index.ts` — all fixes in one file

## Key Technical Details

**Affiliate link matching for weekly message:**
```typescript
// For Lazada orders: match by product name substring against feed_products.product_name
const { data: matchedProduct } = await serviceClient
  .from("feed_products")
  .select("tracking_link")
  .ilike("product_name", `%${orderProductName.substring(0, 30)}%`)
  .not("tracking_link", "is", null)
  .limit(1)
  .maybeSingle();
```

**AI prompt change** — instead of asking AI to write creatively with commission data, provide the 3 products with links pre-built and ask AI only for the short Hebrew product names (5 words max). Then assemble the message programmatically using the user's exact template format.

**Events commission filter:**
```typescript
.lt("commission_rate", 0.50)  // Filter out data errors
```

