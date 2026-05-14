# Auditor V2.0 — Admin Hub Plan

Mobile-first, RTL Hebrew, premium minimal aesthetic (semantic tokens from `index.css`, no hardcoded colors). All 4 tabs sit inside the existing `/admin` route, replacing today's tab structure. Existing tools (LinkConverter, ProductSearch, CSV importer, Lazada/AE editors) move into a secondary "Tools" overflow menu so the V2 hub stays clean.

## Top-level layout

```text
┌─ Header: Logo · Title "Auditor V2.0" · Theme · Logout ─┐
│  KPI strip (4 mini-cards): Drafts today · Hands-Free   │
│  Index · Days since growth update · Weekly revenue     │
├────────────────────────────────────────────────────────┤
│ Tabs (sticky, scrollable on mobile):                   │
│  [Scout Drafts] [Growth] [Revenue] [Roadmap] [Tools ▾] │
└────────────────────────────────────────────────────────┘
```

Tab bar is horizontally scrollable on <640px; each tab content is a single column on mobile, 2-col grid ≥768px.

---

## Tab 1 — Scout Drafts (The Warehouse)

**Data sources**
- `israel_editor_products` where `is_active = false AND source = 'scout_v2'`
- `amazon_editor_products` same filter
- Union sorted by `created_at DESC`, with platform badge (AE / Amazon)

**Schema additions needed** (migration):
- Add `audit_notes text` to both `israel_editor_products` and `amazon_editor_products` (Auditor V2 will populate). Nullable.
- Add `archived_at timestamptz` to both (soft-delete for the Archive action — keeps row but excludes from drafts queue).
- Index `(source, is_active, archived_at)` on both for fast queue queries.

**UI — draft card** (full-width on mobile, 2-up on tablet, 3-up on desktop)
- Image (square, 1:1) · platform badge · category chip
- Hebrew name (2-line clamp)
- Price + rating + commission inline
- Audit notes block (muted background, italic) when present
- Action row: `אישור ושליחה` (primary) · `העתק לוואטסאפ` (secondary) · `ארכיון` (ghost, destructive on hover)

**Actions**
- **Approve & Post** → update row `is_active=true`, then invoke existing `telegram-bot-handler` edge function with the product id (reuse the same path the manual approve flow uses today). Toast on success, optimistic remove from list.
- **Copy for WhatsApp** → builds Hebrew message client-side using the same template logic as `generate-deal-message` (we'll mirror the formatter into a small `src/lib/whatsappFormatter.ts` so we don't need an edge call). `navigator.clipboard.writeText`.
- **Archive** → sets `archived_at = now()`, does NOT delete. A small "ארכיון" filter toggle at the top of the tab lets you review/restore.

**KPI — Hands-Free Index**
- Sticky card at top of tab: count of `scout_v2` drafts created in the last 24h.
- Progress bar against target = 12. Color goes from muted → primary → success as it climbs.
- Sub-line: "השבוע: X / 84" (7×12).

**Filters** (collapsible on mobile)
- Platform (All / AE / Amazon), Category, Min rating, Search by Hebrew name.

---

## Tab 2 — Growth & Accountability (Nagging Agent)

**New table** (migration):
```text
growth_metrics
  id uuid pk
  recorded_at timestamptz default now()
  instagram_followers int
  whatsapp_members int
  telegram_members int
  note text
  created_by uuid
RLS: admins full access.
```

**Quick Update Form** (top of tab, 3 number inputs + Save)
- Pre-fills with latest row values.
- On save inserts a new row (history preserved for the chart).

**Accountability alert**
- Computed client-side: `daysSince = now - max(latest growth_metrics.recorded_at, latest revenue CSV upload date)`.
- If `> 7` → red banner at top of tab (and mirrored in header KPI strip): "נדרש עדכון שבועי — X ימים מאז העדכון האחרון".
- Uses `destructive` token, no custom red.

**Chart — progress vs Aug 2026 goals**
- Recharts `LineChart`, three series: Instagram (goal 10,000), Community = WhatsApp + Telegram (goal 1,000), Income (goal ₪15,000–20,000, plotted from Tab 3 data — shared selector).
- Goal lines as dashed `ReferenceLine`s.
- Time axis = recorded_at. Mobile: single chart, full width; desktop: 2-col (followers / income).

---

## Tab 3 — Revenue & Viral Ratio

**New table** (migration):
```text
revenue_uploads
  id uuid pk
  uploaded_at timestamptz default now()
  platform text check in ('amazon','aliexpress','lazada')
  period_start date
  period_end date
  gross_revenue_ils numeric
  commission_ils numeric
  orders_count int
  raw jsonb         -- parsed CSV rows
  filename text
RLS: admins only.
```

We keep the existing `orders_aliexpress` / `orders_lazada` tables untouched (they're row-level orders); `revenue_uploads` is the aggregated weekly view that powers the chart.

**CSV Upload tool**
- Drag-and-drop zone + file picker. Parses client-side with PapaParse (already plausible to add).
- Auto-detects platform by header signature (Amazon vs AliExpress vs Lazada).
- Converts to ILS using fixed rates from memory: ฿1=₪0.36, $1=₪3.70.
- Preview table before commit, then insert one `revenue_uploads` row + (optional) per-order rows into existing orders tables.

**Charts**
- Weekly revenue bar chart (Recharts, last 12 weeks).
- "Hit of the Week" horizontal bar: top 5 `button_clicks` rows grouped by `source` for the last 7 days (data already in `button_clicks`).

**Viral Ratio counter**
- Simple counter card: "פוסטי חקירה השבוע: X / 2".
- Source: a new `content_posts` table OR a lightweight column on existing data. Proposal: reuse `growth_metrics` is wrong — better add a small table:

```text
investigation_posts
  id uuid pk
  posted_at timestamptz default now()
  title text
  url text
  platform text
RLS: admins only.
```

- "+ הוסף פוסט חקירה" button opens a tiny modal with title + URL.

---

## Tab 4 — Strategic Roadmap

Static-ish visualization fed by a small config + live signals:

- **95% Automation** progress ring: computed as `scout_v2 approved / total approved last 30 days`.
- **<2 min Edit time** progress: manual input (stored in a singleton `roadmap_metrics` row) until we instrument it.
- **Milestone timeline** (vertical on mobile, horizontal on desktop): Now → Q3 2026 → Aug 2026 with checkpoints (10k IG, 1k community, ₪15–20k income). Each node shows current vs target with a mini progress bar.

**New table**:
```text
roadmap_metrics
  id uuid pk (singleton enforced by unique constraint on a `key` column)
  key text unique
  value numeric
  updated_at timestamptz
```

---

## Shared concerns

**Mobile-first details**
- Min tap target 44px on all action buttons.
- Action rows on draft cards collapse to icon+label; primary action stays full-width on <400px.
- Charts use `ResponsiveContainer` with `aspect={16/9}` on mobile.
- Sticky bottom action bar on draft detail view (when expanded).

**Reusable pieces to extract**
- `src/components/admin/v2/ScoutDraftsTab.tsx`
- `src/components/admin/v2/GrowthTab.tsx`
- `src/components/admin/v2/RevenueTab.tsx`
- `src/components/admin/v2/RoadmapTab.tsx`
- `src/components/admin/v2/KpiStrip.tsx`
- `src/components/admin/v2/DraftCard.tsx`
- `src/lib/whatsappFormatter.ts` (Hebrew message builder, shared with edge logic)
- `src/lib/revenueCsv.ts` (parse + normalize)
- `src/hooks/useScoutDrafts.ts`, `useGrowthMetrics.ts`, `useRevenueUploads.ts`

**What stays**
- Existing tabs (Israel editor, Thailand editor, Lazada smart search, Daily deals, Link converter, Product search, CSV import) move under a "Tools" dropdown so nothing breaks.

**Edge functions**
- No new edge functions required for v1. Approve & Post reuses `telegram-bot-handler`. WhatsApp formatting is client-side.
- Future: a `scout-v2-ingest` function if Python backend wants to call us instead of writing directly to Postgres — not in this plan.

---

## Migration summary (one combined migration)

1. `ALTER TABLE israel_editor_products ADD COLUMN audit_notes text, ADD COLUMN archived_at timestamptz;`
2. Same for `amazon_editor_products`.
3. Indexes on `(source, is_active, archived_at)`.
4. CREATE `growth_metrics`, `revenue_uploads`, `investigation_posts`, `roadmap_metrics` (all admin-only RLS via `has_role`).

---

## Out of scope (flag for later)
- Auto-pull from Amazon/AliExpress reports API (you'll keep using CSV uploads for now).
- WhatsApp posting automation (manual paste stays manual).
- Realtime subscription on drafts (poll on tab focus + manual refresh button is enough for v1).

Approve and I'll execute the migration first, then build the four tabs in the order listed.