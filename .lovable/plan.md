

## תיקון סינון יתר + שמות ארוכים + fallback

### שינוי 1: `supabase/functions/_shared/categories.ts`

**`isProductRelevantForCategory`** — שינוי חתימה:
```ts
isProductRelevantForCategory(productName: string, category: string, originalName?: string): boolean
```
- בודק `detectCategory` על שם מתורגם + שם מקורי
- אם שניהם מחזירים "כללי" → `true` (סומך על ה-DB)
- אם רק שם מתורגם קיים והוא "כללי" → `true`

---

### שינוי 2: `telegram-bot-handler/index.ts` — `getProductDisplayName`

הוספת `shortenProductName(name)` שמופעלת על כל שם > 40 תווים:
- מסיר רעש: "Ready Stock", "Free Shipping", מספרי מודל, גדלים, צבעים
- שומר מותגים ידועים (Samsung, Apple, Xiaomi, Baseus, Anker וכו׳)
- חותך ל-5 מילים משמעותיות ראשונות

הוספת `getOriginalProductName(p)` — מחזיר את `product_name` או `name_english` המקורי.

---

### שינוי 3: `telegram-bot-handler/index.ts` — 4 בלוקי סינון

בכל אחד מ-4 הבלוקים (2 ב-`handleDealCategory`, 2 ב-`handleDealCategoryHighCommission`):

1. ב-`.map()` — הוסף `originalName: getOriginalProductName(p)`
2. החלף שורת הסינון הנוכחית:
```ts
// לפני:
products = diversifyProducts(products.filter(p => isProductRelevantForCategory(p.name, category)));

// אחרי:
const filtered = diversifyProducts(
  products.filter(p => isProductRelevantForCategory(p.name, category, p.originalName))
);
products = filtered.length >= 3 ? filtered : diversifyProducts(products);
```

**Fallback:** אם אחרי `isProductRelevantForCategory` + `diversifyProducts` נשארו פחות מ-3 → מפעיל רק `diversifyProducts` על כל המוצרים (ללא סינון קטגוריה).

---

### סיכום

| קובץ | שינוי |
|---|---|
| `_shared/categories.ts` | `isProductRelevantForCategory` — פרמטר `originalName`, fallback "כללי" |
| `telegram-bot-handler` | `shortenProductName` + `getOriginalProductName` חדשים |
| `telegram-bot-handler` | 4 בלוקי סינון — `originalName` + fallback < 3 |

