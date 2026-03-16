
# עקרונות קוד — חובה בכל כתיבה

| עיקרון | כלל |
|---|---|
| **DRY** | לוגיקה כפולה → `_shared/`. אין copy-paste בין קבצים |
| **Single Responsibility** | פונקציה = פעולה אחת. שליפה ≠ שליחה ≠ תרגום |
| **Single Source of Truth** | קטגוריות ב-`_shared/categories.ts`, שערים ב-`_shared/constants.ts`, prompts ב-`_shared/translate.ts` |
| **Separation of Concerns** | business logic / DB / UI / Telegram API — נפרדים |
| **ורסטיליות** | `fetchProducts({ table, filters })` במקום פונקציה לכל מקרה |
| **פנים קדימה** | חלק משתנה = פרמטר, לא hardcoded |

---

# שלב 9 — רוטציה חכמה + המלצות יומיות ✅

## מה הושלם
1. **DB**: הוספת `last_shown` (timestamptz) ל-`feed_products` ול-`aliexpress_feed_products`
2. **Edge Function**: `daily-recommendations/index.ts` — בוחר 3-5 מוצרים לכל פלטפורמה עם רוטציה חכמה
3. **Cron Job**: `daily-recommendations` רץ כל יום ב-01:00 UTC (08:00 שעון תאילנד)

## לוגיקה
- סינון: `out_of_stock = false`, `rating >= 4`, `tracking_link IS NOT NULL`
- מניעת כפילויות: לא נשלח כדיל ב-30 יום אחרונים
- רוטציה: `last_shown IS NULL` → `last_shown > 7 days` → עמלה + מכירות
- פיזור קטגוריות: מקסימום 2 מכל קטגוריה
- שליחה: Product Card עם תמונה + כפתור "✍️ צור דיל" (`deal_gen:ID`)

---

# חוב טכני — ממתין לריפקטורינג

## 🔴 קריטי
- ~~איחוד `detectCategory` ל-`_shared/categories.ts`~~ ✅ (B1)
- ~~תיקון `isProductRelevantForCategory` — סינון יתר~~ ✅ (originalName + fallback כללי)
- ~~קיצור שמות מוצרים ארוכים (`shortenProductName`)~~ ✅
- ~~fallback < 3 מוצרים אחרי סינון~~ ✅
- הוצאת Telegram helpers ל-`_shared/telegram.ts`
- פירוק `telegram-bot-handler` (2,100+ שורות) ל-modules

## 🟠 גבוה
- איחוד AI translate prompt ל-`_shared/translate.ts` (3 עותקים)
- איחוד API signatures ל-`_shared/api-signatures.ts` (4 עותקים)
- ~~עדכון `get_public_feed_products` DB function (חסר `product_name_hebrew`)~~ ✅ (B3)
- ~~הוספת `last_shown` ל-`handleDealCategory` + מיגרציה ל-`israel_editor_products`~~ ✅ (B2)

## 🟡 בינוני
- `_shared/constants.ts` — exchange rates + excluded categories
- איחוד product lookup (`findProductById`)

## 🟢 נמוך
- corsHeaders ל-`_shared/cors.ts`
- פיצול `DailyDeals.tsx` ל-components
