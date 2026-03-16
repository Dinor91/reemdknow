

## הוספת פקודת /sync לבוט הטלגרם

### סיכום
הוספת פקודת `/sync` לבוט הטלגרם שמאפשרת הרצת סנכרון ידני מהטלפון — רק למשתמש המורשה (AUTHORIZED_USER_ID).

### שינויים

**קובץ: `supabase/functions/telegram-bot-handler/index.ts`**

1. **פונקציה חדשה `handleSync(chatId, subcommand)`**:
   - מפרסרת את ה-subcommand: `lazada` / `aliexpress` / `all`
   - שולחת הודעת "מתחיל סנכרון..." לטלגרם
   - קוראת ל-edge functions הרלוונטיות עם `Authorization: Bearer SERVICE_ROLE_KEY`:
     - `lazada` → `sync-feed-products`
     - `aliexpress` → `sync-campaigns-manual`
     - `all` → שניהם ברצף
   - מודדת זמן ריצה (`Date.now()` לפני/אחרי)
   - שולחת סיכום חזרה לטלגרם בפורמט:
     ```
     ✅ סנכרון Lazada הושלם (45s)
     📦 נשלפו: 180 גאדג׳טים, 95 בית ומטבח...
     🔄 upserted: 450
     📴 out_of_stock: 12
     ⚠️ מוצרים לא רצויים: 0
     ```
   - אם שגיאה → שולחת `❌ שגיאה בסנכרון: {error}`
   - אם subcommand לא מוכר → שולחת הודעת עזרה: `/sync lazada | aliexpress | all`

2. **רישום הפקודה** — בבלוק ה-command routing (שורות 2117-2128):
   ```ts
   else if (text.startsWith("/sync")) {
     const sub = text.replace("/sync", "").trim();
     await handleSync(chatId, sub);
   }
   ```

### פרטים טכניים
- הקריאה ל-edge functions תהיה עם `SUPABASE_SERVICE_KEY` (כבר קיים כמשתנה) כדי לעבור את ה-auth check של cron/service-role
- הפקודה כבר מוגנת ע"י בדיקת `AUTHORIZED_USER_ID` בשורה 2088
- הסיכום מפרסר את ה-JSON שחוזר מ-`sync-feed-products` (שדות: `perCategoryFetched`, `upserted`, `markedOutOfStock`, `unwantedProducts`)
- עבור `sync-campaigns-manual` — מפרסר את השדות הרלוונטיים שחוזרים

### קבצים
| קובץ | פעולה |
|---|---|
| `telegram-bot-handler/index.ts` | הוספת `handleSync` + routing |

