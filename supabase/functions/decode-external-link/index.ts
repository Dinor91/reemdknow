import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALIEXPRESS_DOMAINS = ["aliexpress.com", "s.click.aliexpress.com", "a.aliexpress.com", "he.aliexpress.com", "aliexpress.ru"];
const LAZADA_DOMAINS = ["lazada.co.th", "s.lazada.co.th", "c.lazada.co.th", "lazada.com"];
const SHORT_LINK_DOMAINS = ["s.lazada.co.th", "c.lazada.co.th", "s.click.aliexpress.com", "a.aliexpress.com"];

function detectPlatform(url: string): "aliexpress" | "lazada" | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (ALIEXPRESS_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d))) return "aliexpress";
    if (LAZADA_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d))) return "lazada";
  } catch { /* ignore */ }
  // Fallback: check string
  if (url.includes("aliexpress")) return "aliexpress";
  if (url.includes("lazada")) return "lazada";
  return null;
}

function isShortLink(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SHORT_LINK_DOMAINS.some(d => hostname === d);
  } catch { return false; }
}

async function resolveShortLinks(urls: string[]): Promise<Record<string, string>> {
  const shortUrls = urls.filter(isShortLink);
  if (shortUrls.length === 0) return {};
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/resolve-short-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ urls: shortUrls }),
    });
    const data = await resp.json();
    return data.resolved || {};
  } catch (e) {
    console.error("Error resolving short links:", e);
    return {};
  }
}

function extractAliExpressProductId(url: string): string | null {
  const patterns = [/\/item\/(\d+)/, /\/i\/(\d+)/, /productId=(\d+)/, /\/(\d{10,})\.html/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractLazadaProductId(url: string): string | null {
  const patterns = [/-i(\d+)-s\d+/, /products_i(\d+)/, /offer_id=(\d+)/, /-i(\d+)\./];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function getLazadaAffiliateLink(url: string): Promise<string | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/lazada-api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ action: "batch-links", inputType: "url", inputValue: url }),
    });
    const data = await resp.json();
    const linkData = data?.data?.result?.data;
    if (linkData && linkData.link) return linkData.link;
    if (linkData && Array.isArray(linkData) && linkData[0]?.link) return linkData[0].link;
    // Try nested
    if (data?.data?.result?.link) return data.data.result.link;
    console.log("Lazada batch-links response:", JSON.stringify(data).substring(0, 500));
    return null;
  } catch (e) {
    console.error("Lazada affiliate link error:", e);
    return null;
  }
}

// Get product details directly from AliExpress API (reliable, no scraping needed)
async function getProductFromAliExpressAPI(productId: string): Promise<{
  name: string; price: string; rating: string | null; sales_7d: string | null;
  category: string; brand: string; image_url: string | null; promotion_link: string | null;
} | null> {
  try {
    console.log(`Calling AliExpress API for product: ${productId}`);
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/aliexpress-api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ action: "product-details", productIds: productId, targetCurrency: "USD", targetLanguage: "EN" }),
    });
    const data = await resp.json();
    console.log(`AliExpress API response: ${JSON.stringify(data).substring(0, 500)}`);

    const products = data?.data?.aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product;
    if (!products || products.length === 0) {
      console.log("No products returned from AliExpress API");
      return null;
    }

    const p = products[0];
    return {
      name: p.product_title || "",
      price: p.app_sale_price || p.target_app_sale_price || p.original_price || "",
      rating: p.evaluate_rate ? (parseFloat(p.evaluate_rate) / 20).toFixed(1) : null,
      sales_7d: p.lastest_volume || null,
      category: p.first_level_category_name || p.second_level_category_name || "כללי",
      brand: "",
      image_url: p.product_main_image_url || null,
      promotion_link: p.promotion_link || null,
    };
  } catch (e) {
    console.error("AliExpress API error:", e);
    return null;
  }
}

async function scrapeProductPage(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
      },
      redirect: "follow",
    });
    const html = await resp.text();

    const extract = (pattern: RegExp): string => {
      const m = html.match(pattern);
      return m ? m[1].trim() : "";
    };

    const title = extract(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitle = extract(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || extract(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const ogDesc = extract(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || extract(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const metaDesc = extract(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const keywords = extract(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i);

    const pricePatterns = [
      /itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
      /"price":\s*"?([0-9.,]+)"?/i,
      /class=["'][^"']*price[^"']*["'][^>]*>([^<]*[0-9.,]+[^<]*)</i,
    ];
    let price = "";
    for (const p of pricePatterns) {
      const m = html.match(p);
      if (m) { price = m[1].trim(); break; }
    }

    const parts = [
      title && `Title: ${title}`,
      ogTitle && ogTitle !== title && `OG Title: ${ogTitle}`,
      ogDesc && `Description: ${ogDesc}`,
      !ogDesc && metaDesc && `Description: ${metaDesc}`,
      keywords && `Keywords: ${keywords}`,
      price && `Price found: ${price}`,
    ].filter(Boolean);

    const result = parts.join("\n").substring(0, 3000);
    console.log(`Scraped page content (${result.length} chars): ${result.substring(0, 200)}...`);
    return result;
  } catch (e) {
    console.error("Scrape error:", e);
    return "";
  }
}

async function extractProductWithGemini(url: string, pageContent: string, extraInfo?: string): Promise<{
  name: string; price: string; rating: string | null; sales_7d: string | null;
  category: string; brand: string; decode_success: boolean;
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return { name: "", price: "", rating: null, sales_7d: null, category: "כללי", brand: "", decode_success: false };
  }

  const hasContent = pageContent.length > 20;
  const prompt = hasContent
    ? `Extract product details from this product page data.\n\nURL: ${url}\nPage content:\n${pageContent}\n${extraInfo ? `Additional info: ${extraInfo}` : ""}\n\nReturn ONLY valid JSON.`
    : `Analyze this product URL and extract product details.\nURL: ${url}\n${extraInfo ? `Additional info: ${extraInfo}` : ""}\n\nReturn ONLY valid JSON.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You extract product information from e-commerce page data. You MUST use the actual page content provided to extract real product details. Do NOT guess or hallucinate product information.

Return a JSON object with:
- name: product name in Hebrew if possible, otherwise English (from the actual page title/description)
- price: numeric price only (no currency symbol) — from the page data
- rating: numeric rating (e.g. "4.8") or null
- sales_7d: number of recent sales or null
- category: product category in Hebrew (e.g. "טכנולוגיה", "לבית", "ילדים", "כללי")
- brand: brand name or empty string

IMPORTANT: Only return data you can verify from the provided content. If you cannot determine a value, return null or empty string.
Return ONLY valid JSON, no explanation or markdown.`
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_product",
              description: "Extract product details from page content",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Product name from page content" },
                  price: { type: "string", description: "Numeric price from page" },
                  rating: { type: "string", nullable: true, description: "Rating or null" },
                  sales_7d: { type: "string", nullable: true, description: "Sales count or null" },
                  category: { type: "string", description: "Category in Hebrew" },
                  brand: { type: "string", description: "Brand name" },
                },
                required: ["name", "price", "category", "brand"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_product" } },
      }),
    });

    if (!response.ok) {
      console.error("Gemini error:", response.status);
      return { name: "", price: "", rating: null, sales_7d: null, category: "כללי", brand: "", decode_success: false };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      return {
        name: args.name || "",
        price: args.price || "",
        rating: args.rating || null,
        sales_7d: args.sales_7d || null,
        category: args.category || "כללי",
        brand: args.brand || "",
        decode_success: !!(args.name && args.price),
      };
    }

    return { name: "", price: "", rating: null, sales_7d: null, category: "כללי", brand: "", decode_success: false };
  } catch (e) {
    console.error("Gemini extraction error:", e);
    return { name: "", price: "", rating: null, sales_7d: null, category: "כללי", brand: "", decode_success: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, extra_info } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[decode-external-link] Processing: ${url}`);

    // Step 1: Resolve short links if needed
    let resolvedUrl = url;
    if (isShortLink(url)) {
      const resolved = await resolveShortLinks([url]);
      if (resolved[url]) {
        resolvedUrl = resolved[url];
        console.log(`Resolved short link: ${url} -> ${resolvedUrl}`);
      }
    }

    // Step 2: Detect platform
    const platform = detectPlatform(resolvedUrl) || detectPlatform(url);
    if (!platform) {
      return new Response(
        JSON.stringify({ success: false, error: "לא הצלחתי לזהות פלטפורמה (AliExpress / Lazada)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Platform detected: ${platform}`);

    // Step 3: Generate affiliate URL
    let affiliateUrl = resolvedUrl;
    let productId: string | null = null;

    if (platform === "aliexpress") {
      productId = extractAliExpressProductId(resolvedUrl);
      // Add tracking params
      const TRACKING_ID = Deno.env.get("ALIEXPRESS_TRACKING_ID");
      const isAlreadyTracked = resolvedUrl.includes("s.click.aliexpress.com") ||
        resolvedUrl.includes("a.aliexpress.com") ||
        resolvedUrl.includes("aff_fcid");

      if (TRACKING_ID && !isAlreadyTracked) {
        const separator = resolvedUrl.includes("?") ? "&" : "?";
        affiliateUrl = `${resolvedUrl}${separator}aff_fcid=${TRACKING_ID}&aff_platform=portals-tool`;
      }
    } else {
      productId = extractLazadaProductId(resolvedUrl);
      // Convert to affiliate link via Lazada API
      const lazadaLink = await getLazadaAffiliateLink(resolvedUrl);
      if (lazadaLink) {
        affiliateUrl = lazadaLink;
        console.log(`Lazada affiliate link generated: ${affiliateUrl.substring(0, 80)}...`);
      } else {
        console.log("Lazada affiliate link generation failed, using original URL");
      }
    }

    // Step 4: Get product details
    let product: { name: string; price: string; rating: string | null; sales_7d: string | null; category: string; brand: string; decode_success?: boolean };
    let apiUsed = "none";

    // For AliExpress: use API directly (scraping doesn't work - AliExpress blocks server-side requests)
    if (platform === "aliexpress" && productId) {
      const apiResult = await getProductFromAliExpressAPI(productId);
      if (apiResult && apiResult.name) {
        product = { ...apiResult, decode_success: true };
        apiUsed = "aliexpress-api";
        console.log(`✅ Got product from AliExpress API: ${apiResult.name}`);
      } else {
        // Fallback to Gemini with scrape (unlikely to work for AliExpress but try)
        console.log("⚠️ AliExpress API failed, falling back to scrape+Gemini");
        const pageContent = await scrapeProductPage(resolvedUrl);
        product = await extractProductWithGemini(resolvedUrl, pageContent, extra_info || undefined);
        apiUsed = "gemini-fallback";
      }
    } else {
      // Lazada or unknown: use scrape + Gemini
      const pageContent = await scrapeProductPage(resolvedUrl);
      product = await extractProductWithGemini(resolvedUrl, pageContent, extra_info || undefined);
      apiUsed = "gemini";
    }

    const currencySymbol = platform === "aliexpress" ? "$" : "฿";

    return new Response(
      JSON.stringify({
        success: true,
        platform,
        product: {
          name: product.name,
          price: product.price,
          rating: product.rating,
          sales_7d: product.sales_7d,
          category: product.category,
          brand: product.brand,
        },
        product_id: productId,
        affiliate_url: affiliateUrl,
        original_url: url,
        resolved_url: resolvedUrl,
        currency_symbol: currencySymbol,
        decode_success: product.decode_success ?? false,
        api_used: apiUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("decode-external-link error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
