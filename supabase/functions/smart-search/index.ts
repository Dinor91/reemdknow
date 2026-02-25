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
  params: ExtractedParams
): Promise<NormalizedProduct[]> {
  const terms = [...params.search_terms_english, ...params.search_terms_thai];
  if (terms.length === 0) return [];

  let query = supabase
    .from("feed_products")
    .select(
      "id, product_name, price_thb, original_price_thb, rating, sales_7d, brand_name, category_name_hebrew, tracking_link, image_url, discount_percentage"
    )
    .eq("out_of_stock", false)
    .or(buildOrFilter(["product_name"], terms));

  if (params.max_budget_thb != null) query = query.lte("price_thb", params.max_budget_thb);
  // Don't filter by rating - most Lazada products have null ratings
  if (params.brand) query = query.ilike("brand_name", `%${params.brand}%`);

  query = query.order("rating", { ascending: false, nullsFirst: false }).order("sales_7d", { ascending: false, nullsFirst: false }).limit(10);

  const { data, error } = await query;
  if (error) {
    console.error("Lazada search error:", error);
    return [];
  }

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
  }));
}

async function searchAliExpress(
  supabase: any,
  params: ExtractedParams
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

  // Try featured first
  let query = supabase
    .from("aliexpress_feed_products")
    .select(
      "id, product_name, product_name_hebrew, price_usd, original_price_usd, rating, sales_30d, category_name_hebrew, tracking_link, image_url, discount_percentage, is_featured"
    )
    .eq("out_of_stock", false)
    .eq("is_featured", true)
    .or(allConditions.join(","));

  if (params.max_budget_usd != null) query = query.lte("price_usd", params.max_budget_usd);
  if (params.min_rating && params.min_rating > 0) query = query.gte("rating", params.min_rating);
  if (params.brand) query = query.ilike("product_name", `%${params.brand}%`);
  query = query.order("rating", { ascending: false, nullsFirst: false }).order("sales_30d", { ascending: false, nullsFirst: false }).limit(10);

  const { data: featuredData, error: featuredErr } = await query;
  if (featuredErr) console.error("AliExpress featured search error:", featuredErr);

  let useData = featuredData || [];
  let allFeatured = useData.length >= 3;

  if (useData.length < 3) {
    // Fallback: search all products
    let fallbackQuery = supabase
      .from("aliexpress_feed_products")
      .select(
        "id, product_name, product_name_hebrew, price_usd, original_price_usd, rating, sales_30d, category_name_hebrew, tracking_link, image_url, discount_percentage, is_featured"
      )
      .eq("out_of_stock", false)
      .or(allConditions.join(","));

    if (params.max_budget_usd != null) fallbackQuery = fallbackQuery.lte("price_usd", params.max_budget_usd);
    if (params.min_rating && params.min_rating > 0) fallbackQuery = fallbackQuery.gte("rating", params.min_rating);
    if (params.brand) fallbackQuery = fallbackQuery.ilike("product_name", `%${params.brand}%`);
    fallbackQuery = fallbackQuery.order("rating", { ascending: false, nullsFirst: false }).order("sales_30d", { ascending: false, nullsFirst: false }).limit(10);

    const { data: allData, error: allErr } = await fallbackQuery;
    if (allErr) console.error("AliExpress fallback search error:", allErr);
    useData = allData || [];
    allFeatured = false;
  }

  return useData.map((p: any) => ({
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
  params: ExtractedParams
): Promise<NormalizedProduct[]> {
  const hebrewConds = splitTerms(params.search_terms_hebrew).map((t) => `product_name_hebrew.ilike.%${t}%`);
  const engConds = splitTerms(params.search_terms_english).map((t) => `product_name_english.ilike.%${t}%`);
  const allConditions = [...hebrewConds, ...engConds];

  if (allConditions.length === 0) return [];

  let query = supabase
    .from("israel_editor_products")
    .select(
      "id, product_name_hebrew, product_name_english, price_usd, original_price_usd, rating, sales_count, category_name_hebrew, tracking_link, image_url, discount_percentage"
    )
    .eq("out_of_stock", false)
    .eq("is_active", true)
    .or(allConditions.join(","));

  if (params.max_budget_usd != null) query = query.lte("price_usd", params.max_budget_usd);
  // Don't filter by rating - most Israel products have null ratings
  if (params.brand) query = query.ilike("product_name_english", `%${params.brand}%`);

  query = query.order("rating", { ascending: false, nullsFirst: false }).order("sales_count", { ascending: false, nullsFirst: false }).limit(10);

  const { data, error } = await query;
  if (error) {
    console.error("Israel search error:", error);
    return [];
  }

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
    is_featured: true, // israel_editor_products are all curated
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

    return products.map((p: any, i: number) => {
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
        rating: parseFloat(p.evaluate_rate?.replace("%", "") || "0") / 20, // convert % to 5-star
        sales_count: parseInt(p.lastest_volume || "0"),
        image_url: p.product_main_image_url || "",
        tracking_link: p.promotion_link || p.product_detail_url || "",
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

function getSuggestion(params: ExtractedParams): string {
  if (params.brand) return `המותג ${params.brand} לא נמצא במאגר. נסה ללא מותג ספציפי`;
  if (params.max_budget_usd && params.max_budget_usd < 5) return "נסה להגדיל את התקציב";
  return "נסה מילות חיפוש אחרות או הרחב את הקריטריונים";
}

async function rankResults(
  allProducts: NormalizedProduct[],
  originalMessage: string,
  params: ExtractedParams
): Promise<any[]> {
  const systemPrompt = `From these products, select exactly 3 that best match this customer request: "${originalMessage}"

Extracted parameters: ${JSON.stringify(params)}

Available products:
${JSON.stringify(allProducts.map((p) => ({ id: p.id, platform: p.platform, name: p.product_name, price_usd: p.price_usd, price_display: p.price_display, rating: p.rating, sales: p.sales_count })), null, 2)}

Return ONLY a valid JSON array of exactly 3 items:
[
  {
    "rank": 1,
    "label": "best_price",
    "label_hebrew": "הכי זול",
    "label_color": "green",
    "product_id": "string",
    "platform": "string",
    "explanation_hebrew": "1-2 sentences in Hebrew explaining why this product matches"
  },
  {
    "rank": 2,
    "label": "best_rated",
    "label_hebrew": "הדירוג הכי גבוה",
    "label_color": "blue",
    "product_id": "string",
    "platform": "string",
    "explanation_hebrew": "..."
  },
  {
    "rank": 3,
    "label": "best_value",
    "label_hebrew": "התמורה הכי טובה",
    "label_color": "orange",
    "product_id": "string",
    "platform": "string",
    "explanation_hebrew": "..."
  }
]
Rules:
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

    const [lazadaResults, aliResults, israelResults] = await Promise.all([
      shouldSearchLazada ? searchLazada(supabase, params) : Promise.resolve([]),
      shouldSearchAli ? searchAliExpress(supabase, params) : Promise.resolve([]),
      shouldSearchIsrael ? searchIsrael(supabase, params) : Promise.resolve([]),
    ]);

    const totalScanned = lazadaResults.length + aliResults.length + israelResults.length;
    console.log(`Results: Lazada=${lazadaResults.length}, AliExpress=${aliResults.length}, Israel=${israelResults.length}, Total=${totalScanned}`);

    const allProducts = [...lazadaResults, ...aliResults, ...israelResults];

    // Step C.5: Live API fallback for Israel/AliExpress when DB results < 3
    const israelDbCount = aliResults.length + israelResults.length;
    const shouldLiveSearchAli = (effectivePlatform === "all" || effectivePlatform === "israel" || effectivePlatform === "aliexpress") && israelDbCount < 3;
    
    let liveAliResults: NormalizedProduct[] = [];
    if (shouldLiveSearchAli) {
      console.log(`📡 Israel DB results (${israelDbCount}) < 3, triggering AliExpress LIVE search...`);
      liveAliResults = await searchAliExpressLive(params);
      
      // Deduplicate: remove live results that match existing DB products by name similarity
      const existingNames = new Set(allProducts.map(p => p.product_name.toLowerCase().substring(0, 30)));
      liveAliResults = liveAliResults.filter(p => !existingNames.has(p.product_name.toLowerCase().substring(0, 30)));
      
      allProducts.push(...liveAliResults);
      console.log(`Added ${liveAliResults.length} live AliExpress results, total now: ${allProducts.length}`);
    }

    // Step D: No results check
    if (allProducts.length < 3) {
      // Try a broader search with lower rating
      const broadParams = { ...params, min_rating: 0, brand: null };
      const [bLazada, bAli, bIsrael] = await Promise.all([
        shouldSearchLazada ? searchLazada(supabase, broadParams) : Promise.resolve([]),
        shouldSearchAli ? searchAliExpress(supabase, broadParams) : Promise.resolve([]),
        shouldSearchIsrael ? searchIsrael(supabase, broadParams) : Promise.resolve([]),
      ]);
      const broadResults = [...bLazada, ...bAli, ...bIsrael];

      if (broadResults.length < 3 && liveAliResults.length === 0) {
        // Last resort: try live search even with broad params
        const liveBroad = await searchAliExpressLive(broadParams);
        broadResults.push(...liveBroad);
      }

      if (broadResults.length < 3) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "לא נמצאו מוצרים מתאימים לבקשה",
            suggestion: getSuggestion(params),
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

      // Use broad results instead
      allProducts.length = 0;
      allProducts.push(...broadResults);
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
      ranked = sorted.slice(0, 3).map((p, i) => ({
        rank: i + 1,
        ...labels[i],
        product_id: p.id,
        platform: p.platform,
        explanation_hebrew: `נבחר אוטומטית לפי ${params.priority === "price" ? "מחיר" : params.priority === "popular" ? "מכירות" : "דירוג"}`,
      }));
    }

    // Step F: Build final response
    const results = ranked.map((r: any) => {
      const product = allProducts.find((p) => p.id === r.product_id);
      if (!product) {
        // Fallback: pick a product not yet used
        const usedIds = ranked.filter((x: any) => x !== r).map((x: any) => x.product_id);
        const fallback = allProducts.find((p) => !usedIds.includes(p.id));
        if (!fallback) return null;
        return { ...r, ...fallback };
      }
      return {
        rank: r.rank,
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
        explanation_hebrew: r.explanation_hebrew,
      };
    }).filter(Boolean);

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
        total_scanned: totalScanned,
        live_results_count: liveAliResults.length,
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
