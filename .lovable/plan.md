

## Plan: Smart Campaign Status + Auto-Sync + Header Indicator

### Change 1: Status-based messages in High Commission flow

**File: `src/components/DinoChat.tsx`**

In `handleCommissionChoice` (around line 303), when user picks "high commission":
- Query `aliexpress_feed_products` for `is_campaign_product = true` count
- **0 campaigns**: Show "❌ אין קמפיינים רשומים" with a button `[🌐 פתח פורטל]` linking to AliExpress affiliate portal
- **Campaigns exist but 0 imported (is_campaign_product count = 0 but campaigns API has results)**: Show "⚠️ יש קמפיינים, לייבא עכשיו?" with a `[🚀 ייבא]` button that triggers sync
- **Products available (count > 0)**: Show "✅ X מוצרים זמינים" and proceed to category picker

### Change 2: Daily Cron Job (04:00 UTC)

**DB insert (not migration):** Schedule a `pg_cron` job that calls `sync-campaigns-manual` daily at 04:00 UTC using `pg_net`:
- Requires enabling `pg_cron` and `pg_net` extensions first (migration)
- The cron job POSTs to the edge function URL with the anon key
- The `sync-campaigns-manual` edge function already handles the import logic
- Add expired product cleanup: set `out_of_stock = true` for campaign products older than 30 days with no recent update

**File: `supabase/functions/sync-campaigns-manual/index.ts`**
- Add a cleanup step at the end: mark `is_campaign_product` products as `out_of_stock` if `updated_at < now() - 30 days`

### Change 3: Status indicator in Dino header

**File: `src/components/DinoChat.tsx`**

In the chat header (line ~1086-1091), replace the static green pulse dot with a dynamic campaign health indicator:
- Use the `alerts` state (already fetched on open) to determine status
- Parse the campaign health alert string for the emoji prefix (✅/⚠️/❌)
- Show 🟢 (green), 🟡 (yellow), or 🔴 (red) dot accordingly
- Add tooltip text on hover showing the full status message

### Files to Edit

| File | Change |
|------|--------|
| `src/components/DinoChat.tsx` | Status-based high commission messages, dynamic header indicator |
| `supabase/functions/sync-campaigns-manual/index.ts` | Add cleanup of expired campaign products |
| DB (extensions migration) | Enable `pg_cron` and `pg_net` extensions |
| DB (insert, not migration) | Schedule daily cron job at 04:00 UTC |

