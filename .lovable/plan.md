## Goal
Build a secure Edge Function `auditor-ingest` that lets your local Python Auditor script push audited products into `israel_editor_products` (AliExpress) or `amazon_editor_products` (Amazon), authenticated with a custom `AUDITOR_API_KEY` — no Service Role Key ever leaves Lovable Cloud.

## Architecture

```text
Python (local)  ──POST──►  Edge Function: auditor-ingest
                            │  1. Verify x-api-key == AUDITOR_API_KEY
                            │  2. Validate body with Zod
                            │  3. Route by `platform` field
                            │  4. Insert via service-role client (server-side only)
                            └──► israel_editor_products  OR  amazon_editor_products
```

## Steps

### 1. Add the secret
Request `AUDITOR_API_KEY` via `add_secret` — you generate a long random string (e.g. `openssl rand -hex 32`) and paste it. Stored only in Lovable Cloud, never in code or git.

### 2. Create the Edge Function
File: `supabase/functions/auditor-ingest/index.ts`

Behavior:
- `POST` only (reject others with 405)
- Header `x-api-key` must equal `AUDITOR_API_KEY` (constant-time compare) → else 401
- Body validated with Zod
- Uses `SUPABASE_SERVICE_ROLE_KEY` server-side to insert (bypasses RLS safely)
- Returns `{ success: true, id, table }` on success, or `{ success: false, error }` with proper status code

### 3. Request body schema

Common fields you listed mapped to actual table columns:

| Your field | israel_editor_products | amazon_editor_products |
|---|---|---|
| `platform` (required: `"israel"` or `"amazon"`) | — routing — | — routing — |
| `name` (Hebrew) | `product_name_hebrew` | `product_name_hebrew` |
| `name_english` (optional) | `product_name_english` | `product_name_english` |
| `url` | `tracking_link` | `tracking_link` |
| `category` (Hebrew, must be one of 8 unified) | `category_name_hebrew` | `category_name_hebrew` |
| `price_usd` | `price_usd` | `price_usd` |
| `original_price_usd` | `original_price_usd` | `original_price_usd` |
| `discount_percentage` | `discount_percentage` | `discount_percentage` |
| `rating` | `rating` | `rating` |
| `sales_count` | `sales_count` | `sales_count` |
| `image_url` | `image_url` | `image_url` |
| `content` / `audit_notes` | `audit_notes` | `audit_notes` |
| `external_id` | `aliexpress_product_id` | `asin` |
| `brand` (Amazon only) | — | `brand` |
| auto | `source = 'auditor'` | `source = 'auditor'` |

Validation rules:
- `platform` ∈ {`israel`, `amazon`}
- `name` non-empty, max 500
- `url` valid URL
- `category` ∈ the 8 unified Hebrew categories (Gadgets, Auto, Home, Fashion, Kids, Health, Tools, General — Hebrew names)
- `image_url` optional valid URL
- All numerics non-negative

### 4. Response shape
```json
// Success
{ "success": true, "id": "uuid", "table": "israel_editor_products" }

// Auth fail (401)
{ "success": false, "error": "Unauthorized" }

// Validation fail (400)
{ "success": false, "error": { "field": ["message"] } }

// DB fail (500)
{ "success": false, "error": "DB error: ..." }
```

### 5. Python example
Provide a clean `requests`-based snippet showing:
- Reading `AUDITOR_API_KEY` from local `.env`
- Posting a sample product
- Handling success / 4xx / 5xx

### 6. Deploy & smoke test
- Deploy `auditor-ingest`
- Run a curl test from the sandbox with a fake product (Israel) and verify a row appears in `israel_editor_products`
- Repeat for Amazon
- Confirm 401 when wrong key, 400 when bad body

## Security notes

- **`verify_jwt = false`** (set in `supabase/config.toml` for this function) — the function authenticates via `x-api-key`, not Supabase auth.
- Service Role key never leaves the function runtime; Python only ever sees `AUDITOR_API_KEY`.
- Add basic in-memory rate limit (e.g. 30 req/min per key) — best-effort, since edge functions are stateless across instances.
- If `AUDITOR_API_KEY` ever leaks, you rotate one secret in Lovable Cloud — no DB exposure.

## What I will NOT change
- No changes to existing tables, RLS, or other functions.
- Won't touch the canonical feed tables (`feed_products`, `aliexpress_feed_products`) — only the editor tables, per your request.

---

Approve this plan and I'll request the `AUDITOR_API_KEY` secret first, then build the function and give you the Python snippet.