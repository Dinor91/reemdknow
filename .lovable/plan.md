

## תוכנית: הוספת `resetCategoryIfExhausted` ל-daily-recommendations

### מה ייעשה

הוספת פונקציית עזר גנרית `resetCategoryIfExhausted(db, table, categoryColumn, category)` שבודקת אם נותרו מוצרים זמינים (last_shown IS NULL או ישן מ-7 ימים) בקטגוריה נתונה. אם 0 — מאפסת `last_shown = NULL` לכל מוצרי הקטגוריה.

### שינויים בקובץ `supabase/functions/daily-recommendations/index.ts`

**1. פונקציה חדשה (אחרי שורה 11):**
```ts
const CATEGORIES = [
  "גאדג׳טים ובית חכם", "רכב ותחבורה", "בית ומטבח",
  "אופנה וסטייל", "ילדים ומשחקים", "בריאות וספורט",
  "כלי עבודה וציוד", "כללי",
];

async function resetCategoryIfExhausted(
  db: any, table: string, categoryColumn: string, category: string
) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  // Count available (not recently shown) products in this category
  const { count } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(categoryColumn, category)
    .eq("out_of_stock", false)
    .not("tracking_link", "is", null)
    .or(`last_shown.is.null,last_shown.lt.${sevenDaysAgo}`);

  if (count === 0) {
    // Reset all products in this category
    await db
      .from(table)
      .update({ last_shown: null })
      .eq(categoryColumn, category);
    console.log(`🔄 קטגוריה "${category}" אופסה — סבב חדש החל (${table})`);
  }
}
```

**2. בתחילת `getIsraelRecommendations` (לפני שליפת מוצרים, שורה ~48):**
```ts
// Reset exhausted categories before fetching
for (const cat of CATEGORIES) {
  await resetCategoryIfExhausted(db, "aliexpress_feed_products", "category_name_hebrew", cat);
}
```

**3. בתחילת `getThailandRecommendations` (לפני שליפת מוצרים, שורה ~104):**
```ts
for (const cat of CATEGORIES) {
  await resetCategoryIfExhausted(db, "feed_products", "category_name_hebrew", cat);
}
```

### עקרונות
- פונקציה אחת גנרית לשתי הפלטפורמות (DRY) — מקבלת `table` ו-`categoryColumn` כפרמטרים
- 8 הקטגוריות מיובאות מ-`_shared/categories.ts` (DEAL_CATEGORIES) במקום רשימה כפולה
- איפוס per-category, לא גלובלי
- `head: true` + `count: "exact"` — שאילתה קלה בלי שליפת שורות

