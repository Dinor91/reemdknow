

# תיקון: Lazada orders upsert נכשל — duplicate order_id

## הבעיה
הלוגים מראים בבירור:
```
Lazada upsert error: "ON CONFLICT DO UPDATE command cannot affect row a second time"
```
ה-API מחזיר 134 רשומות, אבל חלקן חולקות אותו `orderId` (כי יש sub-orders — כל הזמנה יכולה להכיל כמה SKUs עם `subOrderId` שונה). כשה-upsert שולח את כולם בבת אחת עם `ON CONFLICT(order_id)`, Postgres לא מאפשר לעדכן את אותה שורה פעמיים באותה פקודה.

## פתרון: דה-דופליקציה לפני upsert

ב-`supabase/functions/dino-chat/index.ts`, פונקציית `upsertLazadaOrders` (שורות 71-80):
- אחרי ה-`.map()`, נקבץ את השורות לפי `order_id` באמצעות `Map`
- עבור כפילויות — נסכם את `order_amount_thb` ו-`commission_thb`, ונשמור את שם המוצר הראשון
- רק אחרי הדה-דופליקציה נעשה upsert

אותו תיקון גם ב-`supabase/functions/telegram-bot-handler/index.ts` שהוספנו בו לוגיקה דומה.

### שינוי בקוד (dino-chat/index.ts שורות ~71-87):
```typescript
const rawRows = orders.map((o: any) => ({
  order_id: String(o.orderId || o.order_id || ""),
  product_name: o.skuName || o.productName || o.product_name || null,
  category_name: o.categoryL1 || o.categoryName || o.category_name || null,
  order_amount_thb: parseFloat(o.orderAmt || o.order_amount || "0") || 0,
  commission_thb: parseFloat(o.estPayout || o.est_payout || "0") || 0,
  order_status: o.status || o.orderStatus || null,
  order_date: o.conversionTime || o.orderDate || o.order_date 
    ? new Date(o.conversionTime || o.orderDate || o.order_date).toISOString() : null,
  raw_data: o,
})).filter(r => r.order_id);

// Deduplicate by order_id — aggregate amounts for sub-orders
const deduped = new Map<string, any>();
for (const row of rawRows) {
  if (deduped.has(row.order_id)) {
    const existing = deduped.get(row.order_id);
    existing.order_amount_thb += row.order_amount_thb;
    existing.commission_thb += row.commission_thb;
  } else {
    deduped.set(row.order_id, { ...row });
  }
}
const rows = Array.from(deduped.values());
```

**תיקון נוסף**: שדות ה-mapping — מהלוגים רואים ש:
- `productName` לא קיים, אלא `skuName` (שם המוצר)
- `categoryName` לא קיים, אלא `categoryL1`
- `orderDate` לא קיים, אלא `conversionTime`

## קבצים לעדכון
1. `supabase/functions/dino-chat/index.ts` — תיקון upsertLazadaOrders
2. `supabase/functions/telegram-bot-handler/index.ts` — אותו תיקון

## אימות
לאחר deploy, הרצת דוח רווחים דרך דינו → `SELECT COUNT(*) FROM orders_lazada` צריך להחזיר > 0

