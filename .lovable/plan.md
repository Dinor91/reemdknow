

## תוכנית ביצוע — B1, B2, B3

### B1 — איחוד `detectCategory` ל-`_shared/categories.ts`

**קובץ חדש:** `supabase/functions/_shared/categories.ts`
- גרסה מאוחדת עם סדר עדיפויות: בריאות → ילדים → גאדג׳טים → כלי עבודה → אופנה → בית → רכב → כללי
- מיזוג regex: English מהגרסה החדשה + Hebrew מהגרסה הישנה בבוט (שורות 170-195)
- export: `detectCategory` + `DEAL_CATEGORIES` array

**עדכון 3 קבצים:**
1. `sync-feed-products/index.ts` — מחיקת שורות 20-53, הוספת import
2. `sync-aliexpress-products/index.ts` — מחיקת שורות 20-46, הוספת import
3. `telegram-bot-handler/index.ts` — מחיקת שורות 168-195, הוספת import

---

### B2 — `last_shown` ב-`handleDealCategory`

**מיגרציה:**
```sql
ALTER TABLE israel_editor_products ADD COLUMN last_shown timestamptz;
```

**עדכון `handleDealCategory` (שורות 1194-1263):**
- הוספת `sevenDaysAgo` (כמו שורה 1423)
- Israel query: `.order("last_shown", { ascending: true, nullsFirst: true })` + `.limit(20)` + filter `.filter(p => !p.last_shown || p.last_shown < sevenDaysAgo).slice(0, 10)`
- Thailand query: אותו דבר
- הוספת עדכון `last_shown` בסוף (כמו שורות 1498-1503), עם זיהוי טבלה לפי platform

---

### B3 — עדכון `get_public_feed_products`

**מיגרציה:** `CREATE OR REPLACE FUNCTION` שמוסיפה `product_name_hebrew text` ל-RETURNS TABLE ול-SELECT.

