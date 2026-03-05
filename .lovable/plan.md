

# Fix: Duplicate Names in Weekly Message + Duplicate Prevention

## Fix 1: Duplicate product names in message

**Root cause (line 427-428):** The AI response is split by `---` but the model likely returns `1. name\n2. name\n3. name` format — meaning one big string ends up as the "short name" for product 1, containing ALL names concatenated.

**Fix in lines 427-428:**
Change the split logic to handle both `---` and newline-separated responses:
```typescript
const shortNames = (data.choices?.[0]?.message?.content || "")
  .split(/---|\n/)
  .map((n: string) => n.replace(/^\d+[\.\)]\s*/, "").trim())
  .filter((n: string) => n);
```
This splits on `---` OR newlines, strips leading numbers like `1.` or `2)`, and filters empties.

## Fix 2: Duplicate prevention (28-day window)

### A. Weekly message query — exclude recently used deals

**Lines 353-358:** Add filter to exclude deals whose `affiliate_url` was already used in a weekly-eligible window (8-28 days ago):

After fetching deals, filter out any whose `affiliate_url` appeared in a deal sent between 8 and 28 days ago:
```typescript
// After line 359 (deals = data || [])
const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const { data: recentUrls } = await serviceClient
  .from("deals_sent")
  .select("affiliate_url")
  .gte("sent_at", fourWeeksAgo)
  .lt("sent_at", oneWeekAgo);
const excludeUrls = new Set((recentUrls || []).map(r => r.affiliate_url));
deals = deals.filter(d => !excludeUrls.has(d.affiliate_url));
```

### B. Warning on deal creation

**Lines 1077-1091:** Before inserting into `deals_sent`, check if the same `affiliate_url` was sent in the last 14 days. If so, send a warning message (but still save the deal):

```typescript
// Before the insert (line 1079)
const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
const { data: recentDeal } = await serviceClient
  .from("deals_sent")
  .select("sent_at")
  .eq("affiliate_url", product.url)
  .gte("sent_at", twoWeeksAgo)
  .order("sent_at", { ascending: false })
  .limit(1);
if (recentDeal && recentDeal.length > 0) {
  const daysAgo = Math.round((Date.now() - new Date(recentDeal[0].sent_at).getTime()) / (1000 * 60 * 60 * 24));
  await sendMessage(chatId, `⚠️ מוצר זה פורסם לפני ${daysAgo} ימים`);
}
```

## Summary

| Change | Lines | What |
|--------|-------|------|
| Fix AI name split | 427-428 | Split by `---` or newline, strip numbering |
| Exclude 28-day duplicates | After 359 | Filter out URLs used in previous weeks |
| Warn on deal create | Before 1079 | Show "published X days ago" warning |

Single file edit, no DB changes.

