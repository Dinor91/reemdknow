

# כלי "דיל מקישור חיצוני" — תוכנית מימוש

## סקירה

כלי שמאפשר ליצור דיל מכל קישור חיצוני (AliExpress/Lazada) ב-3 מקומות: Admin, דינו, טלגרם.

---

## קבצים חדשים

### 1. `supabase/functions/decode-external-link/index.ts`

Edge function שמקבלת `{ url, extra_info? }` ומבצעת:
1. Resolve short links (קריאה ל-`resolve-short-links` הקיים)
2. זיהוי פלטפורמה לפי domain:
   - AliExpress domains → `platform: "aliexpress"`, הוספת `aff_fcid` tracking param (כמו ב-`generate-deal-message`)
   - Lazada domains → `platform: "lazada"`, קריאה ל-`lazada-api` עם `action: "batch-links"` + `inputType: "url"` ליצירת affiliate link
3. Gemini (`gemini-2.5-flash`) מחלץ מהקישור + extra_info: `name`, `price`, `rating`, `sales_7d`, `category`, `brand`
4. מטבע אוטומטי: AliExpress → `$`, Lazada → `฿`
5. מחזיר `{ platform, product, affiliate_url, decode_success, currency_symbol }`
6. אם Gemini נכשל → `decode_success: false` עם שדות ריקים

### 2. `src/components/admin/ExternalLinkDealTab.tsx`

קומפוננט Admin tab עם:
- Input לקישור + כפתור "🔍 פענח"
- קריאה ל-`decode-external-link`
- אם `decode_success: true` → כרטיס מוצר readonly
- אם `decode_success: false` → שדות עריכה ידנית (שם, מחיר, דירוג, מכירות, קטגוריה)
- שדה קופון אופציונלי
- כפתור "📝 צור הודעה" → קריאה ל-`generate-deal-message` (ללא שינוי)
- תצוגת הודעה + כפתור "📋 העתק"
- שמירה אוטומטית: AliExpress → `israel_editor_products`, Lazada → `category_products`
- שמירה ל-`deals_sent`

---

## קבצים שמשתנים (הוספה בלבד)

### 3. `src/pages/Admin.tsx`
- הוספת import ל-`ExternalLinkDealTab`
- הוספת `TabsTrigger` חדש "דיל מקישור" (עם אייקון ExternalLink)
- הוספת `TabsContent` מתאים

### 4. `src/components/DinoChat.tsx`
- הוספת `"external_link_deal"` ל-`FlowType`
- הוספת כפתור `{ emoji: "🔗", label: "דיל מקישור חיצוני", action: "external_link_deal" }` ל-`PRIMARY_ACTIONS`
- הוספת state: `externalLinkProduct` לשמירת תוצאת הפענוח
- Flow בשלבים:
  1. דינו שואל "שלח קישור למוצר 🔗"
  2. משתמש שולח URL → קריאה ל-`decode-external-link`
  3. אם הצליח → מציג כרטיס + שואל "יש מידע נוסף? (כתוב 'לא' לדילוג)"
  4. אם נכשל → שואל שם, מחיר וכו' אחד אחד
  5. שואל קופון
  6. קריאה ל-`generate-deal-message` → הצגה כ-`deal_message` עם "📋 העתק"
  7. שמירה כמו ב-Admin
- הוספת handler ב-`sendMessage` ו-`handleButtonClick`

### 5. `supabase/functions/telegram-bot-handler/index.ts`
- הוספת כפתור `"🔗 דיל מקישור"` בתפריט `/start` (callback: `cmd:external_link`)
- הוספת states חדשים ב-`user_sessions`: `waiting_external_link`, `waiting_external_info`
- פונקציה `handleExternalLinkStart(chatId)` → שואל "שלח קישור למוצר"
- פונקציה `handleExternalLink(chatId, url)`:
  1. קריאה ל-`decode-external-link`
  2. מציג פרטי מוצר
  3. שואל "יש מידע נוסף? שלח או כתוב לא"
- פונקציה `handleExternalInfo(chatId, text)`:
  1. אם "לא" → ממשיך ישירות
  2. אחרת → קריאה חוזרת ל-`decode-external-link` עם `extra_info`
  3. קריאה ל-`generate-deal-message`
  4. שולח הודעה מוכנה + כפתור "📋 העתק" (שליחת ההודעה כטקסט נקי בהודעה נפרדת להעתקה קלה)
  5. שמירה ל-`deals_sent` + טבלת מוצרים (AliExpress → `israel_editor_products`, Lazada → `category_products`)
- הוספת routing ב-callback handler ול-state machine

### 6. `supabase/config.toml`
- הוספת `[functions.decode-external-link]` עם `verify_jwt = false`

---

## כפתור "📋 העתק" בטלגרם

Telegram API לא תומך בכפתור העתקה ישיר. הפתרון: שליחת ההודעה המוכנה בהודעה נפרדת כ-plain text (ללא HTML formatting), כך שהמשתמש פשוט לוחץ ארוך → העתק. בנוסף, inline button עם `copy_text` (נתמך ב-Telegram Bot API 6.1+) ישמש כגיבוי.

---

## לא משתנה

- `generate-deal-message` — נשאר כמו שהוא
- טבלאות DB — משתמשים בקיימות
- RLS policies — ללא שינוי

