# ניקוי מוצרי Scout v2 — שמירת 30 החדשים בלבד

## מטרה
להשאיר במערכת רק את **30 המוצרים החדשים ביותר** (סך הכל, בשתי הטבלאות יחד) שנכנסו תחת `source='scout_v2'` מאז 16/05/2026, ולמחוק את כל השאר במחיקה קשה.

## מצב נוכחי
- `israel_editor_products` (scout_v2): 29 רשומות
- `amazon_editor_products` (scout_v2): 130 רשומות
- סה״כ: **159 → ימחקו 129, יישארו 30**

## איך נקבעים ה-30 שיישארו
מיון משולב של שתי הטבלאות לפי `created_at DESC`, לוקחים את 30 המובילים בלבד — בלי קשר לפיזור בין ישראל לאמזון (יכול לצאת למשל 25 אמזון + 5 ישראל, תלוי בתאריכים בפועל).

## פעולה (SQL בודד, טרנזקציה אחת)
```sql
WITH ranked AS (
  SELECT id, 'israel'::text AS tbl, created_at
    FROM israel_editor_products WHERE source='scout_v2'
  UNION ALL
  SELECT id, 'amazon'::text AS tbl, created_at
    FROM amazon_editor_products WHERE source='scout_v2'
),
keepers AS (
  SELECT id, tbl FROM ranked ORDER BY created_at DESC LIMIT 30
)
-- מחיקה משתי הטבלאות במכה אחת
, del_il AS (
  DELETE FROM israel_editor_products
   WHERE source='scout_v2'
     AND id NOT IN (SELECT id FROM keepers WHERE tbl='israel')
  RETURNING 1
), del_az AS (
  DELETE FROM amazon_editor_products
   WHERE source='scout_v2'
     AND id NOT IN (SELECT id FROM keepers WHERE tbl='amazon')
  RETURNING 1
)
SELECT (SELECT count(*) FROM del_il) AS deleted_israel,
       (SELECT count(*) FROM del_az) AS deleted_amazon;
```

## אזהרות
- **בלתי הפיך** — DELETE קשה, אין rollback אחרי commit.
- מוצרים שכבר נשלחו (`sent_at IS NOT NULL`) יימחקו גם הם אם לא בין 30 החדשים. אם זה לא רצוי — אגיד לי להחריג אותם.
- רשומות ב-`deals_sent` שמפנות ל-id שנמחק: אבדוק תלות לפני הריצה ואחזיר אם יש בעיה (אם כן, אצטרך אישור איך לטפל: SET NULL / מחיקת deal / שמירת המוצר).

## אישור לפני ביצוע
לאחר מעבר ל-build, אריץ קודם בדיקה יבשה (`SELECT count`) שמראה כמה יימחקו לפי הקריטריון, ורק לאחר אישור — אבצע את ה-DELETE עצמו.
