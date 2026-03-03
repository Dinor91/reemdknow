

## Fix: High Commission Filter Threshold

**One-line change** in `src/components/DinoChat.tsx` line 390:

Change `commission_rate >= 0.09` → `commission_rate >= 0.15`

This prepares the filter for real campaign products (15-22% commission) that will be imported in the next phase. Current 9% threshold captures low-value non-campaign products.

