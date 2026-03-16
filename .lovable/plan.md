

## תיקון: daily-recommendations — תמיכה ב-rating NULL לתאילנד

### שינוי יחיד בקובץ `supabase/functions/daily-recommendations/index.ts`

**שורה 121** — הסרת `.gte("rating", 4)` מהשאילתה (חוסם את כל 1,750 מוצרי Lazada כי כולם NULL).

**שורות 129-133** — הוספת פילטר JS שמקבל NULL:
```typescript
if (p.rating !== null && p.rating < 4) return false;
```

### לאחר Deploy
הרצת `daily-recommendations` ידנית ודיווח: כמה מוצרים נבחרו לתאילנד ומאילו קטגוריות.

| פריט | שינוי |
|---|---|
| DB query | הסרת `.gte("rating", 4)` |
| JS filter | `rating !== null && rating < 4` → סנן. `rating === null` → השאר |
| ישראל | ללא שינוי |

