

# Add "📝 צור דיל" Button to Admin ProductSearchTab

## Single file change: `src/components/admin/ProductSearchTab.tsx`

### 1. New state variables (after line 72)
- `dealLoadingIdx: number | null` — tracks which card is generating
- `generatedDeal: { idx: number; message: string } | null` — stores the generated message
- `dealCopied: boolean` — tracks copy confirmation

### 2. New handler: `handleCreateDeal(result, idx)`
- Sets `dealLoadingIdx = idx`
- Calls `supabase.functions.invoke("generate-deal-message", { body: { product: { name: result.product_name, price: result.price_display, rating: result.rating, sales_7d: result.sales_count, category: result.category, url: result.tracking_link } } })`
- Sets `generatedDeal = { idx, message: data.message }`
- 14-day duplicate check: query `deals_sent` for matching `affiliate_url` — show toast warning if found
- Save to `deals_sent`: `{ product_name: result.product_name, platform: result.platform === "aliexpress" ? "israel" : "thailand", category: result.category, affiliate_url: result.tracking_link }`
- Clears `dealLoadingIdx`

### 3. UI changes in button row (lines 373-391)
Add a third button "📝 צור דיל" next to existing "צפה במוצר" and "העתק" buttons. Shows `Loader2` spinner when `dealLoadingIdx === i`.

### 4. Generated deal display (after button row, before `</CardContent>`)
When `generatedDeal?.idx === i`, render:
- A styled `div` with whitespace-pre-wrap showing the generated message
- A "📋 העתק הודעה" button that copies to clipboard
- A small "סגור" button to dismiss

No DB changes needed — uses existing `deals_sent` table and `generate-deal-message` edge function.

