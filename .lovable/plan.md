

## תוכנית: תיקון פילטר Campaign Sync

### הבעיה
שורה 136 ב-`sync-campaigns-manual/index.ts`:
```
return evalRate >= 90 && commRate >= 15
```
98 מוצרים נמשכים אבל 0 עוברים את הסינון — הסף גבוה מדי.

### השינויים

**קובץ: `supabase/functions/sync-campaigns-manual/index.ts`**

1. **שורות 131-137** — החלפת הפילטר + הוספת logging מפורט:
```typescript
// Step 3: Filter by quality (relaxed: rating >= 3.5 = evaluate_rate >= 70%, commission >= 8%)
const ratePassCount = allProducts.filter(p => {
  const evalRate = p.evaluate_rate ? parseFloat(String(p.evaluate_rate).replace('%', '')) : 0
  return evalRate >= 70
}).length
const commPassCount = allProducts.filter(p => {
  const commRate = p.commission_rate ? parseFloat(String(p.commission_rate)) : 0
  return commRate >= 8
}).length

const qualityProducts = allProducts.filter(p => {
  if (!p.product_id || !p.product_main_image_url || !p.target_sale_price) return false
  const evalRate = p.evaluate_rate ? parseFloat(String(p.evaluate_rate).replace('%', '')) : 0
  const commRate = p.commission_rate ? parseFloat(String(p.commission_rate)) : 0
  return evalRate >= 70 && commRate >= 8
})

console.log(`Filter breakdown: rate>=70: ${ratePassCount}, commission>=8: ${commPassCount}, both: ${qualityProducts.length}`)
```

2. **Deploy** את ה-Edge Function מיד אחרי השינוי.

3. **הרצת סנכרון ידני** דרך curl ל-`sync-campaigns-manual` ובדיקת תוצאות.

4. **Validation** — שאילתת DB:
```sql
SELECT COUNT(*) FROM aliexpress_feed_products WHERE is_campaign_product = true AND out_of_stock = false;
```
+ 3 מוצרים לדוגמה עם שם, commission, rating.

### תוצאה צפויה
20-40 מוצרי קמפיין עם עמלה 8-17%.

