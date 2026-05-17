// Auditor Ingest — accepts audited products from local Python script
// Auth: custom x-api-key header (AUDITOR_API_KEY)
// Routes to israel_editor_products or amazon_editor_products
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UNIFIED_CATEGORIES_HE = [
  "גאדג'טים",
  "רכב",
  "בית",
  "אופנה",
  "ילדים",
  "בריאות",
  "כלים",
  "כללי",
];

const BodySchema = z.object({
  platform: z.enum(["israel", "amazon"]),
  name: z.string().trim().min(1).max(500),
  name_english: z.string().trim().max(500).optional(),
  url: z.string().trim().url().max(2000),
  category: z.string().trim().min(1).max(100),
  price_usd: z.number().nonnegative().optional(),
  original_price_usd: z.number().nonnegative().optional(),
  discount_percentage: z.number().int().min(0).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  sales_count: z.number().int().nonnegative().optional(),
  image_url: z.string().trim().url().max(2000).optional(),
  content: z.string().trim().max(5000).optional(),
  external_id: z.string().trim().max(200).optional(),
  brand: z.string().trim().max(200).optional(),
});

// Constant-time string compare to avoid timing attacks
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Best-effort in-memory rate limit (per instance)
const rl = new Map<string, { count: number; reset: number }>();
function rateLimited(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rl.get(key);
  if (!entry || entry.reset < now) {
    rl.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return json({ success: false, error: "Method not allowed" }, 405);

  const AUDITOR_API_KEY = Deno.env.get("AUDITOR_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!AUDITOR_API_KEY || !SUPABASE_URL || !SERVICE_ROLE) {
    return json({ success: false, error: "Server misconfigured" }, 500);
  }

  const provided = req.headers.get("x-api-key") ?? "";
  if (!provided || !safeEqual(provided, AUDITOR_API_KEY)) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  if (rateLimited("auditor")) {
    return json({ success: false, error: "Rate limit exceeded" }, 429);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const p = parsed.data;

  if (!UNIFIED_CATEGORIES_HE.includes(p.category)) {
    return json(
      {
        success: false,
        error: `category must be one of: ${UNIFIED_CATEGORIES_HE.join(", ")}`,
      },
      400,
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const common = {
    product_name_hebrew: p.name,
    product_name_english: p.name_english ?? null,
    tracking_link: p.url,
    category_name_hebrew: p.category,
    price_usd: p.price_usd ?? null,
    original_price_usd: p.original_price_usd ?? null,
    discount_percentage: p.discount_percentage ?? null,
    rating: p.rating ?? null,
    sales_count: p.sales_count ?? 0,
    image_url: p.image_url ?? null,
    audit_notes: p.content ?? null,
    source: "scout_v2",
    is_active: false,
  };

  const table =
    p.platform === "israel" ? "israel_editor_products" : "amazon_editor_products";

  const row =
    p.platform === "israel"
      ? { ...common, aliexpress_product_id: p.external_id ?? null }
      : { ...common, asin: p.external_id ?? null, brand: p.brand ?? null };

  const { data, error } = await supabase
    .from(table)
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("Insert failed", { table, error });
    return json({ success: false, error: `DB error: ${error.message}` }, 500);
  }

  return json({ success: true, id: data.id, table });
});
