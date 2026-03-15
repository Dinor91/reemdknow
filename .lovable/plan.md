

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
