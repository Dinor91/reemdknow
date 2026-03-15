

## עדכון עקרונות קוד לפרויקט

העקרונות הבאים נקלטו ויחולו על **כל קוד עתידי** בפרויקט:

| עיקרון | כלל |
|---|---|
| **DRY** | לוגיקה כפולה → `_shared/`. אין copy-paste בין קבצים |
| **Single Responsibility** | פונקציה = פעולה אחת. שליפה ≠ שליחה ≠ תרגום |
| **Single Source of Truth** | קטגוריות ב-`_shared/categories.ts`, שערים ב-`_shared/constants.ts`, prompts ב-`_shared/translate.ts` |
| **Separation of Concerns** | business logic / DB / UI / Telegram API — נפרדים |
| **ורסטיליות** | `fetchProducts({ table, filters })` במקום פונקציה לכל מקרה |
| **פנים קדימה** | חלק משתנה = פרמטר, לא hardcoded |

### מה ייעשה
עדכון `.lovable/plan.md` עם העקרונות האלה כסקשן קבוע שינחה כל שלב עתידי.

### הערה
העקרונות האלה מתיישרים ישירות עם ממצאי סקירת החוב הטכני. כל ריפקטורינג או פיצ׳ר חדש ייכתב לפיהם.

