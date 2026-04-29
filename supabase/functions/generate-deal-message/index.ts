import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Platform-specific strategic focus injected into the prompt (Dynamic Context v2)
function getPlatformContext(source: string): string {
  switch ((source || "").toLowerCase()) {
    case "ksp":
      return `Platform: KSP (קמעונאי אלקטרוניקה ישראלי). שירות מקומי בעברית, אחריות יבואן רשמי בארץ, איסוף מסניפים, החזרות ישראליות.`;
    case "aliexpress":
      return `Platform: AliExpress (יבוא ישיר מסין). סינון זיופים, חיפוש תקנים (CE/RoHS/BPA-Free), תקע נדרש, משלוח 2-4 שבועות.`;
    case "lazada":
      return `Platform: Lazada Thailand. עדיפות LazMall, תקן TIS, תקע Type A/B/C, אחריות מקומית בתאילנד.`;
    case "amazon":
      return `Platform: Amazon. Prime כשרלוונטי, החזרות 30 יום, אחריות יצרן בינלאומית, ייתכן מתאם תקע ומס יבוא.`;
    default:
      return `Platform: כללי. ציין מה שרלוונטי למוצר.`;
  }
}

// === GROUNDING: pull real engineering data from the web before generating content ===
async function fetchGroundingFacts(productName: string, brand: string | null | undefined): Promise<string | null> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) {
    console.log("[grounding] FIRECRAWL_API_KEY not set — skipping grounding");
    return null;
  }
  const query = `${brand || ""} ${productName} specifications materials safety standards review`.trim();
  console.log("[grounding] query:", query);

  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 4 }),
      // 12s ceiling so the function still feels snappy
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.log("[grounding] firecrawl status:", res.status);
      return null;
    }
    const data = await res.json();
    const items = (data?.data?.web || data?.data || data?.web || []) as any[];
    if (!Array.isArray(items) || items.length === 0) return null;
    const compact = items.slice(0, 4).map((r: any, i: number) => {
      const title = r.title || r.metadata?.title || "";
      const desc = r.description || r.snippet || r.metadata?.description || "";
      const url = r.url || r.metadata?.sourceURL || "";
      return `[${i + 1}] ${title}\n${desc}\n(${url})`;
    }).join("\n\n");
    console.log("[grounding] facts length:", compact.length);
    return compact;
  } catch (e) {
    console.log("[grounding] error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

function buildAuditorPrompt({
  product,
  coupon,
  source,
  productUrl,
  groundingFacts,
}: {
  product: any;
  coupon: string | null | undefined;
  source: string;
  productUrl: string;
  groundingFacts: string | null;
}) {
  const platformContext = getPlatformContext(source);

  const ratingValue =
    product.rating && product.rating !== "חדש" && Number(product.rating) > 0 ? product.rating : null;
  const salesValue = product.sales_7d && Number(product.sales_7d) > 0 ? product.sales_7d : null;
  const discountValue = product.discount_percent && Number(product.discount_percent) > 0 ? product.discount_percent : null;

  const hasManualNote = product.note && String(product.note).trim().length > 0;
  const manualNote = hasManualNote ? String(product.note).trim() : null;

  const isBestSeller = product.is_best_seller === true;
  const shippingInfo = product.shipping_info ? String(product.shipping_info).trim() : null;

  // Hybrid Verdict logic — manual note wins, otherwise generate from grounding+category
  const dknowNoteInstruction = hasManualNote
    ? `Use this EXACT manual Dknow note as the CORE VERDICT, character-for-character: "${manualNote}". 
This is the user's professional opinion — it must become the heart of the message.
If it mentions a "competing option" or "trap model", treat that as the most important insight.`
    : `Generate a professional verdict using the GROUNDING FACTS below. Pick ONE of:
   (a) maintenance tip ("ודאו ש...")
   (b) hidden technical limitation ("שימו לב ש...")
   (c) insider recommendation NOT in the marketing specs.
Do NOT compare to other models unless the grounding facts reveal a clear "trap" model in the same brand.
NEVER repeat the product name. NEVER restate the bullets above.`;

  const groundingBlock = groundingFacts
    ? `### GROUNDING FACTS (real web research — extracted from search results)
${groundingFacts}

USE THESE FACTS to extract:
- Real materials (PU foam, stainless steel 304, ABS, etc.)
- Real safety/quality standards (CE, RoHS, FDA, ANSI, TIS, ISO ratings)
- Real performance numbers (5-day ice retention, 600W, IP67, etc.)
- Brand heritage signals (year founded, country of origin, market position)
NEVER invent facts. If the grounding does not contain a number, omit that bullet entirely.`
    : `### GROUNDING FACTS
NONE available. Use ONLY the structured product fields below. Do NOT invent technical specs.`;

  const systemPrompt = `### BRAND IDENTITY
You are "Dknow Auditor v3" — an engineering-grade product reviewer for the Israeli community "reemdknow".
You write a forensic AUDIT, not an ad. Your authority comes from EXPOSING the engineering truth most consumers miss.

### CORE PRINCIPLE: ENGINEERING TRUTH > MARKETING SPEC
Wrong: "קיבולת 49 ליטר — נפח שמתאים למשפחה"  (this is the box label, anyone can read it)
Right: "🔧 בידוד PU מוזרק 32 מ\"מ + UVGuard — שמירת קרח ל-5 ימים בחום של 32°C, לא רק נפח"
Always expose materials, standards, certifications, lab numbers — extracted from grounding.

### FORBIDDEN WORDS (Anti-Bot)
NEVER use: מטורף, מדהים, הזוי, חובה, הכי טוב, מספק, מציע, יחסית, בשוק קיימים, תמורה טובה, מיועד ל

### HOOK RULE
Open with a daily-frustration question. Never "אם אתם מחפשים".

### MANDATORY STRUCTURE (strict order)

1. Hook (frustration question)
2. *שם מוצר - מותג*
3. STATUS LINE — build it from these atoms, joining ONLY the ones that exist with " | ":
   - ⭐ ${ratingValue ?? "MISSING"}  (include only if not MISSING)
   - 🏷️ ${discountValue ? discountValue + "% הנחה" : "MISSING"}  (include only if not MISSING)
   - 📈 ${salesValue ? salesValue + " מכירות השבוע" : "MISSING"}  (include only if not MISSING)
   - 🏆 BestSeller  (only if Is Best Seller = YES)
   IF ALL ATOMS MISSING — OMIT THE ENTIRE STATUS LINE. Do NOT print "אין דירוג" or "אין הנחה".
4. ✨ למה זאת הבחירה שלי?
5. 🔧 **[מונח הנדסי]:** עובדה מהגראונדינג + משמעות מעשית
6. 💰 **[ערך]:** הצדקת מחיר מול חלופות זולות יותר (רק אם הגראונדינג מגלה מלכודת באותו מותג)
7. 🛡️ **[בטיחות/תקן]:** תקן ספציפי מהגראונדינג + משמעות
8. 💡 **הערת Dknow:** ה-VERDICT — דעה מקצועית, אזהרה, או "אופציה נגדית". זה לב ההודעה.
   ❌ אסור: לחזור על שם המוצר, להזכיר מחירים, לשלב קופונים.
   ✅ חובה: insight שלא נמצא במפרט הרשמי.

[שורה ריקה]

9. בלוק מחיר ומשלוח (כל שורה בנפרד עם האייקון שלה):
   💲 כמה תשלמו? [product.price]${product.original_price ? " (במקום [original_price])" : ""}
   ${coupon ? "🎟️ **קופון:** `" + coupon + "`" : "(skip coupon line if no coupon)"}
   ${shippingInfo ? "🚚 " + shippingInfo : "(skip shipping line if no info)"}

[שורה ריקה — חובה לפני הלינק]

10. 🔗 לינק למוצר:
    ${productUrl}

### DKNOW NOTE — THE VERDICT (most important rule)
${dknowNoteInstruction}

If the manual note describes a "competing option" or "trap model" (e.g. "the cheaper Twist model is a trap"),
that warning becomes the headline of the Dknow note — phrased as a direct warning to the reader.

### COMPARISON RULE
- Do NOT compare brand-vs-brand for its own sake.
- Compare ONLY when: (a) the user provided a "direction" in the manual note, OR (b) grounding reveals a same-brand cheaper model that's a known trap.
- Otherwise — focus on the engineering depth of THIS product.

### PLATFORM CONTEXT
${platformContext}

${groundingBlock}

### DATA INJECTION
- URL = ${productUrl} (exact, character-for-character)
- Price = ${product.price}
- Original price = ${product.original_price || "NONE"}
- Rating = ${ratingValue ?? "NONE"}
- Sales 7d = ${salesValue ?? "NONE"}
- Discount = ${discountValue ?? "NONE"}%
- Coupon = ${coupon || "NONE"}
- Best Seller = ${isBestSeller ? "YES" : "NO"}
- Shipping = ${shippingInfo ?? "NONE"}

### CRITICAL RULES
- URL exact: ${productUrl}
- No signature, no "reemdknow", nothing after the URL.
- Max ONE exclamation mark in the entire message.
- Under 200 words.
- HIDE empty data — never write "אין דירוג", "אין הנחה", "לא ידוע".
- COUPON: include the 🎟️ line ONLY if Coupon ≠ NONE, on its own separate line.
- Empty line between the price block and the URL line — mandatory.`;

  const userPrompt = `Generate the audit for this product.

Source: ${source || "default"}
Name: ${product.name}
Brand: ${product.brand || "NONE"}
Category: ${product.category || "כללי"}
Price: ${product.price}
Original Price: ${product.original_price || "NONE"}
Discount: ${discountValue ?? "NONE"}%
Rating: ${ratingValue ?? "NONE"}
Sales_7d: ${salesValue ?? "NONE"}
Is Best Seller: ${isBestSeller ? "YES" : "NO"}
Shipping Info: ${shippingInfo ?? "NONE"}
Manual Dknow Verdict: ${manualNote ?? "NONE — generate from grounding"}
URL: ${productUrl}
Coupon: ${coupon || "NONE"}

Remember: hide any data marked NONE. The URL must appear EXACTLY as-is.`;

  return { systemPrompt, userPrompt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { product, coupon, source } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Append affiliate tracking params per platform
    const ALI_TRACKING_ID = Deno.env.get("ALIEXPRESS_TRACKING_ID");
    const AMZ_TRACKING_ID = Deno.env.get("AMAZON_TRACKING_ID");
    let productUrl = product.url || "";
    const lowerSrc = (source || "").toLowerCase();

    if (lowerSrc !== "ksp") {
      const isAlreadyTrackedAli =
        productUrl.includes("s.click.aliexpress.com") ||
        productUrl.includes("a.aliexpress.com") ||
        productUrl.includes("aff_fcid");
      if (productUrl.includes("aliexpress.com") && ALI_TRACKING_ID && !isAlreadyTrackedAli) {
        const separator = productUrl.includes("?") ? "&" : "?";
        productUrl = `${productUrl}${separator}aff_fcid=${ALI_TRACKING_ID}&aff_platform=portals-tool`;
      }
      const isAmazonUrl = /amazon\.[a-z.]+|amzn\.to|a\.co/i.test(productUrl);
      if (isAmazonUrl && AMZ_TRACKING_ID && !/[?&]tag=/.test(productUrl)) {
        const separator = productUrl.includes("?") ? "&" : "?";
        productUrl = `${productUrl}${separator}tag=${AMZ_TRACKING_ID}`;
      }
    }

    // === Grounding step ===
    const groundingFacts = await fetchGroundingFacts(product.name, product.brand);

    const { systemPrompt, userPrompt } = buildAuditorPrompt({
      product,
      coupon,
      source: source || "default",
      productUrl,
      groundingFacts,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסה שוב עוד רגע" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נגמרו הקרדיטים, יש להוסיף קרדיטים" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let message = data.choices?.[0]?.message?.content || "";

    // URL Post-processing — preserve affiliate link
    const urlRegex = /https?:\/\/[^\s\n)]+/g;
    const urls = message.match(urlRegex);
    if (urls && urls.length > 0) {
      for (const url of urls) {
        if (
          url.includes("aliexpress.com") ||
          url.includes("lazada.co") ||
          url.includes("s.click.") ||
          url.includes("ksp.co.il") ||
          /amazon\.[a-z.]+|amzn\.to|a\.co/i.test(url)
        ) {
          if (url !== productUrl) message = message.replace(url, productUrl);
        }
      }
    }

    return new Response(JSON.stringify({ message, grounded: !!groundingFacts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-deal-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
