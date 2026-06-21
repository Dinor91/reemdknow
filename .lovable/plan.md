## תשובה ישירה: איך הצד שלך יקבל מידע על published / draft?

**חשוב להבין:** ב-Lovable / Supabase אין מושג של `draft` vs `published` למוצרים. הסמנטיקה היחידה שקיימת היא: **"האם המוצר נשלח לערוץ ההפצה (טלגרם)"**. זה נרשם בטבלת `deals_sent` ברגע שההפצה בוצעה בפועל.

לכן ההגדרה המעשית עבור צד MongoDB שלך:
- **`distributed`** = קיימת שורה ב-`deals_sent` עם `affiliate_url` תואם.
- **`draft` / `pending`** = לא קיימת שורה תואמת ב-`deals_sent` (המוצר עדיין לא הופץ).

אין סטטוס "ביניים" וגם אין "בוטל". מה שהוצא ל-`deals_sent` — יצא.

---

## הסכמה הסופית של `deals_sent` (אומת זה עתה)

```text
id                    uuid
product_id            text   (פולימורפי, לא אמין כ-join key)
product_name          text
product_name_hebrew   text
platform              text   ('israel' | 'thailand')
category              text
affiliate_url         text   ← מפתח ההתאמה ל-MongoDB
commission_rate       numeric
sent_at               timestamptz  ← watermark
```

אין שדה `status`, אין `is_draft`, אין `cancelled_at`. נוכחות שורה = הופץ.

---

## פרוטוקול ה-RT-SYNC (מאושר, ללא קוד ב-Lovable)

זה רץ אצלך (Python + Mongo), Lovable לא משתנה:

```text
1. קרא last_sync_at מ-Mongo (collection: deals_sent_sync)
2. GET {SUPABASE_URL}/rest/v1/deals_sent
     ?select=affiliate_url,sent_at,platform,commission_rate,
             product_name,product_name_hebrew,category,product_id
     &sent_at=gt.{last_sync_at}
     &order=sent_at.asc
     &limit=1000
   Headers: apikey + Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
   (pagination דרך offset עד שמתקבל <1000 שורות)

3. לכל שורה:
     mongo.message_queue.update_one(
        {"affiliate_url": row["affiliate_url"]},
        {"$set": {
            "status": "distributed",
            "distributed_at": row["sent_at"],
            "platform": row["platform"],
            "commission_rate": row["commission_rate"]
        }}
     )
     אם matched_count == 0 → mongo.unmatched_dispatches.insert_one(row)

4. שמור last_sync_at = max(sent_at) מהבאצ'.
```

כל שאר השורות ב-Mongo שלא נגעו בהן = `draft` (ברירת מחדל בעת ה-enqueue).

---

## מה אני (Lovable) צריך לעשות עכשיו?

**כלום בקוד.** התוכנית מאושרת, אין שינוי נדרש בפרויקט Lovable עצמו:
- `deals_sent` כבר נכתב אוטומטית ע"י ה-Edge Functions של ההפצה (טלגרם / וואטסאפ).
- ה-Service Role Key כבר קיים אצלך ב-`.env`.
- ה-REST endpoint זמין, RLS נעקף ע"י ה-service role.

**מה שכן נדרש (אצלך, לא אצלי):**
1. הוסף `affiliate_url` לכל מסמך חדש שנכתב ל-`message_queue` (כדי שיהיה join key).
2. כתוב את `sync_distributed_status.py` לפי הפרוטוקול לעיל.
3. הפעל cron יומי (08:00 לדוגמה).

---

## תוכניות מגירה (Future Scope — לא בסקופ הנוכחי)

הרחבות אפשריות לעתיד, אם וכאשר יידרשו:

### 1. סנכרון עריכות ומחיקות של מוצרים (לא רק הפצות)
כיום ה-RT-SYNC רואה רק "הופץ". אם בעתיד תרצה לדעת גם על מוצרים שנערכו / נמחקו / הוארכבו ב-Lovable, יש שתי אפשרויות:

- **אופציה A — Pull עם watermark:** הוספת שאילתות נוספות לסקריפט היומי על טבלאות העריכה (`amazon_editor_products`, `israel_editor_products`, `feed_products`, `aliexpress_feed_products`) מסוננות ב-`updated_at > last_sync_at`. דורש שכל הטבלאות יחזיקו `updated_at` מעודכן (כיום קיים, אך לא תמיד נכתב בכל עדכון — לבדוק טריגרים).
- **אופציה B — Push דרך Edge Function:** Edge Function `notify-backend` שמופעלת ב-trigger או ב-RPC אחרי INSERT/UPDATE/DELETE בטבלאות העריכה, ושולחת POST ל-endpoint Python שלך. יתרון: real-time. חיסרון: דורש endpoint ציבורי וניהול failure/retry.

### 2. סנכרון מחיקות מ-`deals_sent`
כרגע ה-Pull הוא append-only (לפי `sent_at >`). אם שורה תימחק ידנית מ-`deals_sent`, MongoDB לא יידע. במידת הצורך — להוסיף reconciliation שבועי שמשווה `id`-ים.

### 3. החזרת סטטוסי ביניים (`scheduled`, `cancelled`)
דורש הוספת עמודות חדשות ל-`deals_sent` (או טבלה נפרדת `dispatch_status`) ושינוי ה-Edge Functions של ההפצה שיכתבו בשלבים. נכון להיום — כל שורה ב-`deals_sent` = הופצה בפועל, אין שלב ביניים.

---

**אישור סופי?** אם כן, אין לי מה לעשות בקוד כרגע. אתה יכול להתחיל לכתוב את הסקריפט בצד שלך.