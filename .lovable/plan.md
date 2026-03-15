

## עדכון פלואו עמלה גבוהה — הוספת רוטציית `last_shown`

### מה חסר

בפונקציה `handleDealCategoryHighCommission` (שורות 1417-1487):
- **אין סינון** לפי `last_shown` — אותם מוצרים חוזרים כל פעם
- **אין עדכון** של `last_shown` אחרי הצגה

### שינויים

**קובץ:** `supabase/functions/telegram-bot-handler/index.ts`

1. **בשתי השאילתות** (Israel שורה 1424, Thailand שורה 1444) — הוסף:
   - `.order("last_shown", { ascending: true, nullsFirst: true })` **לפני** ה-order הקיים של commission_rate
   - הגדל limit ל-20 (כדי שיהיה מאגר לסינון)

2. **אחרי השליפה** — סנן מוצרים ש-`last_shown` שלהם בתוך 7 הימים האחרונים, וחתוך ל-10

3. **אחרי שליחת ההודעה** (אחרי שורה 1486) — עדכן `last_shown = NOW()` למוצרים שהוצגו:
   ```typescript
   const table = platform === "israel_hc" ? "aliexpress_feed_products" : "feed_products";
   const shownIds = products.map(p => p.id);
   await serviceClient.from(table).update({ last_shown: new Date().toISOString() }).in("id", shownIds);
   ```

### תוצאה

מוצרי עמלה גבוהה יעברו רוטציה — לא יוצגו שוב במשך 7 ימים, בדיוק כמו בהמלצות היומיות.

