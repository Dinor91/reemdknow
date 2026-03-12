

## תוכנית: הוספת לוג דיאגנוסטי לזיהוי Group IDs

### בעיה
ה-secrets `TELEGRAM_ISRAEL_GROUP_ID` ו-`TELEGRAM_THAILAND_GROUP_ID` מוצפנים ולא ניתן לקרוא את ערכיהם. צריך לוודא שהם תואמים ל-Chat IDs האמיתיים:
- **ישראל:** `-1003542210795`
- **תאילנד:** `-1003488760258`

### פתרון: הוספת לוג דיאגנוסטי זמני

**קובץ:** `supabase/functions/telegram-bot-handler/index.ts`

**שינוי 1** — אחרי שורה 10, הוסף לוג שמדפיס את הערכים הנטענים:
```typescript
console.log(`Group IDs config — Israel: ${ISRAEL_GROUP_ID}, Thailand: ${THAILAND_GROUP_ID}`);
```

**שינוי 2** — בשורה ~2000, לפני הבדיקה, הוסף לוג שמדפיס את ה-chatId הנכנס:
```typescript
console.log(`Group message from chatId: ${chatId}, match: israel=${chatId === ISRAEL_GROUP_ID}, thailand=${chatId === THAILAND_GROUP_ID}`);
```

### תוצאה צפויה
אחרי deploy, שליחת הודעה בקבוצה תראה בלוגים:
- מה הערך שנטען מה-secret
- האם יש match או לא

אם אין match — נעדכן את ה-secrets לערכים הנכונים ונסיר את הלוגים הזמניים.

