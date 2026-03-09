import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { product, coupon } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Append affiliate tracking params to AliExpress links
    const TRACKING_ID = Deno.env.get("ALIEXPRESS_TRACKING_ID");
    let productUrl = product.url || "";
    console.log("[1] productUrl RAW from product.url:", productUrl);
    console.log("[1] TRACKING_ID value:", TRACKING_ID ? `${TRACKING_ID.substring(0, 10)}...` : "NOT SET");

    const isAlreadyTracked = productUrl.includes("s.click.aliexpress.com") || 
                             productUrl.includes("a.aliexpress.com") || 
                             productUrl.includes("aff_fcid");
    console.log("[2] isAlreadyTracked:", isAlreadyTracked);

    if (productUrl.includes("aliexpress.com") && TRACKING_ID && !isAlreadyTracked) {
      const separator = productUrl.includes("?") ? "&" : "?";
      productUrl = `${productUrl}${separator}aff_fcid=${TRACKING_ID}&aff_platform=portals-tool`;
      console.log("[3] productUrl AFTER adding tracking:", productUrl);
    } else {
      console.log("[3] productUrl UNCHANGED (skipped tracking):", productUrl);
    }

    const systemPrompt = `You are writing a WhatsApp message in Hebrew for a deals community of 1,200 members.

Write the message using EXACTLY this structure:

[HOOK – one line question targeting the specific audience for this product.
Match the hook to the product type:
- Kids toys/games → "הורים לילדים? מחפשים דרך להעסיק אותם באופן עצמאי?"
- Computer/tech accessories → "עובדים הרבה עם המחשב? מחפשים נוחות אמיתית?"
- Kitchen appliances → "אוהבים לבשל אבל שונאים את הבלאגן?"
- Sports/fitness → "חוזרים לכושר? מחפשים ציוד שיחזיק לאורך זמן?"
- Smart home/gadgets → "רוצים לשדרג את הבית בלי לשבור את הכיס?"
- Tools/DIY → "אוהבים לתקן דברים בבית? הנה כלי שישמח אתכם"
- Lighting → "רוצים לשנות את האווירה בבית בקלות?"
Always adapt the hook to the specific product. Never use a generic hook.]

[Product name in Hebrew if possible]
[1-2 lines describing what the product does in simple conversational Hebrew]

[IF rating exists and > 0: ⭐ דירוג [rating]]
[IF rating is null, 0, or "חדש" → skip rating line entirely, do NOT show any rating line]

[IF sales_7d exists and > 0: 🔥 נמכר [sales_7d] פעמים השבוע]
[IF sales_7d is 0 or null → skip sales line entirely]

✨ למה זאת הבחירה שלי?
• [benefit 1 – functional/practical]
• [benefit 2 – emotional or unique value]
• [benefit 3 – only if genuinely adds value]
• [benefit 4 – only if genuinely adds value]
(MINIMUM 2 bullets, MAXIMUM 4 bullets)

💰 החל מ-[price] [currency symbol]
📦 המחיר באתר עשוי להשתנות
[IF coupon: 🎟️ לא לשכוח להכניס קופון: [COUPON]]
[IF no coupon → skip entirely, do NOT add any coupon line]

🔗 לינק למוצר
[product_url]

RULES:
- Natural Hebrew, personal tone, not robotic
- Hook must match the specific product
- Benefits sound like personal recommendations
- Never exceed 4 bullets
- Never add coupon line if no coupon given
- NEVER show rating line if rating is null, 0, or "חדש"
- NEVER show sales line if sales_7d is 0 or null
- ALWAYS add "📦 המחיר באתר עשוי להשתנות" right after the price line
- CRITICAL: Copy the URL EXACTLY as provided. Do not modify, shorten, or change ANY character in the URL. The URL must appear in the output 100% identical to the input.
- Total message under 200 words`;

    const ratingValue = product.rating && product.rating !== "חדש" && Number(product.rating) > 0 ? product.rating : null;
    const salesValue = product.sales_7d && Number(product.sales_7d) > 0 ? product.sales_7d : null;

    const userPrompt = `Generate a WhatsApp deal message for this product:

Name: ${product.name}
Price: ${product.price}
Rating: ${ratingValue ? ratingValue : "NONE - do NOT include any rating line"}
Sales_7d: ${salesValue ? salesValue : "NONE - do NOT include any sales line"}
Brand: ${product.brand || "לא ידוע"}
Category: ${product.category || "כללי"}
URL: ${productUrl}
CRITICAL: The URL above must appear EXACTLY as-is in your output. Do not change any character.
Coupon: ${coupon || "NONE - do NOT include any coupon line"}`;

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
    const message = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-deal-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
