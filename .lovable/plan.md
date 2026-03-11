

# תיקון: פענוח מוצר מקישור חיצוני — סקרייפינג אמיתי במקום ניחוש

## הבעיה

הפונקציה `extractProductWithGemini` מנסה לנחש פרטי מוצר רק מה-URL עצמו. כש-URL הוא `aliexpress.com/item/1005006861778418.html` — אין ב-URL שום מידע על המוצר. Gemini ממציא פרטים (iPhone 15 Pro Max) במקום המוצר האמיתי (Marble Race Run Big Block).

## הפתרון

לפני שקוראים ל-Gemini, **לסקרייפ את דף המוצר בפועל** באמצעות `fetch` עם User-Agent מתאים, לחלץ את ה-HTML (title, meta tags, og:tags), ולהעביר את הטקסט ל-Gemini לניתוח.

## שינויים בקובץ אחד

**`supabase/functions/decode-external-link/index.ts`**

1. הוספת פונקציה `scrapeProductPage(url)`:
   - `fetch` ל-URL עם User-Agent סטנדרטי
   - חילוץ `<title>`, `og:title`, `og:description`, מחיר מ-meta tags
   - החזרת טקסט גולמי (עד 2000 תווים) לניתוח

2. עדכון `extractProductWithGemini`:
   - קבלת `pageContent` כפרמטר נוסף
   - העברת התוכן הסקרייפ ל-prompt של Gemini במקום רק URL
   - Gemini יקבל מידע אמיתי מהדף ויחלץ נתונים נכונים

3. בפלואו הראשי — קריאה ל-`scrapeProductPage` לפני Gemini

## דוגמת קוד

```typescript
async function scrapeProductPage(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 ..." },
      redirect: "follow",
    });
    const html = await resp.text();
    // Extract title, og:title, og:description, price meta tags
    // Return cleaned text for Gemini
    return extractedText.substring(0, 3000);
  } catch { return ""; }
}
```

Gemini prompt ישתנה מ-"Analyze this URL" ל-"Analyze this product page content" עם הטקסט האמיתי מהדף.

