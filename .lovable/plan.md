

# שני תיקונים בכלי "דיל מקישור"

## תיקון 1 — Lazada: מניעת הזיות Gemini

**בעיה:** סקרייפינג Lazada מחזיר 0 תווים → Gemini ממציא מוצר.

**פתרון:** בפלואו הראשי של `decode-external-link/index.ts` (שורות 359-364), לפני הקריאה ל-Gemini — בדיקה: אם `pageContent.length < 100`, דלג על Gemini והחזר שדות ריקים עם `decode_success: false`.

```typescript
// שורות 359-364 — שינוי:
} else {
  const pageContent = await scrapeProductPage(resolvedUrl);
  if (pageContent.length < 100) {
    // Scraping failed — return empty for manual edit
    console.log(`⚠️ Scraping returned only ${pageContent.length} chars, skipping Gemini`);
    product = { name: "", price: "", rating: null, sales_7d: null, category: "כללי", brand: "", decode_success: false };
    apiUsed = "none-scrape-failed";
  } else {
    product = await extractProductWithGemini(resolvedUrl, pageContent, extra_info || undefined);
    apiUsed = "gemini";
  }
}
```

## תיקון 2 — קישור קצר במקום ארוך

**בעיה:** ה-`affiliateUrl` שנשלח ל-`generate-deal-message` ארוך מדי (עם tracking params).

**פתרון:** בפונקציה `getProductFromAliExpressAPI`, לחלץ גם את `promotion_link` מתוצאת ה-API (שדה שכבר מוחזר מ-AliExpress). אם קיים — להשתמש בו כ-`affiliateUrl` במקום ה-URL הארוך. `promotion_link` הוא כבר קישור אפיליאציה קצר.

**שינויים:**

1. **`getProductFromAliExpressAPI`** — להוסיף `promotion_link` לממשק ההחזרה:
```typescript
async function getProductFromAliExpressAPI(productId: string): Promise<{
  name: string; price: string; rating: string | null; sales_7d: string | null;
  category: string; brand: string; image_url: string | null; promotion_link: string | null;
} | null> {
  // ... existing code ...
  return {
    // ... existing fields ...
    promotion_link: p.promotion_link || null,
  };
}
```

2. **בפלואו הראשי** (שורות 346-358) — אם ה-API החזיר `promotion_link`, להשתמש בו כ-`affiliateUrl`:
```typescript
if (platform === "aliexpress" && productId) {
  const apiResult = await getProductFromAliExpressAPI(productId);
  if (apiResult && apiResult.name) {
    product = { ...apiResult, decode_success: true };
    // Use promotion_link as affiliate URL if available (shorter)
    if (apiResult.promotion_link) {
      affiliateUrl = apiResult.promotion_link;
    }
    apiUsed = "aliexpress-api";
  }
  // ... fallback unchanged ...
}
```

3. **Fallback ל-AliExpress — אם אין `promotion_link`:** קריאה ל-`aliexpress-api` עם `action: "generate-link"` ליצירת קישור אפיליאציה קצר מה-URL הארוך.

## קובץ אחד בלבד: `supabase/functions/decode-external-link/index.ts`

