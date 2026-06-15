## מטרה
לתמוך בתוויות מקור אחידות עבור KSP (Email/Telegram) ו-Amazon (US/UK/DE/FR) באמצעות שדה `channel` (+ `country` ל-Amazon) שמגיע מה-pipeline.

## שינויים

### 1. DB — מיגרציה אחת
הוסף לשתי הטבלאות:
- `israel_editor_products`: `channel text`, `country text` (country יישאר NULL ל-KSP)
- `amazon_editor_products`: `channel text`, `country text`

שתי עמודות nullable, ללא ברירת מחדל, ללא backfill (שורות ישנות פשוט לא יקבלו תווית חדשה). אינדקס על `channel` בשתי הטבלאות.

### 2. Edge Function — `auditor-ingest/index.ts`
- הוסף ל-`BodySchema`:
  ```ts
  channel: z.string().trim().max(50).optional(),
  country: z.string().trim().length(2).optional(),
  ```
- כתוב `channel` ו-`country` לתוך ה-row של שתי הפלטפורמות.
- שדות אופציונליים — אם ה-publisher לא שלח, נכנס NULL (תאימות אחורה מלאה).

### 3. Frontend — `ScoutDraftsTab.tsx`
- הוסף `channel: string | null` ו-`country: string | null` ל-`Draft` ול-`SELECT`.
- helper יחיד `channelBadge(d)` שמחזיר `{label, className}` לפי הכלל:
  - `ksp_email` → `📧 KSP Mail` (כחול)
  - `ksp_telegram` → `📱 KSP Tel` (סגול)
  - `amazon_us|uk|de|fr` → `🛒 Amazon {COUNTRY}` (כתום/אמבר)
  - אחרת → `null` (אין badge — תאימות לשורות ישנות)
- רנדור ה-badge בשורת הפלטפורמה, ליד תווית AMAZON/הקטגוריה, בדיוק כפי שכבר נעשה היום.

### 4. ללא שינוי
- אין שינוי ב-`post-scout-draft`, סינון, מיון, או טבלאות feed.
- שורות ישנות (ללא `channel`) ממשיכות לעבוד — פשוט בלי ה-badge החדש.

## סדר עבודה
1. מיגרציה (אישור משתמש).
2. עדכון `auditor-ingest` לקבלת השדות.
3. עדכון `ScoutDraftsTab.tsx` להצגת ה-badges.
4. אימות: כשה-publisher יתחיל לשלוח `channel`, ה-badges מופיעים אוטומטית; שורות חדשות בלי `channel` לא נשברות.

## הערה לאסטרטגיה
זה תואם 1:1 ל-spec של הסניור, מאחד KSP+Amazon תחת אותו מודל (`channel`), ולא חוסם את ה-pipeline — אפשר לפרוס DB+Frontend עכשיו, וה-publisher יוסיף `channel`/`country` בקצב שלו.
