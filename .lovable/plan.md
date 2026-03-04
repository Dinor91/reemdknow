

## Fix Revenue Tracking - Both Platforms

### Problem
Dino shows ~5-9% of actual revenue due to wrong data paths and missing order statuses.

### Live API Evidence (just verified)

**Lazada**: Response at `data.result.data` (array of order objects). Commission field: `estPayout` (THB). Current code reads `data.orders` and `o.commission` — both wrong, always returns 0. Multi-month queries work fine (tested Feb and Mar separately).

**AliExpress**: "Payment Completed" = 19 orders, "Buyer Confirmed Receipt" = 23 orders. Current code only fetches first status. Amounts in cents. Confirmed receipt orders have `estimated_finished_commission` field.

---

### Changes

#### File 1: `supabase/functions/dino-chat/index.ts`

**Fix `conversions_lazada` (lines 562-599)**:
- Change `lazData.data?.orders` → `lazData.data?.result?.data`
- Change `o.commission` → `o.estPayout`
- Split 30-day query into 2 calendar month calls (current month + previous month), merge results

**Fix `conversions_aliexpress` (lines 602-643)**:
- Make TWO API calls: `status: "Payment Completed"` + `status: "Buyer Confirmed Receipt"`
- Deduplicate by `order_id`
- For each order: prefer `estimated_finished_commission` over `estimated_paid_commission`; same for `finished_amount` over `paid_amount`
- Sum all commissions (still in cents, divide by 100)

**Fix `conversions_all` (lines 645-704)**:
- Apply same Lazada fix: `data.result.data` + `estPayout`
- Apply same AliExpress fix: two status calls + dedup
- Keep currency: ฿×0.36 + $×3.70 = ILS

#### File 2: `supabase/functions/aliexpress-api/index.ts`

**Fix `order-list` case (lines 325-351)**:
- Remove hardcoded default `status: 'Payment Completed'` — only send status if `body.status` is explicitly provided
- This allows dino-chat to control which status to query per call

### Expected Results
- Lazada: ~194 orders, ~฿2,743 commission
- AliExpress: ~42 orders, ~$33 commission  
- Combined: ~₪1,111

### Deploy
Deploy `dino-chat` and `aliexpress-api` edge functions.

