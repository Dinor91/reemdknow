

# תשובה + תוכנית תיקון

## תשובה לשאלת הארכיטקטורה

**הבוט טלגרם עצמאי לחלוטין.** אין שום קריאה מ-`telegram-bot-handler` ל-`dino-chat`. הם שני Edge Functions נפרדים שחולקים את אותו DB:

- **יצירת דיל**: הבוט קורא ישירות ל-`generate-deal-message` (שורה 377) ושומר ל-`deals_sent` בעצמו (שורה 401)
- **הודעה שבועית**: הבוט מחשב בעצמו מ-`deals_sent` (שורה 656-676)
- **Revenue**: הבוט קורא ישירות ל-API של AliExpress/Lazada (לא דרך dino-chat)
- **upsertAliexpressOrders**: קיימת רק ב-`dino-chat/index.ts` — הבוט לא משתמש בה

---

## 3 תיקונים

### Fix 1 — קישור AliExpress נשבר (קריטי)
**קובץ:** `supabase/functions/generate-deal-message/index.ts` שורה 19  
**בעיה:** `productUrl.includes("aliexpress.com")` תופס גם `s.click.aliexpress.com` וגם `a.aliexpress.com` — קישורים שכבר מכילים tracking ושלא צריך להוסיף להם פרמטרים  
**תיקון:** לפני הוספת tracking, בדוק שה-URL לא כבר short link ולא כבר מכיל `aff_fcid`:
```typescript
const isAlreadyTracked = productUrl.includes("s.click.aliexpress.com") || 
                         productUrl.includes("a.aliexpress.com") || 
                         productUrl.includes("aff_fcid");
if (productUrl.includes("aliexpress.com") && TRACKING_ID && !isAlreadyTracked) {
```

### Fix 2 — commission_rate חסר ב-deals_sent
**קבצים:**
- `telegram-bot-handler/index.ts` שורה 401-406 — חסר `commission_rate`
- `src/components/admin/ProductSearchTab.tsx` שורה 113-118 — חסר `commission_rate`
- `ProductSearchTab.tsx` interface — חסר שדה `commission_rate`

**תיקון:** הוסף `commission_rate: result.commission_rate || null` ל-insert בשני המקומות, והוסף `commission_rate?: number | null` ל-SearchResult interface

### Fix 3 — product_name Unknown בהזמנות AliExpress
**קובץ:** `supabase/functions/dino-chat/index.ts` שורה 111  
**בעיה:** `product_name: o.product_name` — אבל ה-API של AliExpress מחזיר את השדה כ-`product_title`  
**תיקון:** שנה ל-`product_name: o.product_title || o.product_name || null`

---

## שינויים בקבצים

| קובץ | שורות | שינוי |
|---|---|---|
| `generate-deal-message/index.ts` | 19-22 | הוסף בדיקת isAlreadyTracked |
| `telegram-bot-handler/index.ts` | 401-406 | הוסף commission_rate ל-insert |
| `ProductSearchTab.tsx` | 13-32, 113-118 | הוסף commission_rate לinterface ול-insert |
| `dino-chat/index.ts` | 111 | שנה ל-product_title fallback |

