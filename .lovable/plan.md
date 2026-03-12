

# רשימת קטגוריות אחידה — Admin + דינו + בוט טלגרם

## מצב נוכחי

שלוש רשימות קטגוריות **שונות** פזורות בקוד:

| מיקום | ערכים |
|-------|-------|
| `Admin.tsx` (שורה 83) | טכנולוגיה, אלקטרוניקה, לבית, אופנה ואקססוריז, ספורט וטיולים, כללי |
| `LinkConverter.tsx` (שורה 28) | רכב, גאדג׳טים, ילדים, בית, בית חכם, אופנה, נסיעות, בריאות, כלי עבודה, כללי |
| `telegram-bot-handler` | אין רשימה קבועה — שומר מה שמגיע מה-API |

## שינויים

### 1. קובץ משותף חדש: `src/lib/categories.ts`
```typescript
export const DEAL_CATEGORIES = [
  "גאדג׳טים ובית חכם",
  "משחקים ופתרונות לילדים",
  "מוצרי חשמל קטנים",
  "ציוד לנסיעות וטיולים",
  "אביזרים לרכב ולאופנוע",
  "חיות מחמד",
  "כללי",
] as const;
```

### 2. `src/components/admin/ExternalLinkDealTab.tsx`
- Import `DEAL_CATEGORIES` from `@/lib/categories`
- החלפת `Input` של קטגוריה ב-`Select` עם `DEAL_CATEGORIES`
- שדות ריקים (מחיר, דירוג, מכירות) מודגשים בגבול כתום + placeholder "הכנס ידנית"
- כוכבית אדומה ליד מחיר (חובה)
- ב-`handleDecode`: אם הקטגוריה שחוזרת לא ברשימה → ברירת מחדל `"כללי"`

### 3. `src/pages/Admin.tsx`
- מחיקת `CATEGORIES_ISRAEL` המקומי (שורות 83-90)
- Import `DEAL_CATEGORIES` מ-`@/lib/categories`
- החלפת כל `CATEGORIES_ISRAEL` ב-`DEAL_CATEGORIES`

### 4. `src/components/admin/LinkConverter.tsx`
- מחיקת `CATEGORIES_ISRAEL` המקומי (שורות 28-39)
- Import `DEAL_CATEGORIES` מ-`@/lib/categories`
- עדכון `CATEGORY_KEYWORDS` למפות למפתחות החדשים

### 5. `src/components/DinoChat.tsx`
- לא משנה את קטגוריות הסקר (ALIEXPRESS/LAZADA_CATEGORIES) — אלה למיון מוצרים מהפיד
- בפלואו של "דיל מקישור" (אם קיים בדינו) — שימוש ב-`DEAL_CATEGORIES`

### 6. `supabase/functions/telegram-bot-handler/index.ts`
- הגדרת אותה רשימה כקבוע בראש הקובץ:
```typescript
const DEAL_CATEGORIES = [
  "גאדג׳טים ובית חכם", "משחקים ופתרונות לילדים",
  "מוצרי חשמל קטנים", "ציוד לנסיעות וטיולים",
  "אביזרים לרכב ולאופנוע", "חיות מחמד", "כללי",
];
```
- ב-`handleExternalInfo` (שורות 1678, 1689, 1701): אם `product.category` לא ברשימה → `"כללי"`
- אחרי פענוח הקישור: הוספת inline keyboard לבחירת קטגוריה לפני יצירת הדיל:
```typescript
await sendMessage(chatId, "בחר קטגוריה:", {
  reply_markup: { inline_keyboard: DEAL_CATEGORIES.map(c => 
    [{ text: c, callback_data: `extcat:${c}` }]
  )}
});
```
- הוספת state `waiting_external_category` + handler ל-callback `extcat:*`

## קבצים שישתנו
1. `src/lib/categories.ts` (חדש)
2. `src/components/admin/ExternalLinkDealTab.tsx`
3. `src/pages/Admin.tsx`
4. `src/components/admin/LinkConverter.tsx`
5. `supabase/functions/telegram-bot-handler/index.ts`

