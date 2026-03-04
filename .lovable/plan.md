

# תוכנית תיקון תשתית — 3 בעיות קריטיות

---

## ממצאים מהחקירה

### בעיה 1: orders_lazada ריק
- הפונקציה `upsertLazadaOrders` **קיימת** ב-dino-chat (שורות 58-76)
- היא **נקראת** בעת `conversions_lazada` action (שורה 858)
- הבעיה הסבירה: שדות ה-API לא תואמים ל-mapping. הפונקציה מצפה ל-`orderId` אבל ה-API מחזיר שם שדה אחר, או שהקריאה מ-Dino מעולם לא הצליחה. בנוסף — **הבוט בטלגרם לא עושה upsert בכלל** (שורות 110-183), רק מציג נתונים
- **פתרון**: לוג debug + תיקון mapping + הוספת upsert גם לבוט

### בעיה 2: סנכרון תאילנד מושבת
- `sync-feed-products` **דורש אימות admin** (שורות 181-189: `verifyAdminAuth`)
- cron job שקורא בלי Bearer token מקבל 401 → **נכשל בשקט**
- **פתרון**: הוסף bypass לאימות כשהקריאה מגיעה עם service role key, או שנה ל-secret header validation

### בעיה 3: 102 מוצרי קמפיין ללא קטגוריה
- `sync-campaigns-manual` שומר `category_id` (מ-`first_level_category_id`) אבל **לא שומר `category_name_hebrew`**
- `translate-products` מתרגם רק `product_name` ← `product_name_hebrew`, **לא נוגע ב-category**
- `sync-feed-products` (Lazada) כן מזהה קטגוריה עברית דרך `detectHebrewCategory` — אותה לוגיקת keywords
- **פתרון**: הוסף את `detectHebrewCategory` ל-`sync-campaigns-manual` לפי שם המוצר באנגלית

---

## שינויים מתוכננים

### 1. תיקון upsert של Lazada orders ב-dino-chat
**קובץ**: `supabase/functions/dino-chat/index.ts`
- הוסף logging ל-`upsertLazadaOrders` כדי לראות את מבנה הנתונים שמגיע מה-API
- תקן mapping של שדות (API Lazada מחזיר camelCase: `orderId`, `productName`, `orderAmt`, `estPayout`)
- וודא שה-upsert עובד ע"י הוספת error handling מפורט

### 2. תיקון auth ב-sync-feed-products
**קובץ**: `supabase/functions/sync-feed-products/index.ts`
- הוסף bypass: אם ה-Authorization header מכיל את ה-service role key, דלג על `verifyAdminAuth`
- זה מאפשר ל-cron לקרוא עם ANON_KEY שנשלח ב-header ול-sync לרוץ אוטומטית

### 3. הוספת זיהוי קטגוריה ל-sync-campaigns-manual
**קובץ**: `supabase/functions/sync-campaigns-manual/index.ts`
- העתק את לוגיקת `CATEGORY_KEYWORDS` + `detectHebrewCategory` מ-sync-feed-products
- הוסף `category_name_hebrew: detectHebrewCategory(product.product_title)` ל-upsert object
- זה יסווג אוטומטית את 102 המוצרים החסרים + כל מוצר חדש בעתיד

### 4. הוספת upsert לבוט טלגרם
**קובץ**: `supabase/functions/telegram-bot-handler/index.ts`
- ב-`handleRevenue`, אחרי קבלת הזמנות Lazada, הוסף upsert ל-`orders_lazada`
- שכפל את אותה לוגיקת mapping מ-dino-chat

---

## סדר ביצוע
1. sync-feed-products auth fix (הכי דחוף — מפסיק sync 27 ימים)
2. sync-campaigns-manual + category detection
3. dino-chat Lazada upsert debug + fix
4. telegram-bot-handler upsert addition

