

## תוכנית ביצוע: שיפור בחירת מוצרים + סנכרון + ספירת קטגוריות

### 3 משימות ב-2 קבצים

---

### משימה 1: DinoChat.tsx — הרחבת מאגר + מיון רב-שכבתי

**6 שינויים:**

| שורה | לפני | אחרי |
|-------|-------|-------|
| 607 | `.limit(10)` | `.order("rating", {ascending:false, nullsFirst:false}).limit(20)` |
| 615 | `fbItems.slice(0, 5)` | `fbItems.slice(0, 10)` |
| 617 | `deduped.slice(0, 5)` | `deduped.slice(0, 10)` |
| 629 | `order("sales_30d")` בלבד | + `.order("rating", {ascending:false, nullsFirst:false}).order("commission_rate", {ascending:false, nullsFirst:false})` |
| 631 | `q.limit(5)` | `q.limit(20)` + slice(0,10) אחרי mapping |
| 640-641 | `order("sales_30d").limit(5)` | + `.order("rating")` + `.order("commission_rate")` + `.limit(20)` + slice(0,10) |

---

### משימה 2: DailyDeals.tsx — סנכרון לוגיקה זהה

**שינויים מקבילים:**

| שורה | לפני | אחרי |
|-------|-------|-------|
| ~87-90 | feed query: `order("sales_7d").limit(10)` | + `order("rating")` + `.limit(20)` |
| ~97-100 | curated query: `order("sales_count").limit(10)` | + `order("rating")` + `.limit(20)` |
| ~145-148 | `deduped.slice(0, 5)` | `deduped.slice(0, 10)` |
| ~153-158 | AliExpress: `order("sales_30d").limit(5)` | + `order("rating")` + `order("commission_rate")` + `.limit(20)` + slice(0,10) |

---

### משימה 3: DailyDeals.tsx — ספירת מוצרים דינמית בכפתורי קטגוריות

**מה נוסיף:**
- State חדש: `categoryCounts` מסוג `Record<string, number>`
- `useEffect` שרץ בשינוי platform — שואל GROUP BY count מהטבלה הרלוונטית
- AliExpress: `SELECT category_id, COUNT(*) FROM aliexpress_feed_products WHERE out_of_stock=false GROUP BY category_id`
- Lazada: שאילתות מקבילות ל-`feed_products` ו-`category_products`
- הצגה בכפתורים: `🎮 Games & Kids (42)` במקום `🎮 Games & Kids`

**ההבהרה הקריטית — ספירה דינמית:**
- במצב רגיל: ספירת כל המוצרים הפעילים
- לא רלוונטי ל-Daily Deals כרגע כי אין בו מצב "High Commission" — זה קיים רק בדינו. אם בעתיד נוסיף מצב כזה ל-Daily Deals, הספירה תתעדכן בהתאם

---

### תוצאה צפויה
- **מאגר x4**: 20 מה-DB במקום 5
- **תצוגה x2**: 10 מוצרים במקום 5
- **מיון 3 שכבות**: sales → rating → commission
- **פריטי מלא**: דינו ו-Daily Deals מציגים אותם מוצרים באותו סדר
- **UX**: ספירת מוצרים בכפתורי קטגוריות ב-Daily Deals

