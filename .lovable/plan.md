

# תיקון: שימוש ב-AliExpress API במקום סקרייפינג

## הבעיה

הסקרייפינג מחזיר **0 תווים** כי AliExpress חוסם fetch requests מצד שרת. Gemini לא מקבל שום מידע אמיתי וממציא מוצר.

מהלוגים:
```
Scraped page content (0 chars): ...
```

## הפתרון

כבר יש `aliexpress.affiliate.productdetail.get` API בפרויקט (`aliexpress-api/index.ts` שורה 132-146). במקום לסקרייפ את הדף, נקרא ל-API הזה עם ה-product ID שכבר חולץ נכון.

## שינוי בקובץ אחד: `supabase/functions/decode-external-link/index.ts`

1. הוספת פונקציה `getProductFromAliExpressAPI(productId)` שקוראת ל-`aliexpress-api` edge function עם `action: "product-details"` ו-`productIds: productId`
2. בפלואו הראשי, אם `platform === "aliexpress"` ויש `productId`:
   - קריאה ל-API לקבלת פרטי מוצר (שם, מחיר, דירוג, מכירות)
   - אם ה-API מחזיר נתונים → שימוש בהם ישירות (בלי Gemini כלל)
   - אם ה-API נכשל → fallback לסקרייפינג + Gemini כמו היום
3. ל-Lazada — ממשיכים עם סקרייפינג + Gemini (כי אין API דומה)

```text
Flow:
  AliExpress + productId → AliExpress API → product details → done
  AliExpress no productId → scrape + Gemini (fallback)
  Lazada → scrape + Gemini (existing)
```

זה יפתור את הבעיה לחלוטין כי ה-API של AliExpress מחזיר את הנתונים האמיתיים של המוצר.

