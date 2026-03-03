

## תוכנית: Traffic Light + High Commission לתאילנד + מילת קוד לפתיחה מחדש

### 3 שינויים, 2 קבצים

---

### 1. Traffic Light שדרוג — `DinoChat.tsx` (שורות 1176-1183)

**מצב נוכחי:** נקודה קטנה (w-2 h-2) שמסתכלת על טקסט ההתראות (❌/⚠️).

**שינוי:** 
- הגדל ל-`w-2.5 h-2.5` עם צבעים ברורים: `bg-red-500`, `bg-yellow-400`, `bg-green-400`
- הוסף Tooltip (שימוש ב-`title` attribute שכבר קיים, רק לשפר את הטקסט)
- הוסף סיכום קצר ליד השם: `🟢` / `🟡` / `🔴` כ-emoji קטן

### 2. High Commission לתאילנד — `DinoChat.tsx`

**מצב נוכחי:** `handlePlatformSelect` מציג commission choice רק לישראל (שורה 366).

**שינוי:**
- הוסף commission choice גם לתאילנד (feed_products יש commission_rate)
- ב-`handleCategorySelect` (שורות 407-443, החלק של Thailand): כש-`flowHighCommission === true`, הוסף `.gte("commission_rate", 0.15)` לשאילתת `feed_products`
- fallback אם אין תוצאות — כמו שקיים לישראל

### 3. מילת קוד "משימות" — `DinoChat.tsx`

**שינוי:**
- הוסף ל-`detectIntentLocally` זיהוי של מילת הקוד "משימות" (או "פתיחה", "onboarding")
- כשמזוהה → קריאה ל-`fetchAlerts()` מחדש + הצגת התראות + תפריט ראשי (כמו פתיחת דינו מחדש)

### 4. Lazada Health ב-Edge Function — `dino-chat/index.ts`

**מצב נוכחי:** `getProactiveAlerts` בודק רק AliExpress campaigns.

**שינוי:**
- הוסף בדיקת `feed_products` עם `commission_rate >= 0.15` + `out_of_stock = false`
- הצג כהתראה נפרדת: `🇹🇭 X מוצרי עמלה גבוהה` או `⚠️ 🇹🇭 מעט מוצרי עמלה`

