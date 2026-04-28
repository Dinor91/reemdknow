## תזמון sync-feed-products — אפשרות B (4 batches מדורגים)

### מה ייעשה
הוספת 4 cron jobs דרך `pg_cron`, באותו פורמט בדיוק של ה-cron jobs הקיימים בפרויקט (קריאת `net.http_post` עם ה-anon key ב-Authorization). כל job מפעיל את `sync-feed-products` עם `batch` שונה (0..3).

הפונקציה כבר תומכת בזה: `BATCH_SIZE=2` קטגוריות לכל ריצה, 7 קטגוריות סה"כ → 4 batches. הסנפשוט "After", סימון out_of_stock לסטוק ישן (>30 יום), והפעלת `translate-products` קורים אוטומטית רק ב-batch האחרון (`isLastBatch`).

### לוח הזמנים
| Job | Schedule (UTC) | Body |
|---|---|---|
| `daily-feed-sync-batch-0` | `0 3 * * *`  | `{"batch": 0}` |
| `daily-feed-sync-batch-1` | `10 3 * * *` | `{"batch": 1}` |
| `daily-feed-sync-batch-2` | `20 3 * * *` | `{"batch": 2}` |
| `daily-feed-sync-batch-3` | `30 3 * * *` | `{"batch": 3}` |

10 דקות בין batches — מספיק כדי לסיים batch של 2 קטגוריות (עד 3 עמודים בכל אחת ב-batch mode) בלי לחפוף.

### SQL שירוץ (בקרוב, לא כעת — אני ב-plan mode)
```sql
SELECT cron.schedule(
  'daily-feed-sync-batch-0',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cdubskcrxkqtzpnismle.supabase.co/functions/v1/sync-feed-products',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body := '{"batch": 0}'::jsonb
  ) AS request_id;
  $$
);
-- אותו דבר עבור batch 1/2/3 ב-10/20/30 3 * * *
```

### אימות אחרי הביצוע
- `SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'daily-feed-sync-batch-%';` — ארבע שורות.
- מחר אחרי 03:35 UTC: `SELECT MAX(updated_at), COUNT(*) FROM feed_products WHERE updated_at > NOW() - INTERVAL '1 hour';` — צריך להיות > 0.

### לא נכלל בתוכנית הזו
- שינויים בלוגיקת בחירת המוצרים ב-`daily-recommendations` (נחזור לזה אחרי שנראה איך נראה הפיד הטרי).
- הרחבת `LAZADA_CATEGORY_MAP` (חסרה "כללי", "רכב" צרה מאוד).
- הפעלה ידנית מיידית של הסנכרון. אם תרצה לזרז את הריצה הראשונה, נריץ ידנית את 4 ה-batches אחרי שיוצרו ה-cron jobs.

עלות: 1 קרדיט ליצירת ה-cron.
