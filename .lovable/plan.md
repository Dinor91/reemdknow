

## תוכנית ביצוע: פאזה 0 + פאזה 1 (2.4 קרדיטים)

### סקירת מצב קיים

- **דוחות המרות:** `dino-chat` כבר שולף הזמנות מ-Lazada (שדות: `estPayout`, `orderAmt`, `productName`, `categoryName`, `orderId`) ו-AliExpress (שדות: `order_id`, `estimated_paid_commission`, `paid_amount`, `product_name`). אין שמירה מקומית.
- **סיכום שבועי:** קיים flow ידני (`startSummaryFlow`) שמבקש מהמשתמש להזין 3 מוצרים ידנית ומייצר הודעה עם AI. לא מבוסס דאטה אמיתי.
- **לוח שנה שיווקי:** המזכרון מציין שקיים `MARKETING_CALENDAR` אבל בפועל **לא קיים בקוד** — צריך ליצור מאפס.
- **ייבוא הודעות:** UX נוכחי: זיהוי → אישור → שם → שמירה. אין שלבי התקדמות מתוארים ("1/5") — כנראה הכוונה לזרימת Smart Import שכרגע לא ממומשת עדיין.

---

### פאזה 0: שמירת היסטוריית הזמנות (1.0 קרדיט)

**משימה 1 — יצירת טבלאות (migration)**

```sql
CREATE TABLE orders_lazada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  product_name text,
  category_name text,
  order_amount_thb numeric DEFAULT 0,
  commission_thb numeric DEFAULT 0,
  order_status text,
  order_date timestamptz,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE orders_aliexpress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  product_name text,
  category_name text,
  paid_amount_usd numeric DEFAULT 0,
  commission_usd numeric DEFAULT 0,
  order_status text,
  order_date timestamptz,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);
```

RLS: SELECT + ALL לאדמינים בלבד (כמו `button_clicks`).

**משימה 2 — upsert בזמן שליפת המרות**

ב-`dino-chat/index.ts`, אחרי שליפת `allOrders` בכל אחד מ-3 ה-actions (`conversions_lazada`, `conversions_aliexpress`, `conversions_all`):
- Lazada: upsert כל הזמנה ל-`orders_lazada` (key: `order_id`)
- AliExpress: upsert כל הזמנה ל-`orders_aliexpress` (key: `order_id`)
- פעולה שקופה — לא משנה את התגובה למשתמש

---

### פאזה 1: סיכום שבועי חכם + שיפורים (1.0 + 0.4 קרדיט)

**משימה 3 — action חדש `weekly_analytics` ב-edge function**

- שאילתה מ-`orders_lazada` + `orders_aliexpress` ל-7 ימים אחרונים
- Group by `product_name` → TOP 5 לפי סכום עמלות
- Group by `category_name` → דירוג קטגוריות
- סיכום כולל: סה"כ הזמנות, סה"כ עמלה (₪), השוואה לשבוע קודם (אם יש דאטה)
- מחזיר JSON מובנה

**משימה 4 — עדכון DinoChat.tsx**

- החלפת `startSummaryFlow` הידני → קריאה ל-`weekly_analytics`
- הצגת דוח פנימי (top 5 מוצרים, קטגוריות, סה"כ)
- כפתור "📱 צור הודעה לקבוצה" → שימוש בתבנית `סיכום_שבועי` מ-`message_templates` עם הנתונים האמיתיים
- ההודעה מועתקת ל-clipboard בסגנון reemdknow (אישי, חם, לא תאגידי)

**משימה 5 — לוח אירועים שיווקי (Enhancement 1)**

הוספת `PLATFORM_EVENTS` constant ב-`dino-chat/index.ts`:
```typescript
const PLATFORM_EVENTS = [
  { name: "11.11 Singles Day", start: "11-08", end: "11-12", platforms: ["aliexpress","lazada"], code: "DS11" },
  { name: "Black Friday", start: "11-25", end: "11-30", platforms: ["aliexpress","lazada"] },
  { name: "Lazada Birthday", start: "03-25", end: "03-28", platforms: ["lazada"], code: "BDAY27" },
  // ... 6.6, 9.9, חגים ישראליים
];
```

- פונקציה `getActiveEvents(platform)` → בודקת תאריך נוכחי מול הלוח
- ב-action `generate_deal_message`: אם יש אירוע פעיל, מוסיף אוטומטית שורת קופון לסוף ההודעה:
  `🎉 מבצע מיוחד: [Event Name]\n🎫 קוד קופון: [CODE]\n💰 הנחה: [Description]`

**משימה 6 — שיפור UX ייבוא (Enhancement 2)**

ב-`DinoChat.tsx`, עדכון `handleImportConfirm` ו-`handleImportName`:
- הצגת שלבי התקדמות מתוארים: `🔍 מזהה מוצר...` → `📸 מושך פרטים...` → `💾 שומר...` → `✅ נוסף!`
- הודעה סופית: `📊 סטטוס: פעיל בדף [platform] | 🔗 צפה בדף הציבורי`
- שינוי בצד הקליינט בלבד (הוספת הודעות assistant ביניים לפני/אחרי כל קריאה)

---

### פרטים טכניים

| רכיב | קבצים שמשתנים |
|-------|---------------|
| טבלאות חדשות | migration SQL (2 טבלאות + RLS) |
| Upsert הזמנות | `supabase/functions/dino-chat/index.ts` (3 sections) |
| Weekly analytics | `supabase/functions/dino-chat/index.ts` (action חדש) |
| UI סיכום שבועי | `src/components/DinoChat.tsx` (החלפת startSummaryFlow) |
| לוח אירועים | `supabase/functions/dino-chat/index.ts` (constant + helper) |
| UX ייבוא | `src/components/DinoChat.tsx` (handleImportConfirm/Name) |

### סדר ביצוע

1. Migration → טבלאות הזמנות
2. Edge function → upsert + weekly_analytics + events calendar
3. DinoChat.tsx → UI סיכום שבועי + UX ייבוא

