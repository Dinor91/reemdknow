
מטרת התיקון: לעצור טריגר חוזר שבו הודעות שהבוט עצמו שלח נכנסות שוב למסלול העיבוד.

מה בדקתי:
- ב-`supabase/functions/telegram-bot-handler/index.ts` יש:
  - `const message = update.message || update.channel_post;`
- אחרי זה אין כרגע סינון להודעות של הבוט עצמו.
- לכן אם Telegram מחזיר update עם `message.from?.is_bot === true`, ההודעה עדיין יכולה להגיע להמשך הזרימה.

התיקון שאבצע:
- קובץ: `supabase/functions/telegram-bot-handler/index.ts`
- להוסיף Early Return מיד אחרי חילוץ `message` ולפני כל לוגיקה אחרת:
```ts
if (message.from?.is_bot === true) {
  console.log("Ignoring bot-authored message");
  return new Response("OK");
}
```

למה זה המיקום הנכון:
- זה חוסם גם `message` וגם `channel_post`
- זה עוצר לפני:
  - `handleGroupMessage`
  - בדיקות הרשאה
  - ניתוב פקודות כמו `/sync`

מה לא אשנה:
- לא אשנה את פרסור `/sync`
- לא אשנה batching / timeout
- לא אשנה `allowed_updates`
- לא אוסיף לוגיקה אחרת מעבר לסינון הזה

תוצאה צפויה:
- אם הודעה של הבוט עצמו חוזרת כ-update, היא תידחה מיידית
- `/sync lazada` לא יופעל שוב בגלל echo/self-message
- שאר ההודעות של משתמשים ימשיכו לעבוד כרגיל

בדיקת אימות אחרי היישום:
1. לשלוח `/sync lazada` פעם אחת
2. לבדוק בלוגים שאין טריגרים חוזרים של אותה פקודה
3. אם מתקבלת הודעת self-update, לראות log של `Ignoring bot-authored message`
