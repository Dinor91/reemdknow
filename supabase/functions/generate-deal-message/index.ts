import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Platform-specific strategic focus injected into the prompt (Dynamic Context v2)
function getPlatformContext(source: string): string {
  switch ((source || "").toLowerCase()) {
    case "ksp":
      return `Platform: KSP (קמעונאי אלקטרוניקה ישראלי).
דגש בטיחות/אחריות: שירות מקומי בעברית, אחריות יבואן רשמי בארץ, איסוף מסניפים בישראל, מדיניות החזרות ישראלית. אין צורך לדבר על תקני CE או תקעים — המוצר מותאם לשוק הישראלי.`;
    case "aliexpress":
      return `Platform: AliExpress (יבוא ישיר מסין).
דגש בטיחות/אחריות: סינון זיופים — לבחור מוכרים מדורגים, לחפש תקני בטיחות (CE / RoHS / BPA-Free) למוצרי חשמל ומגע עם מזון, לוודא תקע מתאים (לרוב נדרש מתאם), זמני משלוח 2-4 שבועות, אחריות מוגבלת מהמוכר.`;
    case "lazada":
      return `Platform: Lazada Thailand (שוק תאילנדי).
דגש בטיחות/אחריות: עדיפות למוכרי LazMall (אותנטיות מובטחת), תקן TIS למוצרי חשמל בתאילנד, תקע Type A/B/C, אחריות מקומית בתאילנד.`;
    case "amazon":
      // Infrastructure ready — will activate when Amazon API connects.
      return `Platform: Amazon.
דגש בטיחות/אחריות: ${product_is_best_seller_hint()} משלוח Prime כשרלוונטי, מדיניות החזרות נדיבה, סימון Best Seller / Amazon's Choice אם מופיע.`;
    default:
      return `Platform: כללי.
דגש בטיחות/אחריות: לציין מה שרלוונטי למוצר הספציפי (אחריות, התאמה, תחזוקה).`;
  }
}

// Reserved hint placeholder for future Amazon fields (is_best_seller, shipping_info)
function product_is_best_seller_hint(): string {
  return "";
}

function buildAuditorPrompt({
  product,
  coupon,
  source,
  productUrl,
}: {
  product: any;
  coupon: string | null | undefined;
  source: string;
  productUrl: string;
}) {
  const platformContext = getPlatformContext(source);
  const isKsp = (source || "").toLowerCase() === "ksp";

  const ratingValue =
    product.rating && product.rating !== "חדש" && Number(product.rating) > 0 ? product.rating : null;
  const salesValue = product.sales_7d && Number(product.sales_7d) > 0 ? product.sales_7d : null;

  // Hybrid Dknow Note logic:
  // - If manual product.note exists → use verbatim
  // - Otherwise → Gemini generates a contextual note based on product NAME + CATEGORY together
  const hasManualNote = product.note && String(product.note).trim().length > 0;
  const manualNote = hasManualNote ? String(product.note).trim() : null;

  // Future-ready optional fields (no breaking change if missing)
  const isBestSeller = product.is_best_seller === true;
  const shippingInfo = product.shipping_info ? String(product.shipping_info).trim() : null;

  const systemPrompt = `אתה כותב הודעת WhatsApp בעברית עבור reemdknow — בודק מוצרים מקצועי, לא מוכר.
הקהל: 1,200 חברים בקהילת דילים.

זהות וטון (חוקים מוחלטים):
- מקצועי, אנליטי, עובדתי. כמו חבר טכני שבדק את המוצר ומספר עליו.
- אסור בהחלט במילים: "מטורף", "מדהים", "הזוי", "חובה", "הכי טוב", "פצצה", "WOW", "סופר", "אש", "מושלם", "בלעדי".
- אסור סופרלטיבים שיווקיים. אסור סימני קריאה כפולים. מקסימום סימן קריאה אחד בכל ההודעה.
- בלי אימוג'ים בכותרות. אימוג'ים רק בתחילת בולט / שורת מחיר / קופון / לינק.

Hook (שורה ראשונה) — חייב להתחיל בבעיה יומיומית, לא בשאלה מכירתית:
- דוגמאות מותרות: "נמאס לכם ש...", "מחפשים פתרון ל...?", "אם אתם מתמודדים עם...", "מי שעובד עם... יודע ש...".
- אסור: "רוצים את הדיל הכי טוב?", "תקשיבו טוב!", "פצצה אמיתית!".

${platformContext}

מבנה ההודעה — חובה לשמור עליו בדיוק לפי הסדר הזה:

[Hook — בעיה יומיומית, שורה אחת]

[שם המוצר בעברית אם אפשר, אחרת אנגלית] — [מותג אם ידוע]
[1-2 שורות תיאור עניני: מה המוצר עושה ולמי הוא מתאים]

${
  isKsp
    ? `[שורת סטטוס — אם יש discount_percent > 0: 🏷️ ${product.discount_percent ?? ""}% הנחה (מחיר מקורי: ${product.original_price ?? ""})]`
    : `[שורת סטטוס — אם דירוג > 0: ⭐ ${ratingValue ?? ""}    אם sales_7d > 0: 🔥 נמכר ${salesValue ?? ""} פעמים השבוע${isBestSeller ? "    🏆 Best Seller" : ""}]
[אם אין דירוג ואין מכירות ואין Best Seller — לדלג על השורה כולה]`
}

🔧 טכני: [מפרט אמיתי מהנתונים — חומר/הספק/קיבולת/מידות/תאימות. אסור להמציא מספרים שלא קיימים. אם אין מפרט — תיאור פונקציונלי כללי.]
💰 ערך: [למה המחיר משתלם ביחס לחלופות בשוק. עובדתי, בלי סופרלטיבים.]
🛡️ בטיחות/אחריות: [נקודה אחת ספציפית לפי הקונטקסט הפלטפורמתי שלמעלה — שירות/תקן/אחריות.]
💡 הערת Dknow: ${
    hasManualNote
      ? `"${manualNote}" — חובה להשתמש בטקסט הזה בדיוק, אות באות.`
      : `[ייצר הערה אישית של 1-2 משפטים שמשלבת את שם המוצר הספציפי "${product.name}" עם הקטגוריה "${product.category || "כללי"}" ועם הפלטפורמה. דוגמה: עבור "Xiaomi Mi Band" בקטגוריית גאדג׳טים — לדבר על תאימות iOS/Android וסנכרון אפליקציה, לא על מידות. ההערה חייבת להיות רלוונטית למוצר הזה דווקא, לא טקסט גנרי.]`
  }

💰 [המחיר עם סימן מטבע]
${product.original_price && Number(product.discount_percent) > 0 ? `🏷️ במבצע מ-${product.original_price}` : ""}
${shippingInfo ? `🚚 ${shippingInfo}` : "📦 המחיר באתר עשוי להשתנות"}
${coupon ? `🎟️ קופון: ${coupon}` : "[אם אין קופון — לדלג על השורה הזו לחלוטין]"}

🔗 לינק למוצר
[product_url]

כללים קריטיים:
- 4 בולטים בדיוק ובסדר הזה: טכני, ערך, בטיחות/אחריות, הערת Dknow.
- אסור להמציא מפרטים. אם אין נתון — להישאר ברמה הפונקציונלית.
- העתק את ה-URL אות באות. אל תשנה שום תו, אל תקצר, אל תוסיף פרמטרים.
- אסור חתימה. אסור להוסיף "reemdknow". אסור שורה אחרי הלינק.
- ההודעה כולה מתחת ל-200 מילים.`;

  const userPrompt = `Generate the audit-style message for this product.

Source/Platform: ${source || "default"}
Name: ${product.name}
Brand: ${product.brand || "לא ידוע"}
Category: ${product.category || "כללי"}
Price: ${product.price}
${product.original_price ? `Original Price: ${product.original_price}` : ""}
${product.discount_percent ? `Discount: ${product.discount_percent}%` : ""}
Rating: ${ratingValue ?? "NONE"}
Sales_7d: ${salesValue ?? "NONE"}
Is Best Seller: ${isBestSeller ? "YES" : "NO"}
Shipping Info: ${shippingInfo ?? "NONE"}
Manual Dknow Note: ${manualNote ?? "NONE — generate contextual note from name+category+platform"}
URL: ${productUrl}
Coupon: ${coupon || "NONE"}

CRITICAL: The URL must appear EXACTLY as-is in your output. Do not change any character.`;

  return { systemPrompt, userPrompt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { product, coupon, source } = await req.json();
    const isKsp = (source || "").toLowerCase() === "ksp";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Append affiliate tracking params to AliExpress links
    const TRACKING_ID = Deno.env.get("ALIEXPRESS_TRACKING_ID");
    let productUrl = product.url || "";
    console.log("[1] productUrl RAW from product.url:", productUrl);
    console.log("[1] source:", source || "default");

    if (!isKsp) {
      const isAlreadyTracked =
        productUrl.includes("s.click.aliexpress.com") ||
        productUrl.includes("a.aliexpress.com") ||
        productUrl.includes("aff_fcid");

      if (productUrl.includes("aliexpress.com") && TRACKING_ID && !isAlreadyTracked) {
        const separator = productUrl.includes("?") ? "&" : "?";
        productUrl = `${productUrl}${separator}aff_fcid=${TRACKING_ID}&aff_platform=portals-tool`;
      }
    }

    const { systemPrompt, userPrompt } = buildAuditorPrompt({
      product,
      coupon,
      source: source || "default",
      productUrl,
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

    // URL Post-processing: ensure Gemini didn't tamper with affiliate link
    const urlRegex = /https?:\/\/[^\s\n)]+/g;
    const urls = message.match(urlRegex);
    if (urls && urls.length > 0) {
      for (const url of urls) {
        if (
          url.includes("aliexpress.com") ||
          url.includes("lazada.co") ||
          url.includes("s.click.") ||
          url.includes("ksp.co.il")
        ) {
          if (url !== productUrl) {
            message = message.replace(url, productUrl);
          }
        }
      }
    }

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
