## מחיקת 197 מוצרי Scout v2 שנכנסו ב-10 הדקות האחרונות

זוהו 197 מוצרים שנוצרו היום בין 04:27:27 ל-04:29:05 UTC, כולם `source = 'scout_v2'`:
- `israel_editor_products`: 34 (28 aliexpress_cn + 6 unknown)
- `amazon_editor_products`: 163 (99 us + 44 de + 11 fr + 9 uk)

### פעולה

מחיקה קשה (DELETE) בשתי הטבלאות לפי תנאי:
- `source = 'scout_v2'` **וגם** `created_at::date = CURRENT_DATE`

כיוון שכל מוצרי היום נכנסו באותו batch של 2 דקות, התנאי הזה תופס בדיוק את ה-197 הללו.

### הגנות

- מוגבל ל-`scout_v2` בלבד — לא ניגע במוצרים ידניים.
- מוגבל לתאריך היום בלבד — לא ניגע ב-14 מוצרי Scout v2 קודמים (12-16/06).
- לא ניגע ב-`feed_products` / `aliexpress_feed_products` (סנכרוני feed אוטומטיים, לא Scout).

### אימות

לאחר המחיקה: ספירה חוזרת ש-`COUNT(*) WHERE source='scout_v2' AND created_at::date = CURRENT_DATE` = 0 בשתי הטבלאות.
