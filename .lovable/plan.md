

## באצ'ים ל-sync-feed-products + טיפול בשגיאות

### מצב נוכחי
`handleSync` קורא ל-`sync-feed-products` פעם אחת — בלי חלוקה לבאצ'ים. לכן ה-timeout ב-151 שניות.

### שינויים

**`sync-feed-products/index.ts`**:
- מקבל פרמטר `batch` (0-3) מה-body
- חותך את `LAZADA_CATEGORY_MAP` ל-2 קטגוריות per batch
- באצ' אחרון בלבד מריץ out_of_stock + snapshot + translate
- ללא `batch` → מריץ הכל (backward compatible לcron)

**`telegram-bot-handler/index.ts` — `handleSync`**:
- עבור lazada: לולאה על 4 באצ'ים (0-3)
- כל באצ' עטוף ב-try/catch
- שגיאה → שולח `❌ באצ' X/4 נכשל: {error}`, ממשיך לבאצ' הבא
- הצלחה → שולח `🔄 X/4: {קטגוריות ומספרים}`
- בסוף — סיכום כולל:

```text
✅ סנכרון Lazada הושלם (180s)
באצ'ים: ✅1 ✅2 ❌3 ✅4
📦 upserted: 2400 | 📴 out_of_stock: 15
⚠️ באצ' 3 נכשל: timeout
```

- צבירה: `totalUpserted`, `totalFetched` מצטברים מכל באצ' שהצליח
- aliexpress: נשאר קריאה בודדת (לא צריך באצ'ים)

### קבצים
| קובץ | שינוי |
|---|---|
| `sync-feed-products/index.ts` | פרמטר `batch`, חלוקת קטגוריות, backward compat |
| `telegram-bot-handler/index.ts` | לולאת באצ'ים עם continue-on-error וסיכום |

