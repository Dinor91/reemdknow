# תוכנית מאוחדת — היררכיית זמן + ארכיון חכם

## 1. עקרון מנחה (חשוב!)
האתר הציבורי שולף **רק לפי `is_active=true`** ולא מסתכל על `archived_at`.
אומת בקוד הקיים:
- `IsraelCategories.tsx` → `israel_editor_products` עם `is_active=true` בלבד
- `useAliExpressProducts.ts` → `is_active=true` בלבד
- `ThailandCategories.tsx` → `category_products` עם `is_active=true` בלבד

✅ אין צורך לשנות שאילתות ציבוריות. ארכיון לא יעלים מוצרים מהחנות.

---

## 2. לוגיקת זמן (שבוע/חודש/שנה)

**הגדרת שבוע:**
- שבוע מסתיים **שישי 23:59**. מ-שבת 00:00 מוצרים שלא נשלחו מתקפלים לשבוע הקודם.
- פורמט: `שבוע X/Y` (לדוגמה `3/5` = שבוע שלישי של מאי).
- מספור: שבוע ראשון של חודש = השבוע שמכיל את 1 לחודש.

**גלגול חודש:** בסוף החודש, כל המוצרים שלא נשלחו מהשבועות מתקפלים לתיוג חודשי `מאי 2025`.

**גלגול שנה:** ב-31 בדצמבר → כל מה שלא נשלח נכנס לקיפול שנתי `2025`.

**מימוש:** ללא עמודות חדשות בDB. החישוב נעשה ב-Frontend מתוך `archived_at` (או `created_at` למוצרים פעילים) → פונקציה `getTimeBucket(date)` שמחזירה `{week, month, year}`.

---

## 3. ארכיון — שתי שכבות

### Tier A: "נשלח" (אוטומטי)
ב-`handleApprove` (אישור שליחה ב-Daily Deals):
```ts
update: { is_active: true, sent_at: now(), archived_at: now(), archive_reason: 'sent' }
```
המוצר נשאר באתר הציבורי (כי `is_active=true`) **וגם** מופיע בארכיון תחת תיוג "נשלח".

### Tier B: "ידני עם סיבה"
כפתור ארכיון בכרטיס מוצר → פותח `Dialog` עם RadioGroup:
- בעיית ניסוח
- בעיית מחיר
- בעיית תמונה
- אחר (+ textarea חופשי)

שמירה:
```ts
update: { is_active: false, archived_at: now(), archive_reason: <selected>, audit_notes: <text> }
```

---

## 4. שינויי DB (migration)

הוספה לטבלאות `israel_editor_products`, `amazon_editor_products`, `category_products`:
- `sent_at TIMESTAMPTZ NULL`
- `archive_reason TEXT NULL` — ערכים: `sent | wording | price | image | other`

(העמודה `archived_at` ו-`audit_notes` כבר קיימות.)

---

## 5. מסך ארכיון משופר (Admin)

**מבנה:**
- סרגל סינון עליון: כל הסיבות (`הכל | נשלח | ניסוח | מחיר | תמונה | אחר`) + חיפוש טקסט.
- קיבוץ היררכי: `2025 → מאי → שבוע 3/5 → כרטיסי מוצר`. ברירת מחדל מורחב לחודש הנוכחי.
- באדג' לכל כרטיס: ירוק "נשלח" / אדום + סיבה.
- כפתור "שחזר" → מנקה `archived_at`, `archive_reason`, `sent_at` ומחזיר ל-pipeline.

---

## 6. סדר ביצוע

1. **Migration** — הוספת `sent_at` ו-`archive_reason` ל-3 הטבלאות.
2. **handleApprove** — עדכון לכתוב `sent_at` + `archived_at` + `archive_reason='sent'`.
3. **ArchiveReasonDialog** — קומפוננטה חדשה עם 4 רדיו + textarea.
4. **כפתור ארכיון בכרטיס** — פתיחת הדיאלוג במקום ארכוב מיידי.
5. **getTimeBucket util** — חישוב שבוע/חודש/שנה מתאריך.
6. **מסך ארכיון** — סינון + קיבוץ היררכי + באדג'ים + שחזור.

---

## 7. מה לא נעשה עכשיו
- **דשבורד תקלות 30 יום** — נחכה לצבירת דאטה (לפחות 20-30 ארכובים ידניים).
- שינוי שאילתות ציבוריות — לא נדרש, כבר תקין.

---

אשר ואצא לביצוע לפי הסדר.
