

## עדכון לוגיקת סיווג קטגוריות ב-sync-feed-products

### מה ישתנה

החלפת המנגנון הישן (מילון `CATEGORY_KEYWORDS` + לולאת `includes`) בפונקציית `detectCategory` חדשה מבוססת **Regex עם סדר עדיפויות**:

1. **בריאות וספורט** — ראשון (תופס cpap, toothpaste לפני רכב)
2. **ילדים ומשחקים** — שני (תופס baby, toy, airtag kids)
3. **גאדג׳טים ובית חכם** — שלישי (תופס smart watch, laptop, gps tracker, airtag)
4. **כלי עבודה וציוד** — רביעי (תופס lawn mower, drill, generator)
5. **אופנה וסטייל** — חמישי (jacket ללא moto, pants, shoes)
6. **בית ומטבח** — שישי (kitchen, vacuum, bedding)
7. **רכב ותחבורה** — **אחרון** (רק מוצרים שבאמת קשורים לרכב)
8. ברירת מחדל → **כללי**

### קובץ

`supabase/functions/sync-feed-products/index.ts` — שורות 18-96:
- מחיקת `CATEGORY_KEYWORDS` ו-`detectHebrewCategory`
- הוספת `detectCategory` החדשה עם הביטויים הרגולריים שסיפקת
- עדכון הקריאה בשורה ~275 מ-`detectHebrewCategory` ל-`detectCategory`

### יתרון

סדר העדיפויות מונע שגיאות סיווג (למשל cpap לא ייפול לרכב בגלל המילה "machine", jacket לא ייפול לרכב אלא אם יש "moto").

