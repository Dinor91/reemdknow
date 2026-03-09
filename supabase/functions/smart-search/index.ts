import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto as stdCrypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hard-coded exchange rates
const RATES = { USD_TO_THB: 37, ILS_TO_USD: 0.27, ILS_TO_THB: 10 };

interface ExtractedParams {
  search_terms_english: string[];
  search_terms_thai: string[];
  search_terms_hebrew: string[];
  max_budget_usd: number | null;
  max_budget_thb: number | null;
  min_rating: number;
  brand: string | null;
  platform: "lazada" | "aliexpress" | "israel" | "all";
  priority: "price" | "rating" | "popular";
  use_case: string | null;
}

interface NormalizedProduct {
  id: string;
  platform: "lazada" | "aliexpress" | "israel";
  platform_label: string;
  product_name: string;
  price_display: string;
  price_usd: number;
  original_price_display: string | null;
  discount_percentage: number | null;
  rating: number;
  sales_count: number;
  image_url: string;
  tracking_link: string;
  category: string | null;
  is_featured: boolean;
  is_live_result?: boolean;
  source?: "feed" | "curated" | "live";
}

async function callGemini(messages: { role: string; content: string }[]): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();
    console.error("Gemini error:", status, text);
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJsonFromAI(text: string): any {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned);
}

async function extractParams(message: string): Promise<ExtractedParams> {
  const systemPrompt = `You are a product search assistant.
Extract search parameters from a customer message.
Return ONLY a valid JSON object, no extra text:
{
  "search_terms_english": string[],   // 3-5 keywords in English for product search
  "search_terms_thai": string[],      // Same keywords translated to Thai
  "search_terms_hebrew": string[],    // Original or translated Hebrew keywords
  "max_budget_usd": number | null,    // Convert any currency to USD. ILS÷3.7, THB÷37. null if no budget
  "max_budget_thb": number | null,    // Convert any currency to THB. USD×37, ILS×10. null if no budget
  "min_rating": number,               // Default 4.0. 'good quality'→4.2, 'best'→4.5
  "brand": string | null,             // Extract brand name if mentioned, null otherwise
  "platform": "lazada"|"aliexpress"|"israel"|"all", // 'lazada' if Thailand/Lazada, 'aliexpress' if Israel/AliExpress, 'all' if unspecified
  "priority": "price"|"rating"|"popular", // 'price' if cheap/budget/זול, 'popular' if bestseller/נמכר, 'rating' default
  "use_case": string | null           // What is it for, keep in original language
}`;

  const raw = await callGemini([
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ]);

  const params = parseJsonFromAI(raw) as ExtractedParams;

  // Defaults
  if (!params.search_terms_english) params.search_terms_english = [];
  if (!params.search_terms_thai) params.search_terms_thai = [];
  if (!params.search_terms_hebrew) params.search_terms_hebrew = [];
  if (!params.min_rating) params.min_rating = 4.0;
  if (!params.platform) params.platform = "all";
  if (!params.priority) params.priority = "rating";

  return params;
}

function splitTerms(terms: string[]): string[] {
  const result: string[] = [];
  for (const term of terms) {
    result.push(term); // keep original compound term
    // Also add individual words (2+ chars) for broader matching
    const words = term.split(/\s+/).filter((w) => w.length >= 2);
    if (words.length > 1) {
      for (const word of words) result.push(word);
    }
  }
  return [...new Set(result)];
}

function buildOrFilter(fields: string[], terms: string[]): string {
  const expanded = splitTerms(terms);
  const conditions: string[] = [];
  for (const field of fields) {
    for (const term of expanded) {
      conditions.push(`${field}.ilike.%${term}%`);
    }
  }
  return conditions.join(",");
}

async function searchLazada(
  supabase: any,
  params: ExtractedParams,
  tier: 1 | 2 | 3 = 1
): Promise<NormalizedProduct[]> {
  const terms = [...params.search_terms_english, ...params.search_terms_thai];
  if (terms.length === 0) return [];

  const budgetThb = tier === 3 && params.max_budget_thb
    ? Math.round(params.max_budget_thb * 1.2) // Tier 3: expand budget +20%
    : params.max_budget_thb;

  let query = supabase
    .from("feed_products")
    .select(
      "id, product_name, price_thb, original_price_thb, rating, sales_7d, brand_name, category_name_hebrew, tracking_link, image_url, discount_percentage"
    )
    .eq("out_of_stock", false)
    .or(buildOrFilter(["product_name"], terms));

  if (budgetThb != null) query = query.lte("price_thb", budgetThb);

  // Lazada tiers use sales_7d only (no rating/mall data from API)
  // Tier 1: sales_7d >= 5 + brand filter
  // Tier 2: sales_7d >= 1 + brand filter
  // Tier 3: no extra filters, budget +20%
  if (tier === 1) {
    query = query.gte("sales_7d", 5);
    if (params.brand) query = query.ilike("brand_name", `%${params.brand}%`);
  } else if (tier === 2) {
    query = query.gte("sales_7d", 1);
    if (params.brand) query = query.ilike("brand_name", `%${params.brand}%`);
  }
  // Tier 3: no extra filters

  query = query.order("rating", { ascending: false, nullsFirst: false }).order("sales_7d", { ascending: false, nullsFirst: false }).limit(10);

  const { data, error } = await query;
  if (error) {
    console.error(`Lazada search (tier ${tier}) error:`, error);
    return [];
  }

  console.log(`Lazada tier ${tier}: ${(data || []).length} results`);

  return (data || []).map((p: any) => ({
    id: p.id,
    platform: "lazada" as const,
    platform_label: "🇹🇭 Lazada",
    product_name: p.product_name,
    price_display: `฿${Math.round(p.price_thb || 0).toLocaleString()}`,
    price_usd: (p.price_thb || 0) / RATES.USD_TO_THB,
    original_price_display: p.original_price_thb ? `฿${Math.round(p.original_price_thb).toLocaleString()}` : null,
    discount_percentage: p.discount_percentage,
    rating: p.rating || 0,
    sales_count: p.sales_7d || 0,
    image_url: p.image_url || "",
    tracking_link: p.tracking_link || "",
    category: p.category_name_hebrew,
    is_featured: false,
    source: "feed" as const,
    search_tier: tier,
  }));
}

// ========== Curated category_products search (Thailand manual DB) ==========
async function searchCurated(
  supabase: any,
  params: ExtractedParams
): Promise<NormalizedProduct[]> {
  const terms = [...params.search_terms_english, ...params.search_terms_hebrew];
  if (terms.length === 0) return [];

  const budgetThb = params.max_budget_thb;

  // Build OR filter across name_hebrew, name_english, and category
  const expanded = splitTerms(terms);
  const conditions: string[] = [];
  for (const term of expanded) {
    conditions.push(`name_hebrew.ilike.%${term}%`);
    conditions.push(`name_english.ilike.%${term}%`);
    conditions.push(`category.ilike.%${term}%`);
  }

  let query = supabase
    .from("category_products")
    .select("id, name_hebrew, name_english, price_thb, image_url, affiliate_link, category, rating, sales_count, lazada_product_id")
    .eq("is_active", true)
    .or(conditions.join(","));

  if (budgetThb != null) query = query.lte("price_thb", budgetThb);

  query = query.order("rating", { ascending: false, nullsFirst: false })
    .order("sales_count", { ascending: false, nullsFirst: false })
    .limit(10);

  const { data, error } = await query;
  if (error) {
    console.error("Curated search error:", error);
    return [];
  }

  console.log(`Curated (category_products): ${(data || []).length} results`);

  return (data || []).map((p: any) => ({
    id: `curated-${p.id}`,
    platform: "lazada" as const,
    platform_label: "🇹🇭 Lazada",
    product_name: p.name_hebrew || p.name_english || "Unknown",
    price_display: `฿${Math.round(p.price_thb || 0).toLocaleString()}`,
    price_usd: (p.price_thb || 0) / RATES.USD_TO_THB,
    original_price_display: null,
    discount_percentage: null,
    rating: p.rating || 0,
    sales_count: p.sales_count || 0,
    image_url: p.image_url || "",
    tracking_link: p.affiliate_link || "",
    category: p.category,
    is_featured: true, // curated = featured quality
    source: "curated" as const,
  }));
}

async function searchAliExpress(
  supabase: any,
  params: ExtractedParams,
  tier: 1 | 2 | 3 = 1
): Promise<NormalizedProduct[]> {
  const nameTerms = splitTerms([...params.search_terms_english]);
  const hebrewTerms = splitTerms([...params.search_terms_hebrew]);
  const allConditions: string[] = [];

  for (const t of nameTerms) allConditions.push(`product_name.ilike.%${t}%`);
  for (const t of hebrewTerms) {
    allConditions.push(`product_name.ilike.%${t}%`);
    allConditions.push(`product_name_hebrew.ilike.%${t}%`);
  }

  if (allConditions.length === 0) return [];

  const budgetUsd = tier === 3 && params.max_budget_usd
    ? Math.round(params.max_budget_usd * 1.2) // Tier 3: expand budget +20%
    : params.max_budget_usd;

  // Try featured first (only in tier 1)
  if (tier === 1) {
    let query = supabase
      .from("aliexpress_feed_products")
      .select(
        "id, product_name, product_name_hebrew, price_usd, original_price_usd, rating, sales_30d, category_name_hebrew, tracking_link, image_url, discount_percentage, is_featured"
      )
      .eq("out_of_stock", false)
      .eq("is_featured", true)
      .or(allConditions.join(","));

    if (budgetUsd != null) query = query.lte("price_usd", budgetUsd);
    query = query.gte("rating", 4.0);
    query = query.gte("sales_30d", 500);
    if (params.brand) query = query.ilike("product_name", `%${params.brand}%`);
    query = query.order("rating", { ascending: false, nullsFirst: false }).order("sales_30d", { ascending: false, nullsFirst: false }).limit(10);

    const { data: featuredData, error: featuredErr } = await query;
    if (featuredErr) console.error("AliExpress featured search error:", featuredErr);

    if (featuredData && featuredData.length >= 3) {
      console.log(`AliExpress tier 1 (featured): ${featuredData.length} results`);
      return normalizeAliProducts(featuredData);
    }
  }

  // Broader query with tier-based filters
  let fallbackQuery = supabase
    .from("aliexpress_feed_products")
    .select(
      "id, product_name, product_name_hebrew, price_usd, original_price_usd, rating, sales_30d, category_name_hebrew, tracking_link, image_url, discount_percentage, is_featured"
    )
    .eq("out_of_stock", false)
    .or(allConditions.join(","));

  if (budgetUsd != null) fallbackQuery = fallbackQuery.lte("price_usd", budgetUsd);

  if (tier === 1) {
    fallbackQuery = fallbackQuery.gte("rating", 4.0).gte("sales_30d", 500);
    if (params.brand) fallbackQuery = fallbackQuery.ilike("product_name", `%${params.brand}%`);
  } else if (tier === 2) {
    fallbackQuery = fallbackQuery.gte("rating", 3.5);
    if (params.brand) fallbackQuery = fallbackQuery.ilike("product_name", `%${params.brand}%`);
  }
  // Tier 3: no extra filters

  fallbackQuery = fallbackQuery.order("rating", { ascending: false, nullsFirst: false }).order("sales_30d", { ascending: false, nullsFirst: false }).limit(10);

  const { data: allData, error: allErr } = await fallbackQuery;
  if (allErr) console.error(`AliExpress tier ${tier} search error:`, allErr);

  console.log(`AliExpress tier ${tier}: ${(allData || []).length} results`);
  return normalizeAliProducts(allData || []);
}

function normalizeAliProducts(data: any[]): NormalizedProduct[] {
  return data.map((p: any) => ({
    id: p.id,
    platform: "aliexpress" as const,
    platform_label: "🇮🇱 AliExpress",
    product_name: p.product_name_hebrew || p.product_name,
    price_display: `$${(p.price_usd || 0).toFixed(2)}`,
    price_usd: p.price_usd || 0,
    original_price_display: p.original_price_usd ? `$${p.original_price_usd.toFixed(2)}` : null,
    discount_percentage: p.discount_percentage,
    rating: p.rating || 0,
    sales_count: p.sales_30d || 0,
    image_url: p.image_url || "",
    tracking_link: p.tracking_link || "",
    category: p.category_name_hebrew,
    is_featured: p.is_featured || false,
  }));
}

async function searchIsrael(
  supabase: any,
  params: ExtractedParams,
  tier: 1 | 2 | 3 = 1
): Promise<NormalizedProduct[]> {
  const hebrewConds = splitTerms(params.search_terms_hebrew).map((t) => `product_name_hebrew.ilike.%${t}%`);
  const engConds = splitTerms(params.search_terms_english).map((t) => `product_name_english.ilike.%${t}%`);
  const allConditions = [...hebrewConds, ...engConds];

  if (allConditions.length === 0) return [];

  const budgetUsd = tier === 3 && params.max_budget_usd
    ? Math.round(params.max_budget_usd * 1.2)
    : params.max_budget_usd;

  let query = supabase
    .from("israel_editor_products")
    .select(
      "id, product_name_hebrew, product_name_english, price_usd, original_price_usd, rating, sales_count, category_name_hebrew, tracking_link, image_url, discount_percentage"
    )
    .eq("out_of_stock", false)
    .eq("is_active", true)
    .or(allConditions.join(","));

  if (budgetUsd != null) query = query.lte("price_usd", budgetUsd);

  // Israel editor products are curated, so tier filters are lighter
  if (tier === 1) {
    if (params.brand) query = query.ilike("product_name_english", `%${params.brand}%`);
  } else if (tier === 2) {
    if (params.brand) query = query.ilike("product_name_english", `%${params.brand}%`);
  }
  // Tier 3: no brand filter

  query = query.order("rating", { ascending: false, nullsFirst: false }).order("sales_count", { ascending: false, nullsFirst: false }).limit(10);

  const { data, error } = await query;
  if (error) {
    console.error(`Israel search (tier ${tier}) error:`, error);
    return [];
  }

  console.log(`Israel tier ${tier}: ${(data || []).length} results`);

  return (data || []).map((p: any) => ({
    id: p.id,
    platform: "aliexpress" as const,
    platform_label: "🇮🇱 AliExpress",
    product_name: p.product_name_hebrew || p.product_name_english,
    price_display: `$${(p.price_usd || 0).toFixed(2)}`,
    price_usd: p.price_usd || 0,
    original_price_display: p.original_price_usd ? `$${p.original_price_usd.toFixed(2)}` : null,
    discount_percentage: p.discount_percentage,
    rating: p.rating || 0,
    sales_count: p.sales_count || 0,
    image_url: p.image_url || "",
    tracking_link: p.tracking_link || "",
    category: p.category_name_hebrew,
    is_featured: true,
  }));
}

// ========== AliExpress LIVE API Fallback ==========
const ALIEXPRESS_APP_KEY = Deno.env.get("ALIEXPRESS_APP_KEY")?.trim();
const ALIEXPRESS_APP_SECRET = Deno.env.get("ALIEXPRESS_APP_SECRET")?.trim();
const ALIEXPRESS_TRACKING_ID = Deno.env.get("ALIEXPRESS_TRACKING_ID")?.trim();
const ALIEXPRESS_API_URL = "https://api-sg.aliexpress.com/sync";

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function generateAliSignature(params: Record<string, string>, appSecret: string): Promise<string> {
  const sortedString = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
  const signStr = appSecret + sortedString + appSecret;
  const encoder = new TextEncoder();
  const hashBuffer = await stdCrypto.subtle.digest('MD5', encoder.encode(signStr));
  return toHex(new Uint8Array(hashBuffer));
}

async function searchAliExpressLive(params: ExtractedParams): Promise<NormalizedProduct[]> {
  if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET) {
    console.error("AliExpress API credentials not configured for live search");
    return [];
  }

  const keywords = params.search_terms_english.join(" ");
  if (!keywords) return [];

  console.log(`🔴 LIVE AliExpress search: "${keywords}"`);

  const apiParams: Record<string, string> = {
    app_key: ALIEXPRESS_APP_KEY,
    method: "aliexpress.affiliate.product.query",
    timestamp: Date.now().toString(),
    sign_method: "md5",
    v: "2.0",
    keywords,
    page_no: "1",
    page_size: "10",
    target_currency: "USD",
    target_language: "EN",
  };

  if (ALIEXPRESS_TRACKING_ID) apiParams.tracking_id = ALIEXPRESS_TRACKING_ID;

  // Sort mapping
  if (params.priority === "price") apiParams.sort = "SALE_PRICE_ASC";
  else if (params.priority === "popular") apiParams.sort = "LAST_VOLUME_DESC";

  // Budget filter (AliExpress uses cents for price filter)
  if (params.max_budget_usd && params.max_budget_usd > 0) {
    apiParams.max_sale_price = (params.max_budget_usd * 100).toString();
  }

  try {
    const signature = await generateAliSignature(apiParams, ALIEXPRESS_APP_SECRET);
    apiParams.sign = signature;

    const queryString = Object.entries(apiParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const response = await fetch(`${ALIEXPRESS_API_URL}?${queryString}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    console.log("AliExpress live response:", JSON.stringify(data).substring(0, 500));

    // Extract products from response
    const respBody = data?.aliexpress_affiliate_product_query_response?.resp_result?.result;
    const products = respBody?.products?.product || [];

    console.log(`AliExpress live returned ${products.length} products`);

    // Filter out products without affiliate tracking links
    return products
      .filter((p: any) => p.promotion_link && p.promotion_link.trim() !== "")
      .map((p: any, i: number) => {
        const salePrice = parseFloat(p.target_sale_price || p.target_original_price || "0");
        const originalPrice = parseFloat(p.target_original_price || "0");
        const discount = originalPrice > salePrice && originalPrice > 0
          ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
          : null;

        return {
          id: `live-ali-${p.product_id || i}`,
          platform: "aliexpress" as const,
          platform_label: "🇮🇱 AliExpress Live",
          product_name: p.product_title || "Unknown",
          price_display: `$${salePrice.toFixed(2)}`,
          price_usd: salePrice,
          original_price_display: originalPrice > salePrice ? `$${originalPrice.toFixed(2)}` : null,
          discount_percentage: discount,
          rating: parseFloat(p.evaluate_rate?.replace("%", "") || "0") / 20,
          sales_count: parseInt(p.lastest_volume || "0"),
          image_url: p.product_main_image_url || "",
          tracking_link: p.promotion_link,
          category: null,
          is_featured: false,
          is_live_result: true,
        };
      });
  } catch (error) {
    console.error("AliExpress live search error:", error);
    return [];
  }
}

// ========== Lazada LIVE Category Fallback ==========
const LAZADA_APP_KEY = Deno.env.get("LAZADA_APP_KEY")?.trim();
const LAZADA_APP_SECRET = Deno.env.get("LAZADA_APP_SECRET")?.trim();
const LAZADA_USER_TOKEN = Deno.env.get("LAZADA_ACCESS_TOKEN")?.trim();
const LAZADA_API_URL = "https://api.lazada.co.th/rest";

const LAZADA_CATEGORY_MAP: Record<string, string> = {
  // Electronics/Gadgets (42062201)
  "earbuds": "42062201", "headphone": "42062201", "speaker": "42062201",
  "bluetooth": "42062201", "wireless audio": "42062201", "gadget": "42062201",
  "smart device": "42062201", "led": "42062201", "usb": "42062201", "charger": "42062201",
  "electronic": "42062201", "power bank": "42062201", "adapter": "42062201",
  // Fashion (3008)
  "clothing": "3008", "shirt": "3008", "dress": "3008", "pants": "3008",
  "shoes": "3008", "fashion": "3008", "wear": "3008", "outfit": "3008",
  "swimwear": "3008", "bikini": "3008", "jacket": "3008", "sneaker": "3008",
  "bag": "3008", "jewelry": "3008", "necklace": "3008", "bracelet": "3008",
  "sunglasses": "3008", "hat": "3008", "scarf": "3008",
  // Health (10100869)
  "medical": "10100869", "health": "10100869", "supplement": "10100869",
  "vitamin": "10100869", "massage": "10100869", "fitness tracker": "10100869",
  "blood pressure": "10100869", "pharmacy": "10100869", "thermometer": "10100869",
  // Home & Kitchen (3833)
  "oven": "3833", "blender": "3833", "rice cooker": "3833",
  "kitchen": "3833", "cooking": "3833", "appliance": "3833",
  "vacuum": "3833", "air purifier": "3833", "fan": "3833", "coffee": "3833",
  // Toys & Games (5090) - includes musical instruments
  "toy": "5090", "game": "5090", "puzzle": "5090", "lego": "5090",
  "board game": "5090", "doll": "5090", "action figure": "5090",
  "instrument": "5090", "saxophone": "5090", "guitar": "5090", "piano": "5090",
  "ukulele": "5090", "violin": "5090", "drum": "5090", "flute": "5090",
  "music": "5090", "musical": "5090",
  // Baby & Kids (5095)
  "baby": "5095", "infant": "5095", "toddler": "5095", "kid": "5095",
  "children": "5095", "stroller": "5095", "diaper": "5095",
  "nursery": "5095", "child": "5095",
  // Sports/Outdoor (5761)
  "sport": "5761", "exercise": "5761", "gym": "5761", "yoga": "5761",
  "camping": "5761", "hiking": "5761", "outdoor": "5761",
  "bicycle": "5761", "swimming": "5761", "fitness": "5761",
  // Automotive (8428)
  "car": "8428", "vehicle": "8428", "motorcycle": "8428",
  "auto": "8428", "driving": "8428", "parking": "8428", "tire": "8428",
  // Tools/DIY (11830)
  "tool": "11830", "diy": "11830", "drill": "11830", "hammer": "11830",
  "repair": "11830", "hardware": "11830", "workshop": "11830", "screwdriver": "11830",
  // Phones (3835)
  "phone": "3835", "smartphone": "3835", "iphone": "3835",
  "android": "3835", "mobile": "3835", "sim": "3835", "tablet": "3835",
  // Computers (3836)
  "laptop": "3836", "computer": "3836", "pc": "3836",
  "keyboard": "3836", "mouse": "3836", "monitor": "3836",
  // Cameras (10100245)
  "camera": "10100245", "drone": "10100245", "gopro": "10100245",
  "photography": "10100245", "lens": "10100245",
  // Pets (10100387)
  "pet": "10100387", "dog": "10100387", "cat": "10100387",
  // Furniture (62541004)
  "furniture": "62541004", "sofa": "62541004", "table": "62541004", "chair": "62541004",
  // Watches (5955)
  "watch": "5955", "smartwatch": "5955",
  // Home/Decor (11829)
  "home": "11829", "decor": "11829", "storage": "11829", "pillow": "11829", "blanket": "11829",
  // Media & Entertainment (3838)
  "media": "3838", "book": "3838", "dvd": "3838", "vinyl": "3838",
};

async function generateLazadaSignature(apiPath: string, params: Record<string, string>, appSecret: string): Promise<string> {
  const sortedParams = Object.keys(params).sort().map(k => `${k}${params[k]}`).join("");
  const signStr = apiPath + sortedParams;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(appSecret);
  const messageData = encoder.encode(signStr);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function callLazadaLiveAPI(apiPath: string, additionalParams: Record<string, string> = {}) {
  const params: Record<string, string> = {
    app_key: LAZADA_APP_KEY!,
    timestamp: Date.now().toString(),
    sign_method: "sha256",
    userToken: LAZADA_USER_TOKEN!,
    ...additionalParams,
  };
  const signature = await generateLazadaSignature(apiPath, params, LAZADA_APP_SECRET!);
  params.sign = signature;
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const url = `${LAZADA_API_URL}${apiPath}?${qs}`;
  const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  return await response.json();
}

async function searchLazadaLive(params: ExtractedParams, originalMessage: string): Promise<NormalizedProduct[]> {
  if (!LAZADA_APP_KEY || !LAZADA_APP_SECRET || !LAZADA_USER_TOKEN) {
    console.error("Lazada API credentials not configured for live search");
    return [];
  }

  // Map keywords to categoryL1
  const keywords = params.search_terms_english.join(" ").toLowerCase();
  let categoryL1: string | null = null;
  for (const [keyword, catId] of Object.entries(LAZADA_CATEGORY_MAP)) {
    if (keywords.includes(keyword)) {
      categoryL1 = catId;
      break;
    }
  }

  if (!categoryL1) {
    // Ask Gemini to map
    try {
      const mapPrompt = `Map this product request to ONE Lazada categoryL1 ID.
Available categories: ${JSON.stringify(Object.fromEntries([
        ["3008","Fashion/Clothing/Shoes"],["10100869","Health/Medical/Supplements"],["3833","Kitchen/Appliances"],["8428","Automotive"],
        ["11830","Tools/DIY/Hardware"],["42062201","Electronics/Gadgets/Audio"],["5761","Sports/Outdoor/Camping"],["10100387","Pet Supplies"],
        ["5090","Toys/Games/Musical Instruments"],["3835","Phones/Tablets"],["3836","Computers/Laptops"],["5095","Baby/Kids/Children"],
        ["62541004","Furniture"],["5955","Watches"],["11829","Home/Decor"],["10100245","Cameras/Drones/Photography"],
        ["3838","Media/Entertainment/Books"]
      ]))}
Request: "${originalMessage}"
Return ONLY the category ID number as a string, nothing else.`;
      const mapped = await callGemini([
        { role: "system", content: mapPrompt },
        { role: "user", content: "Return the categoryL1 ID." },
      ]);
      const cleaned = mapped.trim().replace(/[^0-9]/g, "");
      if (cleaned.length > 0) categoryL1 = cleaned;
    } catch (e) {
      console.error("Gemini category mapping failed:", e);
    }
  }

  if (!categoryL1) {
    console.log("Could not map to Lazada category, skipping live search");
    return [];
  }

  console.log(`🔴 LIVE Lazada search: category ${categoryL1} for "${keywords}"`);

  try {
    // Fetch products from feed by category
    const feedResult = await callLazadaLiveAPI("/marketing/product/feed", {
      offerType: "1",
      categoryL1,
      page: "1",
      limit: "20",
    });

    const products = feedResult?.result?.data || [];
    if (products.length === 0) return [];

    console.log(`Lazada live feed returned ${products.length} products for category ${categoryL1}`);

    // Batch get tracking links
    const productIds = products.map((p: any) => String(p.productId));
    const linkMap = new Map<string, string>();
    try {
      const linkResult = await callLazadaLiveAPI("/marketing/getlink", {
        inputType: "productId",
        inputValue: productIds.join(","),
      });
      const links = linkResult?.result?.data?.productBatchGetLinkInfoList || [];
      for (const link of links) {
        if (link.productId && link.regularPromotionLink) {
          linkMap.set(String(link.productId), link.regularPromotionLink);
        }
      }
    } catch (e) {
      console.error("Error getting Lazada tracking links:", e);
    }

    // Normalize products - ONLY include those with valid affiliate tracking links
    const normalized: NormalizedProduct[] = products
      .filter((p: any) => !p.outOfStock && p.discountPrice > 0 && p.pictures?.length > 0)
      .filter((p: any) => linkMap.has(String(p.productId))) // Remove products without affiliate links
      .map((p: any, i: number) => {
        const pid = String(p.productId);
        const price = parseFloat(p.discountPrice || "0");
        const originalPrice = parseFloat(p.originalPrice || "0");
        const discount = originalPrice > price && originalPrice > 0
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : null;

        return {
          id: `live-laz-${pid}`,
          platform: "lazada" as const,
          platform_label: "🇹🇭 Lazada Live",
          product_name: p.productName || "Unknown",
          price_display: `฿${Math.round(price).toLocaleString()}`,
          price_usd: price / RATES.USD_TO_THB,
          original_price_display: originalPrice > price ? `฿${Math.round(originalPrice).toLocaleString()}` : null,
          discount_percentage: discount,
          rating: p.ratingScore || 0,
          sales_count: p.sales7d || 0,
          image_url: p.pictures?.[0] || "",
          tracking_link: linkMap.get(pid)!,
          category: null,
          is_featured: false,
          is_live_result: true,
        };
      });

    console.log(`Lazada live: ${products.length} fetched, ${normalized.length} with affiliate links`);

    // If we have enough results, ask Gemini to filter the most relevant ones
    if (normalized.length > 5) {
      try {
        const filterPrompt = `From these ${normalized.length} products in category ${categoryL1}, select the 5 most relevant to: "${originalMessage}"
Return ONLY a JSON array of product IDs (the "id" field): ["live-laz-123", ...]`;
        const filterResult = await callGemini([
          { role: "system", content: filterPrompt },
          { role: "user", content: JSON.stringify(normalized.map(p => ({ id: p.id, name: p.product_name, price: p.price_display }))) },
        ]);
        const selectedIds = parseJsonFromAI(filterResult) as string[];
        if (Array.isArray(selectedIds) && selectedIds.length > 0) {
          const filtered = normalized.filter(p => selectedIds.includes(p.id));
          if (filtered.length >= 3) return filtered;
        }
      } catch (e) {
        console.error("Gemini filtering failed, returning all:", e);
      }
    }

    return normalized.slice(0, 10);
  } catch (error) {
    console.error("Lazada live search error:", error);
    return [];
  }
}

function getSuggestion(params: ExtractedParams): string {
  if (params.brand) return `המותג ${params.brand} לא נמצא במאגר. נסה ללא מותג ספציפי`;
  if (params.max_budget_usd && params.max_budget_usd < 5) return "נסה להגדיל את התקציב";
  return "נסה מילות חיפוש אחרות או הרחב את הקריטריונים";
}

function buildLazadaDirectLink(params: ExtractedParams): string | null {
  const keywords = params.search_terms_english.join("+");
  if (!keywords) return null;
  let url = `https://www.lazada.co.th/catalog/?q=${encodeURIComponent(keywords).replace(/%20/g, "+")}`;
  if (params.max_budget_thb && params.max_budget_thb > 0) {
    url += `&price=0-${Math.round(params.max_budget_thb)}`;
  }
  return url;
}

function buildNotFoundMessage(params: ExtractedParams): string {
  const lazadaLink = buildLazadaDirectLink(params);
  let msg = "לא מצאתי מוצר תואם לחיפוש שלך 😕";
  if (lazadaLink) {
    msg += `\n\nחפש ישירות ב-Lazada:\n🔗 ${lazadaLink}`;
  } else {
    msg += "\nנסה מילות חיפוש אחרות או הרחב את התקציב";
  }
  return msg;
}

async function rankResults(
  allProducts: NormalizedProduct[],
  originalMessage: string,
  params: ExtractedParams
): Promise<any[]> {
  const pickCount = Math.min(3, allProducts.length);
  const systemPrompt = `From these products, select exactly ${pickCount} that best match this customer request: "${originalMessage}"

Extracted parameters: ${JSON.stringify(params)}

Available products:
${JSON.stringify(allProducts.map((p) => ({ id: p.id, platform: p.platform, name: p.product_name, price_usd: p.price_usd, price_display: p.price_display, rating: p.rating, sales: p.sales_count })), null, 2)}

Return ONLY a valid JSON array of exactly ${pickCount} items:
[
  {
    "rank": 1,
    "confidence": 85,
    "label": "best_price",
    "label_hebrew": "הכי זול",
    "label_color": "green",
    "product_id": "string",
    "platform": "string",
    "explanation_hebrew": "1-2 sentences in Hebrew explaining why this product matches"
  },
  {
    "rank": 2,
    "confidence": 70,
    "label": "best_rated",
    "label_hebrew": "הדירוג הכי גבוה",
    "label_color": "blue",
    "product_id": "string",
    "platform": "string",
    "explanation_hebrew": "..."
  },
  {
    "rank": 3,
    "confidence": 55,
    "label": "best_value",
    "label_hebrew": "התמורה הכי טובה",
    "label_color": "orange",
    "product_id": "string",
    "platform": "string",
    "explanation_hebrew": "..."
  }
]
Rules:
- "confidence" is 0-100: how well this product matches the customer request. 90+ = perfect match, 70-89 = good, 50-69 = partial, below 50 = not relevant
- Be STRICT with confidence: if a product is a completely different category or type than requested, score it below 30
- Each product must be different (unique product_id)
- If priority=price → rank 1 must be cheapest
- If priority=rating → rank 1 must be highest rated
- If priority=popular → rank 1 must have most sales
- Mention price and rating in explanations
- If brand was requested but not found, mention honestly`;

  const raw = await callGemini([
    { role: "system", content: systemPrompt },
    { role: "user", content: "Select and rank the 3 best products." },
  ]);

  return parseJsonFromAI(raw);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { message, platform_override } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return new Response(
        JSON.stringify({ success: false, message: "הודעה קצרה מדי" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step A: Extract parameters
    console.log("Extracting params from:", message.substring(0, 100));
    const params = await extractParams(message);
    console.log("Extracted params:", JSON.stringify(params));

    // Apply platform override from dropdown (takes priority over Gemini detection)
    const effectivePlatform = platform_override && platform_override !== "all" 
      ? platform_override 
      : params.platform;
    console.log("Platform override:", platform_override, "Effective:", effectivePlatform);

    // Step B: Search all tables in parallel
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const shouldSearchLazada = effectivePlatform === "all" || effectivePlatform === "lazada";
    const shouldSearchAli = effectivePlatform === "all" || effectivePlatform === "aliexpress" || effectivePlatform === "israel";
    const shouldSearchIsrael = effectivePlatform === "all" || effectivePlatform === "israel" || effectivePlatform === "aliexpress";

    // ════════════════════════════════════════════
    // 3-TIER DB SEARCH SYSTEM
    // Tier 1: strict (rating 4+, high sales, brand)
    // Tier 2: relaxed (rating 3.5+, no sales/mall)
    // Tier 3: minimum (out_of_stock only, budget +20%)
    // ════════════════════════════════════════════
    let allProducts: NormalizedProduct[] = [];
    let searchTier: 1 | 2 | 3 = 1;
    let totalScanned = 0;

    // Search curated products once (they always qualify as Tier 1)
    let curatedResults: NormalizedProduct[] = [];
    if (shouldSearchLazada) {
      curatedResults = await searchCurated(supabase, params);
    }

    // ════════════════════════════════════════════
    // For Lazada: run LIVE search in parallel with DB tiers (not just as fallback)
    // For AliExpress: live search remains a fallback only
    // ════════════════════════════════════════════
    let liveAliResults: NormalizedProduct[] = [];
    let liveLazadaResults: NormalizedProduct[] = [];
    let lazadaLivePromise: Promise<NormalizedProduct[]> | null = null;

    if (shouldSearchLazada) {
      console.log("📡 Starting Lazada LIVE search in parallel with DB tiers...");
      lazadaLivePromise = searchLazadaLive(params, message).catch(err => {
        console.error("Lazada live parallel search error:", err);
        return [] as NormalizedProduct[];
      });
    }

    for (const tier of [1, 2, 3] as const) {
      searchTier = tier;
      console.log(`\n🔍 === TIER ${tier} SEARCH ===`);

      const [lazadaResults, aliResults, israelResults] = await Promise.all([
        shouldSearchLazada ? searchLazada(supabase, params, tier) : Promise.resolve([]),
        shouldSearchAli ? searchAliExpress(supabase, params, tier) : Promise.resolve([]),
        shouldSearchIsrael ? searchIsrael(supabase, params, tier) : Promise.resolve([]),
      ]);

      totalScanned = lazadaResults.length + aliResults.length + israelResults.length + curatedResults.length;
      console.log(`Tier ${tier} results: Lazada=${lazadaResults.length}, Curated=${curatedResults.length}, AliExpress=${aliResults.length}, Israel=${israelResults.length}, Total=${totalScanned}`);

      // Curated products go first (higher priority), then feed results
      allProducts = [...curatedResults, ...lazadaResults, ...aliResults, ...israelResults];

      // Tier 1 needs >= 3 results to stop
      if (tier === 1 && allProducts.length >= 3) break;
      // Tier 2 needs >= 2 results to stop
      if (tier === 2 && allProducts.length >= 2) break;
      // Tier 3 always continues
    }

    console.log(`DB search completed at tier ${searchTier} with ${allProducts.length} results`);

    // ════════════════════════════════════════════
    // MERGE LAZADA LIVE RESULTS (ran in parallel)
    // ════════════════════════════════════════════
    if (lazadaLivePromise) {
      liveLazadaResults = await lazadaLivePromise;
      if (liveLazadaResults.length > 0) {
        const existingNames = new Set(allProducts.map(p => p.product_name.toLowerCase().substring(0, 30)));
        liveLazadaResults = liveLazadaResults.filter(p => !existingNames.has(p.product_name.toLowerCase().substring(0, 30)));
        allProducts.push(...liveLazadaResults);
        console.log(`Merged ${liveLazadaResults.length} parallel Lazada LIVE results, total now: ${allProducts.length}`);
      }
    }

    // ════════════════════════════════════════════
    // ALIEXPRESS LIVE FALLBACK (only if DB results < 3)
    // ════════════════════════════════════════════
    if (allProducts.filter(p => p.platform === "aliexpress").length < 3) {
      if (shouldSearchAli || shouldSearchIsrael) {
        const israelDbCount = allProducts.filter(p => p.platform === "aliexpress").length;
        console.log(`📡 Israel results (${israelDbCount}) < 3, triggering AliExpress LIVE search...`);
        liveAliResults = await searchAliExpressLive(params);
        const existingNames = new Set(allProducts.map(p => p.product_name.toLowerCase().substring(0, 30)));
        liveAliResults = liveAliResults.filter(p => !existingNames.has(p.product_name.toLowerCase().substring(0, 30)));
        allProducts.push(...liveAliResults);
        console.log(`Added ${liveAliResults.length} live AliExpress results, total now: ${allProducts.length}`);
      }
    }

    // Deduplicate by product name (first 40 chars lowercase) before ranking
    const seen = new Map<string, NormalizedProduct>();
    for (const p of allProducts) {
      const key = p.product_name.toLowerCase().substring(0, 40);
      if (!seen.has(key)) seen.set(key, p);
    }
    allProducts = Array.from(seen.values());
    console.log(`After deduplication: ${allProducts.length} unique products`);

    // Step D: No results check — only fail if truly 0
    if (allProducts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: buildNotFoundMessage(params),
          suggestion: getSuggestion(params),
          lazada_direct_link: buildLazadaDirectLink(params),
          extracted_params: {
            product: params.search_terms_hebrew[0] || params.search_terms_english[0] || "—",
            budget: params.max_budget_usd ? `$${params.max_budget_usd.toFixed(0)}` : "ללא הגבלה",
            rating: `${params.min_rating}+`,
            brand: params.brand || null,
            platform: params.platform,
            priority: params.priority,
          },
          search_time_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step E: AI Ranking (with fallback if Gemini fails)
    let ranked: any[];
    try {
      ranked = await rankResults(allProducts, message, params);
    } catch (rankErr) {
      console.error("Gemini ranking failed, using fallback:", rankErr);
      // Fallback: sort by priority and pick top 3
      const sorted = [...allProducts].sort((a, b) => {
        if (params.priority === "price") return a.price_usd - b.price_usd;
        if (params.priority === "popular") return b.sales_count - a.sales_count;
        return b.rating - a.rating;
      });
      const labels = [
        { label_hebrew: "הכי זול", label_color: "green" },
        { label_hebrew: "הדירוג הכי גבוה", label_color: "blue" },
        { label_hebrew: "התמורה הכי טובה", label_color: "orange" },
      ];
      ranked = sorted.slice(0, Math.min(3, sorted.length)).map((p, i) => ({
        rank: i + 1,
        confidence: 50, // fallback: assume borderline relevant
        ...labels[i],
        product_id: p.id,
        platform: p.platform,
        explanation_hebrew: `נבחר אוטומטית לפי ${params.priority === "price" ? "מחיר" : params.priority === "popular" ? "מכירות" : "דירוג"}`,
      }));
    }

    // Step E2: Filter by confidence threshold (minimum 50)
    const CONFIDENCE_THRESHOLD = 50;
    ranked = ranked.filter((r: any) => (r.confidence ?? 100) >= CONFIDENCE_THRESHOLD);
    console.log(`After confidence filter (>=${CONFIDENCE_THRESHOLD}): ${ranked.length} of original results remain`);

    if (ranked.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "לא מצאתי מוצר תואם לחיפוש שלך 😕\nנסה מילות חיפוש אחרות או הרחב את התקציב",
          suggestion: getSuggestion(params),
          extracted_params: {
            product: params.search_terms_hebrew[0] || params.search_terms_english[0] || "—",
            budget: params.max_budget_thb
              ? `฿${params.max_budget_thb}`
              : params.max_budget_usd
              ? `$${params.max_budget_usd.toFixed(0)}`
              : "ללא הגבלה",
            rating: `${params.min_rating}+`,
            brand: params.brand || null,
            platform: params.platform,
            priority: params.priority,
          },
          search_time_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step F: Build final response – deduplicate by product_id AND name
    const usedProductIds = new Set<string>();
    const usedNameKeys = new Set<string>();
    const results = ranked.map((r: any) => {
      const product = allProducts.find((p) => p.id === r.product_id);
      if (!product) return null;
      const nameKey = product.product_name.toLowerCase().substring(0, 40);
      if (usedProductIds.has(product.id) || usedNameKeys.has(nameKey)) return null;
      usedProductIds.add(product.id);
      usedNameKeys.add(nameKey);
      return {
        rank: r.rank,
        confidence: r.confidence ?? null,
        label_hebrew: r.label_hebrew,
        label_color: r.label_color,
        platform: product.platform,
        platform_label: product.platform_label,
        product_name: product.product_name,
        price_display: product.price_display,
        price_usd: product.price_usd,
        original_price_display: product.original_price_display,
        discount_percentage: product.discount_percentage,
        rating: product.rating,
        sales_count: product.sales_count,
        image_url: product.image_url,
        tracking_link: product.tracking_link,
        category: product.category,
        is_featured: product.is_featured,
        is_live_result: product.is_live_result || false,
        source: product.source || "feed",
        explanation_hebrew: r.explanation_hebrew,
      };
    }).filter(Boolean);
    // Re-number ranks sequentially
    results.forEach((r: any, i: number) => { r.rank = i + 1; });

    return new Response(
      JSON.stringify({
        success: true,
        extracted_params: {
          product: params.search_terms_hebrew[0] || params.search_terms_english[0] || "—",
          budget: params.max_budget_thb
            ? `฿${params.max_budget_thb}`
            : params.max_budget_usd
            ? `$${params.max_budget_usd.toFixed(0)}`
            : "ללא הגבלה",
          rating: `${params.min_rating}+`,
          brand: params.brand || null,
          platform: params.platform,
          priority: params.priority,
        },
        results,
        unique_count: results.length,
        total_scanned: totalScanned,
        search_tier: searchTier,
        live_results_count: liveAliResults.length + liveLazadaResults.length,
        search_time_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("smart-search error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "RATE_LIMITED") {
      return new Response(JSON.stringify({ success: false, message: "יותר מדי בקשות, נסה שוב בעוד דקה" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message === "PAYMENT_REQUIRED") {
      return new Response(JSON.stringify({ success: false, message: "נדרש חידוש קרדיטים" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, message: "שגיאה בחיפוש, נסה שוב" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
