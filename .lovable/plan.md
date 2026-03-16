

## תיקון פילטר Rating בתוכנית השכתוב

### הבעיה
ה-API של Lazada (`/marketing/product/feed`) **לא מחזיר rating**. הפילטר `rating >= 4` בתוכנית המקורית יסנן את **כל** המוצרים כי ה-rating יהיה `null`/`undefined`.

### התיקון
בשלב הפילטר ב-`sync-feed-products/index.ts`, במקום:
```ts
if (p.ratingScore && p.ratingScore < 4) return false;
```

הלוגיקה תהיה:
```ts
// If rating exists AND is below 4 → filter out. If null/undefined → keep.
if (p.ratingScore != null && p.ratingScore < 4) return false;
```

זה בדיוק אותו דפוס שכבר מיושם ב-`daily-recommendations` לפיד תאילנד (שורה 118):
```ts
if (p.rating !== null && p.rating < 4) return false;
```

### קבצים מושפעים
| קובץ | שינוי |
|---|---|
| `supabase/functions/sync-feed-products/index.ts` | פילטר rating: `null` = keep, `< 4` = filter |

שאר התוכנית (constants.ts, fetchLazadaByCategory, snapshots, out_of_stock, תרגום) — ללא שינוי.

