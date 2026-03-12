

# תיקון: שימוש ב-Lazada batch-links API לחילוץ פרטי מוצר

## הבעיה האמיתית

הלוגים מראים שה-API של Lazada **כבר מחזיר נתונים** — שם מוצר, עמלה, קישור אפיליאציה — אבל הקוד לא יודע לקרוא אותם:

```
Lazada batch-links response: {"result":{"data":{"urlBatchGetLinkInfoList":[{
  "regularCommission":"11%",
  "productName":"...",
  "regularPromotionLink":"https://c.lazada.co.th/t/c.2Kyzso",
  "productId":"6005890776"
}]}}}
```

**באג 1:** `getLazadaAffiliateLink` מחפש `linkData.link` אבל השדה האמיתי הוא `urlBatchGetLinkInfoList[0].regularPromotionLink`.

**באג 2:** ה-API כבר מחזיר `productName` אבל הקוד זורק אותו ומנסה לעשות סקרייפינג (שנכשל).

## הפתרון

### שינוי 1: פונקציה חדשה `getProductFromLazadaAPI`

במקום רק לחלץ קישור אפיליאציה, נחלץ גם שם מוצר ועמלה מאותה קריאת API:

```typescript
async function getProductFromLazadaAPI(url: string): Promise<{
  name: string;
  commission: string | null;
  affiliateLink: string | null;
  productId: string | null;
} | null> {
  // קורא ל-lazada-api עם action: "batch-links"
  // מחלץ מ-urlBatchGetLinkInfoList[0]:
  //   productName, regularCommission, regularPromotionLink, productId
}
```

### שינוי 2: עדכון הפלואו הראשי (שורות 330-377)

```text
Lazada flow:
  1. קריאה ל-getProductFromLazadaAPI(resolvedUrl)
  2. אם הצליח → שימוש בשם + קישור מה-API (בלי סקרייפינג בכלל)
  3. אם נכשל → scrape + בדיקת 100 תווים (כמו היום)
```

### שינוי 3: מחיקת `getLazadaAffiliateLink` (מוחלפת)

## קובץ אחד: `supabase/functions/decode-external-link/index.ts`

## תוצאה

- קישור Lazada → API מחזיר שם + קישור קצר → דיל תקין
- אם ה-API נכשל → fallback לסקרייפינג + הגנה מהזיות (< 100 תווים)

