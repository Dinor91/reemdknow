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
    if (productUrl.includes("aliexpress.com") && TRACKING_ID) {
      const separator = productUrl.includes("?") ? "&" : "?";
      productUrl = `${productUrl}${separator}aff_fcid=${TRACKING_ID}&aff_platform=portals-tool`;
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

⭐ דירוג [rating or "חדש"] | [sales] קונים מרוצים

✨ למה זאת הבחירה שלי?
• [benefit 1 – functional/practical]
• [benefit 2 – emotional or unique value]
• [benefit 3 – only if genuinely adds value]
• [benefit 4 – only if genuinely adds value]
(MINIMUM 2 bullets, MAXIMUM 4 bullets)

💰 החל מ-[price] [currency symbol]
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
- Total message under 200 words`;

    const userPrompt = `Generate a WhatsApp deal message for this product:

Name: ${product.name}
Price: ${product.price}
Rating: ${product.rating}
Sales: ${product.sales}
Brand: ${product.brand || "לא ידוע"}
Category: ${product.category || "כללי"}
URL: ${productUrl}
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
