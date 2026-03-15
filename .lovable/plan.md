

## ביצוע התוכנית המאושרת

### שלב 1: מיגרציה
- טבלת `aliexpress_campaigns` עם `promo_id`, `promo_name`, `promo_desc`, `is_active`, `last_synced`, `products_count`
- עמודת `campaign_name` ב-`aliexpress_feed_products`
- RLS: admin manage + public read

### שלב 2: שכתוב `sync-campaigns-manual/index.ts`
- שלב א: `featuredpromo.get` → רשימת קמפיינים
- שלב ב: upsert קמפיינים שחזרו, `is_active=false` רק אם `last_synced > 7 ימים`
- שלב ג: לולאה per-campaign דינמית (עד 20 עמודים, break אם `< 50`)
- שלב ד: Hot Products בלולאה דינמית
- שלב ה: סינון + דדופליקציה + upsert כולל `campaign_name`
- שלב ו: תרגום + ניקוי + סיכום per-campaign

### שלב 3: Deploy + הרצה + דיווח בפורמט הטבלה המבוקש

| פריט | פעולה |
|---|---|
| מיגרציה | טבלה + עמודה |
| `sync-campaigns-manual/index.ts` | שכתוב מלא |
| הרצה | deploy → curl → query DB → דיווח |

