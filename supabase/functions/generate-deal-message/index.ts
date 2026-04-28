import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Platform-specific strategic focus injected into the prompt
function getPlatformContext(source: string): string {
  switch ((source || "").toLowerCase()) {
    case "ksp":
      return `Platform: KSP (חנות אלקטרוניקה ישראלית).
דגש בטיחות/תחזוקה: אחריות יבואן רשמי בארץ, שירות בעברית, מדיניות החזרות. אין צורך לדבר על תקני CE או תקעים — זה מוצר ישראלי.`;
    case "aliexpress":
      return `Platform: AliExpress (יבוא ישיר מסין).
דגש בטיחות/תחזוקה: לציין במידת הצורך תקני בטיחות (CE/RoHS) למוצרי חשמל, סוג תקע (לרוב צריך מתאם), זמני משלוח של 2-4 שבועות, ואחריות מוגבלת מהמוכר.`;
    case "lazada":
      return `Platform: Lazada Thailand (שוק תאילנדי).
דגש בטיחות/תחזוקה: תקן TIS למוצרי חשמל בתאילנד, תקע Type A/B/C, אחריות מקומית בתאילנד.`;
    case "amazon":
      // Infrastructure only — not yet active. Falls back to generic if invoked.
      return `Platform: Amazon.
דגש בטיחות/תחזוקה: לציין יתרונות Prime/BestSeller אם קיימים, מדיניות החזרות נדיבה.`;
    default:
      return `Platform: כללי.
דגש בטיחות/תחזוקה: לציין מה שרלוונטי למוצר הספציפי (אחריות, התאמה, תחזוקה).`;
  }
}

// Safe, generic per-category fallback note (used when no manual product.note is provided)
function getCategoryFallbackNote(category: string): string {
  const c = (category || "").toLowerCase();
  if (c.includes("auto") || c.includes("רכב")) return "בדקו תאימות לדגם הרכב שלכם לפני הזמנה.";
  if (c.includes("tools") || c.includes("כלים")) return "בדקו סוג התקע והמתח (V) שמתאים לבית.";
  if (c.includes("kids") || c.includes("ילד")) return "בדקו את הגיל המומלץ ואת תקני הבטיחות.";
  if (c.includes("health") || c.includes("בריאות")) return "לא תחליף לייעוץ רפואי — להתייעץ עם איש מקצוע במקרה ספק.";
  if (c.includes("gadget") || c.includes("גאדג") || c.includes("חכם")) return "בדקו תאימות עם המכשיר שלכם (אנדרואיד/iOS, סוג חיבור).";
  if (c.includes("fashion") || c.includes("אופנה")) return "מידות אסיאתיות נוטות להיות קטנות — לבדוק טבלת מידות.";
  if (c.includes("home") || c.includes("בית") || c.includes("מטבח")) return "בדקו מידות מול המקום שבו תתקינו או תניחו את המוצר.";
  return "כדאי לקרוא ביקורות אחרונות ולבדוק התאמה לצורך הספציפי שלכם.";
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

  // Hybrid Dknow Note: manual note wins, otherwise category fallback
  const dknowNote =
    product.note && String(product.note).trim().length > 0
      ? String(product.note).trim()
      : getCategoryFallbackNote(product.category || "");

  const systemPrompt = `אתה כותב הודעת WhatsApp בעברית בשם reemdknow — בודק מוצרים מקצועי, לא מוכר.
הקהל: 1,200 חברים בקהילת דילים.

הטון:
- מקצועי, אנליטי, כן. כמו חבר שבדק את המוצר ומספר עליו.
- אסור להשתמש במילים: "מדהים", "מטורף", "חובה", "הכי", "פצצה", "WOW", "סופר", "אש".
- אסור סופרלטיבים שיווקיים. אסור סימני קריאה מוגזמים.
- בלי אימוג'ים בכותרות. אימוג'ים רק בתחילת בולט אחד או בשורת מחיר/קופון/לינק.

${platformContext}

מבנה ההודעה — חובה לשמור עליו בדיוק:

[שורה 1 — Hook: שאלה קצרה שמציגה בעיה יומיומית שהמוצר פותר. ללא סופרלטיבים. מותאמת לקטגוריה.]

[שם המוצר בעברית אם אפשר, אחרת אנגלית]
[1-2 שורות תיאור עניני — מה המוצר עושה ולמי הוא מתאים]

${
  isKsp
    ? `[אם יש discount_percent > 0: 🏷️ ${product.discount_percent ?? ""}% הנחה (מחיר מקורי: ${product.original_price ?? ""})]`
    : `[אם דירוג קיים ו-> 0: ⭐ ${ratingValue ?? ""}]   [אם sales_7d > 0: 🔥 נמכר ${salesValue ?? ""} פעמים השבוע]
[אם אין דירוג ואין מכירות — לדלג על השורה כולה]`
}

🔧 טכני: [מפרט אמיתי מתוך הנתונים — חומר/הספק/קיבולת/מידות/תאימות. בלי להמציא מספרים שלא קיימים.]
💰 ערך: [למה המחיר משתלם ביחס לחלופות בשוק. עניני, בלי סופרלטיבים.]
🛡️ בטיחות/תחזוקה: [נקודה אחת ספציפית לפי הקונטקסט הפלטפורמתי שלמעלה.]
💡 הערת Dknow: ${dknowNote}

💰 [המחיר עם סימן מטבע]
📦 המחיר באתר עשוי להשתנות
${coupon ? `🎟️ קופון: ${coupon}` : "[אם אין קופון — לדלג על השורה הזו לחלוטין]"}

🔗 לינק למוצר
[product_url]

כללים קריטיים:
- 4 בולטים בדיוק: טכני, ערך, בטיחות/תחזוקה, הערת Dknow. לא יותר ולא פחות.
- "הערת Dknow" חייבת להיות בדיוק הטקסט הבא: "${dknowNote}". לא לשנות, לא להוסיף, לא לקצר.
- אסור להמציא מפרטים. אם אין נתון — לכתוב משהו כללי-בטוח לפי הקטגוריה.
- העתק את ה-URL אות באות כפי שניתן. אל תשנה שום תו.
- אסור להוסיף חתימה, אסור להוסיף "reemdknow", אסור להוסיף שורה אחרי הלינק.
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
Manual Note (if any): ${product.note || "NONE"}
Resolved Dknow Note to use verbatim: ${dknowNote}
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

    // Post-process: replace any URL the AI may have modified with the original productUrl
    const urlRegex = /https?:\/\/[^\s\n)]+/g;
    const urls = message.match(urlRegex);
    if (urls && urls.length > 0) {
      for (const url of urls) {
        if (url.includes("aliexpress.com") || url.includes("lazada.co") || url.includes("s.click.")) {
          message = message.replace(url, productUrl);
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
