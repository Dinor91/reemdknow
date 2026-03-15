

## תוכנית: תרגום שמות מוצרים לעברית ב-feed_products (תאילנד)

### מצב נוכחי
- `feed_products` **חסר עמודה `product_name_hebrew`** — צריך להוסיף אותה קודם
- `translate-products` כבר מתרגם AliExpress/Israel/category_products אבל **לא מתרגם שמות מוצרי Lazada** (הוא מתרגם רק `category_name_hebrew` של Lazada, שזה בכלל הקטגוריה)
- `sync-feed-products` קורא ל-`translate-products` בסוף, אבל זה לא מתרגם שמות

### שלבים

**שלב 1 — מיגרציה: הוספת עמודה**
```sql
ALTER TABLE feed_products ADD COLUMN product_name_hebrew text;
```

**שלב 2 — עדכון `sync-feed-products/index.ts`**
- אחרי שליפת המוצרים ולפני ה-upsert loop, לתרגם את כל שמות המוצרים בבאצ׳ דרך AI
- להשתמש באותה לוגיקה של `translateProducts` מ-`translate-products` (קריאה ל-`ai.gateway.lovable.dev` עם `google/gemini-2.5-flash`)
- לשמור את התרגום ב-`product_name_hebrew` בתוך ה-upsert

```text
validProducts (100 max)
    ↓
translateBatch (AI call, 50 products per batch)
    ↓
Map<productId, hebrewName>
    ↓
upsert with product_name_hebrew
```

**שלב 3 — עדכון `translate-products/index.ts`**
- לתקן את הסקשן של Lazada (שורות 124-156): במקום לחפש `category_name_hebrew IS NULL` ולעדכן אותו, לחפש `product_name_hebrew IS NULL` ולתרגם את `product_name` לעברית
- זה יטפל גם ברטרואקטיבי וגם בקריאה האוטומטית מ-`sync-feed-products`

**שלב 4 — עדכון `DailyDeals.tsx`**
- שורה 182: לשנות מ-`name: p.product_name` ל-`name: p.product_name_hebrew || p.product_name`

### קבצים שישתנו
| קובץ | שינוי |
|---|---|
| מיגרציה SQL | הוספת `product_name_hebrew` ל-`feed_products` |
| `sync-feed-products/index.ts` | הוספת תרגום AI inline לפני upsert |
| `translate-products/index.ts` | תיקון סקשן Lazada — תרגום שם מוצר במקום קטגוריה |
| `src/pages/DailyDeals.tsx` | שימוש ב-`product_name_hebrew` עם fallback |

