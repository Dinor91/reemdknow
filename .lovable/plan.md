

## תיקון שיוכי קטגוריות שגויים ב-feed_products

### מה יבוצע

6 פקודות UPDATE על `feed_products` לתיקון מוצרים ששויכו בטעות ל-"רכב ותחבורה":

| מוצר (ILIKE) | מ- | ל- |
|---|---|---|
| toothpaste / oral care | רכב ותחבורה | בריאות וספורט |
| lawn mower / lawnmower | רכב ותחבורה | כלי עבודה וציוד |
| smart watch | רכב ותחבורה | גאדג׳טים ובית חכם |
| mini camera | רכב ותחבורה | גאדג׳טים ובית חכם |
| toner | רכב ותחבורה | כללי |
| rubber care | רכב ותחבורה | כללי |

### פרט טכני

שימוש בכלי ה-data update (לא מיגרציה) להרצת 6 פקודות ה-UPDATE בדיוק כפי שכתבת. אין שינוי קוד נדרש -- רק תיקון נתונים.

### בנוסף

לאחר הביצוע, כדאי גם לעדכן את ה-keyword detection ב-`sync-feed-products` Edge Function כדי למנוע שיוכים שגויים בסנכרונים עתידיים (למשל: להוציא "toothpaste", "lawn mower", "smart watch" מרשימת ה-keywords של "רכב").

