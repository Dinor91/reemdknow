

## תיקון שני באגים ב-sync

### שינוי 1 — פרסור `/sync` (telegram-bot-handler)
**שורה 2252**: החלפת:
```ts
const sub = text.replace("/sync", "").trim();
```
ב:
```ts
const sub = text.split(/\s+/)[1]?.toLowerCase().trim() || '';
```

### שינוי 2 — maxPages ב-batch mode (sync-feed-products)
**שורה 110**: שינוי ברירת מחדל מ-`10` ל-`5`:
```ts
maxPages: number = 5
```

**שורה 233**: העברת `maxPages: 3` כשנקרא מ-batch mode:
```ts
const maxPagesForMode = isBatchMode ? 3 : 5;
// ...
const products = await fetchLazadaByCategory(categoryId, categoryName, maxPagesForMode)
```

המשתנה `maxPagesForMode` יוגדר לפני הלולאה (אחרי שורה 228).

### קבצים
| קובץ | שינוי |
|---|---|
| `telegram-bot-handler/index.ts` | שורה 2252 — פרסור חדש |
| `sync-feed-products/index.ts` | שורה 110 — default 5, שורה 233 — העברת 3 ב-batch |

