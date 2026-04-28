## שדרוג generate-deal-message ל-"Dknow Auditor"

### מה משתנה
שכתוב של `supabase/functions/generate-deal-message/index.ts` — מחליף את שני ה-system prompts הנפרדים (KSP / AliExpress+Lazada) בפרומפט מאוחד עם הזרקת קונטקסט פלטפורמה דינמי.

### מה נשמר (ללא שינוי)
- CORS headers
- לוגיקת `aff_fcid` ל-AliExpress
- Post-processing regex להחלפת URLs
- Error handling (429, 402, 500)
- מודל: `google/gemini-2.5-flash`
- חתימת ה-API של הפונקציה (אותו `{ product, coupon, source }`)

### מה חדש

**1. `getPlatformContext(source)`** — מחזיר דגש אסטרטגי לפי פלטפורמה:
- `ksp` → אחריות מקומית, שירות בעברית, החזרות
- `aliexpress` → תקני בטיחות (CE/RoHS), בדיקת תקע, זמני משלוח
- `lazada` → תקן TIS, אחריות מקומית בתאילנד
- `amazon` → **תשתית בלבד** (case ריק, מוכן ל-Prime/BestSeller בעתיד)
- default → fallback גנרי

**2. `getCategoryFallbackNote(category)`** — תובנה גנרית-בטוחה לפי 8 הקטגוריות הקבועות (Auto → "בדקו תאימות לרכב", Tools → "בדקו סוג תקע", Kids → "בדקו גיל מומלץ", וכו').

**3. `buildAuditorPrompt({ product, coupon, source, productUrl })`** — פרומפט מאוחד שמחייב:
- **Hook**: שאלה שמציגה בעיה יומיומית (בלי סופרלטיבים — איסור מפורש על "מדהים", "חובה", "מטורף", "הכי")
- **שורת סטטוס**: ⭐ דירוג + 🔥 sales_7d (רק אם > 0; ב-KSP במקום זה: % הנחה אם קיים)
- **4 בולטים בדיוק**:
  - 🔧 **טכני** — מפרט אמיתי מהנתונים
  - 💰 **ערך** — למה המחיר משתלם
  - 🛡️ **בטיחות/תחזוקה** — לפי הקונטקסט הפלטפורמתי
  - 💡 **הערת Dknow** — Hybrid: `product.note` ידני אם קיים, אחרת `getCategoryFallbackNote(category)`
- **קופון** (רק אם קיים)
- **לינק** (URL מדויק)

**ללא חתימה** — לא מתווספת בשום פלטפורמה.

### מבנה פלט לדוגמה
```
[Hook — שאלה על בעיה יומיומית]

[שם מוצר בעברית]
[1-2 שורות תיאור]

⭐ 4.7  🔥 נמכר 230 פעמים השבוע

🔧 טכני: [מפרט]
💰 ערך: [הצדקת מחיר]
🛡️ בטיחות: [לפי פלטפורמה]
💡 הערת Dknow: [ידני או fallback קטגוריה]

💰 [מחיר]
📦 המחיר באתר עשוי להשתנות
🎟️ קופון: [אם יש]

🔗 לינק למוצר
[URL]
```

### היקף
- קובץ אחד: `supabase/functions/generate-deal-message/index.ts`
- ~120 שורות משוכתבות (מתוך ~180 קיימות)
- אין שינויי DB, אין secrets חדשים
- עלות: ~0 קרדיטים לפיתוח, deploy אחד של edge function

### בדיקה לאחר deploy
קריאה לפונקציה עם 3 דוגמאות (KSP, AliExpress, Lazada) דרך `curl_edge_functions` ובדיקת הפלט.