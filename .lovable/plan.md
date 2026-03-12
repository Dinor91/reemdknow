

# תוכנית ביצוע — משימות 1, 2, 3 + בירור קטגוריות

## סדר ביצוע

### שלב 1: משימה 3 — מחיקת כפילויות

שתי פעולות DELETE באמצעות כלי insert (data operations):

**TH:** מחיקת 128 רשומות מ-`category_products`:
```sql
DELETE FROM category_products 
WHERE lazada_product_id IN (
  SELECT lazada_product_id FROM feed_products WHERE lazada_product_id IS NOT NULL
) AND lazada_product_id IS NOT NULL;
```

**IL:** מחיקת 1 רשומה מ-`israel_editor_products`:
```sql
DELETE FROM israel_editor_products 
WHERE aliexpress_product_id IN (
  SELECT aliexpress_product_id FROM aliexpress_feed_products WHERE aliexpress_product_id IS NOT NULL
) AND aliexpress_product_id IS NOT NULL;
```

---

### שלב 2: משימה 2 — UPDATE קטגוריות

שתי קבוצות UPDATE — אחת ל-`feed_products` (TH) ואחת ל-`aliexpress_feed_products` (IL).

**TH — feed_products:** ~10 UPDATE statements למיפוי קטגוריות כלליות + ~90 UPDATE statements ל-139 המוצרים ברמת מוצר בודד (מקובצים לפי קטגוריה חדשה).

**IL — aliexpress_feed_products:** ~15 UPDATE statements למיפוי 21 הקטגוריות הקיימות.

כל ה-UPDATEs יבוצעו דרך כלי insert (data operations).

---

### שלב 3: משימה 1 — תיקון Lazada ב-decode-external-link

#### קובץ: `supabase/functions/decode-external-link/index.ts`

**שינוי 1 — fallback ל-productId (שורות 69-107):**
ב-`getProductFromLazadaAPI`: אם batch-links נכשל (אין תוצאות), חלץ productId מה-URL ונסה שוב עם `inputType: "productId"`.

**שינוי 2 — פונקציה חדשה `scrapeOgImage` (אחרי שורה 107):**
```typescript
async function scrapeOgImage(url: string): Promise<string | null> {
  // fetch URL, regex extract og:image from HTML
}
```

**שינוי 3 — הוספת image_url לתגובה (שורות 384-408):**
כשה-Lazada API מחזיר תוצאה, קרא ל-`scrapeOgImage(resolvedUrl)` כדי לקבל תמונה. הוסף `image_url` לאובייקט product.

**שינוי 4 — מבנה JSON אחיד (שורות 412-431):**
הוסף `image_url` לתגובה. AliExpress כבר מחזיר תמונה מה-API (`image_url`). Lazada מקבל מ-og:image.

#### קובץ: `src/components/admin/ExternalLinkDealTab.tsx`

**שינוי 1 — state חדש `imageUrl`:**
```typescript
const [imageUrl, setImageUrl] = useState<string | null>(null);
```

**שינוי 2 — קבלת image_url מה-decode (שורה 75):**
```typescript
setImageUrl(data.product?.image_url || null);
```

**שינוי 3 — הצגת preview תמונה (בתוך פרטי מוצר, לפני שדות):**
תמונה 80x80 עם rounded corners אם `imageUrl` קיים.

**שינוי 4 — שמירת image_url ל-DB (שורות 172-204):**
הוסף `image_url: imageUrl` גם ל-`israel_editor_products` וגם ל-`category_products`.

**שינוי 5 — reset (שורה 233):**
הוסף `setImageUrl(null)` ל-`handleReset`.

---

### שלב 4 (ממתין): בירור DEAL_CATEGORIES

**ממצא:** `DEAL_CATEGORIES` מופיע ב-4 מקומות:
1. `src/lib/categories.ts` — הגדרה
2. `src/components/admin/ExternalLinkDealTab.tsx` — dropdown בחירת קטגוריה (Admin)
3. `src/components/admin/LinkConverter.tsx` — auto-detect + dropdown (Admin)
4. `supabase/functions/telegram-bot-handler/index.ts` — inline keyboard לבחירת קטגוריה (בוט — שורה 1647)
5. `src/pages/Admin.tsx` — import למשתנה מקומי

**כל השימושים הם admin-facing בלבד** — הם מוצגים רק לך (בממשק Admin ובבוט).

המשתמש הקצה (קהל הערוץ) **לא רואה** את `DEAL_CATEGORIES` — הקטגוריות שמוצגות באתר בדף תאילנד (`ThailandCategories.tsx`) הן רשימה נפרדת לחלוטין (בית, ילדים, טיולים, בריאות...), ובדף ישראל (`IsraelCategories.tsx`) יש רשימה אחרת. גם `DailyDeals.tsx` משתמש ברשימות עצמאיות (`LAZADA_CATEGORIES`, `ALIEXPRESS_CATEGORIES`).

**מסקנה:** שינוי ל-7 הקטגוריות החדשות ב-`DEAL_CATEGORIES` ישפיע **רק** על כלי הניהול שלך — ה-dropdown ב-Admin, הבוט, ו-LinkConverter. אין השפעה על UX של משתמשים קצה.

