

## ביקורת על הפרומט

כמעט מתכנס, עם שני תיקונים:

### 1. סף הדירוג — 60 נמוך מדי
- `evaluate_rate >= 60` = דירוג 3.0 כוכבים (60/20)
- המדיניות שקבעת היא **מינימום 4.0 כוכבים** (= evaluate_rate >= 80)
- הורדנו כבר ל-70 (3.5 כוכבים) וזה סביר כפשרה
- 60 ישלוף מוצרים באיכות נמוכה שעלולים לפגוע באמינות ההמלצות בקבוצת WhatsApp

**המלצה:** השאר `evaluate_rate >= 70` (3.5 כוכבים) — זו כבר הרחבה מספיקה

### 2. שגיאה בשאילתת ה-Validation
הטבלה `aliexpress_feed_products` לא מכילה עמודת `is_active` — יש `out_of_stock`.

**תיקון:**
```sql
SELECT COUNT(*) FROM aliexpress_feed_products 
WHERE is_campaign_product = true AND out_of_stock = false;
```

### 3. הפילטר כבר עודכן
הפילטר כבר שונה ל-`evaluate_rate >= 70 AND commission_rate >= 8` בסשן הקודם, ו-12 מוצרים נכנסו. אם רוצים עוד מוצרים, האפשרויות הן:
- **להוריד commission ל-5%** (במקום להוריד rating) — יותר מוצרים בלי לפגוע באיכות
- **להוסיף עוד דפים** (כרגע שולפים pages 1-2 בלבד, אפשר עד 5)
- **שניהם ביחד** — סביר לקבל 30-50 מוצרים

### פרומט מתוקן מוצע

```text
Expand Campaign Sync - More Products

Current: 12 campaign products (filter: rate>=70, commission>=8, pages 1-2)
Goal: 30-50 products for daily WhatsApp rotation

Changes to sync-campaigns-manual/index.ts:
1. Lower commission threshold: commission_rate >= 5 (instead of 8)
2. Fetch more pages: pages 1-4 (instead of 1-2) for both promo and hot products
3. Keep quality: evaluate_rate >= 70 (3.5 stars minimum)
4. Deploy + run sync immediately

Validation:
SELECT COUNT(*) FROM aliexpress_feed_products 
WHERE is_campaign_product = true AND out_of_stock = false;

Expected: 30-50 total campaign products
```

