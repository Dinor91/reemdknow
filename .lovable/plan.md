

# שני תיקונים: האזנה לקבוצות + כפתור חיפוש

## שלב 1: הוספת Secrets
- `TELEGRAM_ISRAEL_GROUP_ID` = `-3542210795`
- `TELEGRAM_THAILAND_GROUP_ID` = `-3488760258`

## שלב 2: מיגרציה — עמודת `source`
```sql
ALTER TABLE israel_editor_products ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE category_products ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
```

## שלב 3: שינויים ב-`telegram-bot-handler/index.ts`

### 3a. קריאת secrets (שורה 8)
```typescript
const ISRAEL_GROUP_ID = parseInt(Deno.env.get("TELEGRAM_ISRAEL_GROUP_ID") || "0");
const THAILAND_GROUP_ID = parseInt(Deno.env.get("TELEGRAM_THAILAND_GROUP_ID") || "0");
```

### 3b. Whitelists + helper functions (אחרי שורה 72)
- `ISRAEL_DOMAINS` / `THAILAND_DOMAINS` arrays
- `extractUrlsFromMessage(message)` — חילוץ מ-entities (type url/text_link) + regex fallback
- `matchesWhitelist(url, domains)` — בדיקה אם hostname תואם
- `extractAliExpressProductId(url)` — regex patterns: `/item/(\d+)`, `/i/(\d+)`, `productId=(\d+)`
- `extractLazadaProductId(url)` — regex: `-i(\d+)-s\d+`, `products_i(\d+)`, `offer_id=(\d+)`

### 3c. פונקציה `handleGroupMessage(chatId, message)`
1. זיהוי קבוצה (`ISRAEL_GROUP_ID` / `THAILAND_GROUP_ID`)
2. חילוץ URLs מההודעה
3. סינון whitelist — לא תואם → return (שתיקה)
4. Short links → קריאה ל-`resolve-short-links` edge function
5. חילוץ product ID
6. בדיקת כפילות: `SELECT id FROM [table] WHERE tracking_link/affiliate_link = url LIMIT 1`
7. כפילות → הגב `⚠️ קישור זה כבר קיים במאגר`
8. שמירה עם `source: "telegram_group"` + הגבה `✅ קישור נשמר למאגר [ישראל/תאילנד]`

### 3d. שינוי main handler (שורות 1425-1437)
לפני בדיקת `userId !== AUTHORIZED_USER_ID`:
```
if (chat.type === "group" || chat.type === "supergroup") {
  if (chatId === ISRAEL_GROUP_ID || chatId === THAILAND_GROUP_ID) {
    await handleGroupMessage(chatId, message);
  }
  return new Response("OK"); // שתיקה על כל קבוצה אחרת
}
```

### 3e. כפתור חיפוש ב-/start (שורה 276-278)
הוספת שורה חדשה ל-inline keyboard:
```
[{ text: "🔍 חיפוש מוצר", callback_data: "cmd:search" }]
```

### 3f. טיפול ב-callback `cmd:search` (באזור ה-callback handler ~שורה 1390)
```
else if (data === "cmd:search") {
  await sendMessage(chatId, "🔍 מה אתה מחפש?\n\nשלח תיאור קצר של המוצר ואחפש לך.");
}
```

## קבצים
- `supabase/functions/telegram-bot-handler/index.ts` — כל השינויים

