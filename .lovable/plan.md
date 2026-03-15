

## שלב 9 — רוטציה חכמה + המלצות יומיות אוטומטיות

### סיכום

מערכת שתבחר כל יום 3-5 מוצרים מומלצים לכל פלטפורמה (ישראל/תאילנד), תשלח אותם בפרטי עם כפתור "צור דיל", ותמנע חזרה על מוצרים באמצעות עמודת `last_shown`.

---

### שינויי DB (2 מיגרציות)

1. **הוספת `last_shown` ל-`feed_products`:**
   ```sql
   ALTER TABLE feed_products ADD COLUMN last_shown timestamptz;
   ```

2. **הוספת `last_shown` ל-`aliexpress_feed_products`:**
   ```sql
   ALTER TABLE aliexpress_feed_products ADD COLUMN last_shown timestamptz;
   ```

---

### Edge Function חדשה: `daily-recommendations`

פונקציה שתופעל ב-cron כל בוקר (08:00 UTC+7 = 01:00 UTC):

**לוגיקת בחירת מוצרים (לכל פלטפורמה בנפרד):**

```text
1. סנן: out_of_stock = false, tracking_link IS NOT NULL, rating >= 4
2. סנן: לא נשלח כדיל ב-30 יום האחרונים (JOIN deals_sent)
3. דרג לפי עדיפות:
   a. last_shown IS NULL (לא הוצג מעולם) — עדיפות ראשונה
   b. last_shown < NOW() - 7 days — עדיפות שנייה
   c. commission_rate DESC, sales DESC
4. פזר לפי קטגוריות — מקסימום 1-2 מכל קטגוריה
5. בחר 3-5 מוצרים
6. עדכן last_shown = NOW() למוצרים שנבחרו
7. שלח Product Card לכל מוצר עם כפתור "✍️ צור דיל"
```

**פורמט ההודעה:**
```text
🌅 המלצות יומיות — ישראל 🇮🇱

מוצר 1: [שם] | $XX | ⭐4.8 | עמלה 12%
[כפתור: צור דיל]

מוצר 2: ...
```

---

### Cron Job

pg_cron שרץ כל יום ב-01:00 UTC (08:00 שעון תאילנד):

```sql
cron.schedule('daily-recommendations', '0 1 * * *', ...)
```

---

### קבצים

| קובץ | שינוי |
|---|---|
| DB migration | הוספת `last_shown` לשתי טבלאות |
| `supabase/functions/daily-recommendations/index.ts` | **חדש** — לוגיקת בחירה + שליחה |
| `supabase/config.toml` | הוספת `[functions.daily-recommendations]` |
| pg_cron (insert tool) | תזמון יומי |

---

### הערות

- הכפתור "צור דיל" ישתמש ב-callback `cmd:deal_PRODUCTID_PLATFORM` שכבר קיים בבוט
- לא נוגע ב-`telegram-bot-handler` — הפונקציה החדשה שולחת ישירות דרך Telegram API
- אם אין מספיק מוצרים (פחות מ-3) — שולח הודעה "📭 אין מספיק מוצרים חדשים היום"

