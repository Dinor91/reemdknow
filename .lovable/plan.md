

## תוכנית: Step 0 (תיקון עמלות) + Steps 1-5 (Revenue Tracking)

### מצב נוכחי
- 196 מוצרי קמפיין פעילים: 176 עם commission_rate=0.07, 20 עם 0.09
- AliExpress API מחזיר שדה `incentive_commission_rate` שלא נשמר כרגע
- `aliexpress-api` לא רשום ב-config.toml

---

### Step 0: Fix Campaign Commission Data

**A. Debug — גלה את incentive_commission_rate**

עדכון `sync-campaigns-manual/index.ts`:
- הוספת לוג מפורט של השדות `commission_rate` ו-`incentive_commission_rate` מתשובת ה-API
- חישוב `total_commission = base_commission + incentive_commission`
- שמירת הערך המשולב בעמודת `commission_rate` במקום ה-base בלבד

שינוי ספציפי בלולאת upsert:
```
// Before:
const commissionRate = product.commission_rate ? parseFloat(...) / 100 : null

// After:  
const baseRate = product.commission_rate ? parseFloat(...) : 0
const incentiveRate = product.incentive_commission_rate ? parseFloat(...) : 0
const totalRate = (baseRate + incentiveRate) / 100
```

**B. Deploy + Run Sync** — ירוץ מיד אחרי השינוי

**C. Validation:**
```sql
SELECT commission_rate, COUNT(*) FROM aliexpress_feed_products 
WHERE is_campaign_product = true AND out_of_stock = false 
GROUP BY commission_rate ORDER BY commission_rate DESC;
```
ציפייה: ערכי commission_rate גבוהים יותר (0.13-0.16 במקום 0.07)

---

### Step 1: Register aliexpress-api in config.toml
```toml
[functions.aliexpress-api]
verify_jwt = false
```

### Step 2: Add order-list to aliexpress-api/index.ts
- פונקציה `getOrderList(startTime, endTime, status?)`
- Method: `aliexpress.affiliate.order.list`
- Format: `YYYY-MM-DD HH:MM:SS`
- Case חדש `"order-list"` ב-switch

### Step 3: Add 3 conversion actions to dino-chat/index.ts

**`conversions_lazada`** — קורא ל-lazada-api עם `action: "conversion-report"` (30 יום)
**`conversions_aliexpress`** — קורא ל-aliexpress-api עם `action: "order-list"` (30 יום)  
**`conversions_all`** — Promise.all + דו"ח משולב עם שערים: 1฿=₪0.36, $1=₪3.70

### Step 4: Update DinoChat.tsx
- Intent detection: "המרות", "רווח", "כסף", "הכנסות", "earnings", "הרווחתי"
- FlowType: הוספת `"conversions"`
- 3 כפתורים: 🇹🇭 לזדה / 🇮🇱 אליאקספרס / 📊 דוח מלא
- כפתור ב-SECONDARY_ACTIONS: `{ emoji: "💰", label: "דוח רווחים", action: "conversions" }`

### Step 5: Deploy + Test

**סיכון:** AliExpress `order.list` עשוי לדרוש Advanced API. אם נקבל שגיאה — Lazada ימשיך לעבוד + fallback message לאליאקספרס.

---

### סדר ביצוע
1. Fix commission in sync-campaigns-manual → deploy → run sync → validate
2. Add aliexpress-api to config.toml
3. Add order-list to aliexpress-api
4. Add 3 conversion actions to dino-chat
5. Update DinoChat.tsx with intent + buttons
6. Deploy all → test via Dino

