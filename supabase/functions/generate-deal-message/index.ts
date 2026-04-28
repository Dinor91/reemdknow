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

  const dknowNoteInstruction = hasManualNote
    ? `Use this EXACT manual Dknow note verbatim, character-for-character: "${manualNote}"`
    : `Generate a Dknow note that is EITHER a maintenance tip ("ודאו ש..."), a technical limitation ("שימו לב ש..."), OR an insider recommendation NOT in the specs. NEVER repeat the product name. NEVER restate what was already written above. Make it specific to "${product.name}" in category "${product.category || "כללי"}".`;

  const systemPrompt = `### BRAND IDENTITY
You are "Dknow Auditor" — a professional product reviewer for the Israeli community "reemdknow". You are NOT writing an ad. You are writing a reviewer's report: factual, direct, and trustworthy.

### CORE WRITING RULE: FACT → MEANING
Every bullet must contain a technical fact immediately followed by its real-world implication.
Wrong: "מקדחה חזקה מאוד." (empty praise)
Right: "🔧 **הספק 600W:** עוצמה שלא תגמגם גם בבטון קשוח."

### FORBIDDEN WORDS (Anti-Bot List)
NEVER use: מטורף, מדהים, הזוי, חובה, הכי טוב, מספק, מציע, יחסית, בשוק קיימים, תמורה טובה, מיועד ל

### HOOK RULE
Start with a short emotional question describing a daily frustration.
NEVER start with "If you face..." or "Searching for..." or "אם אתם מחפשים".
Good: "נמאס לכם לחכות לשכן בכל פעם שצריך לתלות מדף?"
Good: "הטלפון נגמר בדיוק כשה-Waze הכי נחוץ?"

### MANDATORY STRUCTURE
1. Hook (frustration question)
2. Product name + Brand (format: *שם מוצר - מותג*)
3. Status line: ⭐ [rating] | 📈 [sales or discount]
4. ✨ למה זאת הבחירה שלי? ← THIS HEADER IS MANDATORY, ALWAYS INCLUDE IT
5. 🔧 **[Technical keyword]:** fact + real-world meaning
6. 💰 **[Value keyword]:** price justification vs. alternatives
7. 🛡️ **[Safety/Warranty keyword]:** certification or local service note
8. 💡 **הערת Dknow:** maintenance tip / technical limitation / insider tip
   NOT a summary. Tell the user something NOT in the specs.
9. Price + coupon (if any) + shipping note
10. Product URL — inject product.url exactly as received, no modifications

### DKNOW NOTE RULE
This is the most important section. It must be one of:
- A maintenance tip ("ודאו ש...")
- A technical limitation ("שימו לב ש...")
- An insider recommendation the user would NOT find in the specs
NEVER repeat the product name. NEVER restate what was already written.
Bad: "המטען הזה יכול לשפר את חוויית הטעינה שלכם." (restatement)
Good: "מטענים אלחוטיים מייצרים חום — אם הטלפון בתוך כיסוי עבה, מהירות הטעינה תרד משמעותית." (limitation the user didn't know)

### PLATFORM CONTEXT
${platformContext}

- KSP: emphasize Israeli warranty and local service
- AliExpress / Lazada: emphasize CE/RoHS/BPA certifications, counterfeit risk
- Amazon: detect Prime eligibility and BestSeller rank when available

### DATA INJECTION
- URL = ${productUrl} (exact, unchanged — copy character-for-character)
- Price = ${product.price} with correct currency symbol (₪ / $ / ฿)
- Original price = ${product.original_price || "NONE"} (only show if higher than sale price)
- Rating = ${ratingValue ?? "NONE"}
- Sales 7d = ${salesValue ?? "NONE"}
- Discount = ${product.discount_percent ?? "NONE"}%
- Coupon = ${coupon || "NONE"}
- ${dknowNoteInstruction}

### TARGET OUTPUT EXAMPLES (HEBREW)
The following examples represent the exact Tone of Voice, structure, and Hebrew phrasing required. Follow the logic of "Fact → Meaning" and avoid all superlatives.

--- EXAMPLE 1: Tools (Power & Reliability) ---
עדיין משאילים מקדחה מהשכן בכל פעם שצריך לתלות מדף?

*מקדחה רוטטת Bosch GSB 13 RE*

⭐ 4.8 | 🏷️ 25% הנחה

✨ למה זאת הבחירה שלי?

🔧 **הספק 600W:** עוצמה שמתאימה גם לקירות בטון וגם להברגות עדינות בעץ – כלי אחד שסוגר את כל הפינות בבית.

💰 **מותג ששורד שנים:** ב-299 ש"ח אתם קונים שקט נפשי. סוס עבודה של Bosch, לא כלי סיני שיישרף אחרי שני חורים.

🛡️ **אחריות יבואן רשמי:** שירות מקומי בארץ, בלי כאבי ראש של משלוחים לחו"ל.

💡 **הערת Dknow:** ודאו שאתם משתמשים במקדח שמתאים לסוג הקיר — מקדחה טובה עם מקדח שחוק זה בזבוז של המנוע.

💲 299 ש"ח (מחיר מקורי 399 ש"ח)

https://ksp.co.il/...

--- EXAMPLE 2: Gadgets from China (Safety & Data Verification) ---
נתקעים עם טלפון בלי סוללה בדיוק באמצע הניווט?

*מטען רכב אלחוטי 15W – Baseus*

⭐ 4.7 | 📈 230 מכירות השבוע

✨ למה זאת הבחירה שלי?

🔧 **טעינה אלחוטית 15W:** מהירות קרובה למטען קיר, בלי כבלים שמתרוצצים על לוח המחוונים.

💰 **חיסכון מול הארץ:** חצי מחיר ממותג זהה בחנויות מקומיות.

🛡️ **תקן בטיחות CE:** עומד בתקנים אירופאיים — קריטי למניעת התחממות יתר בקיץ.

💡 **הערת Dknow:** מטענים אלחוטיים מייצרים חום — אם הטלפון בתוך כיסוי עבה, מהירות הטעינה תרד משמעותית.

💲 $12.99

https://aliexpress.com/...

--- EXAMPLE 3: Beach / Leisure (Materials & Standards) ---
נמאס לכם לחזור מהים אדומים למרות שישבתם מתחת לצילייה?

*ציליית חוף Guro 2.1x2.1 מ'*

⭐ 4.6 | 📈 180 מכירות השבוע

✨ למה זאת הבחירה שלי?

🔧 **בד לייקרה אלסטי:** שורד מתיחות מול רוח חזקה בלי להיקרע, בניגוד לפוליאסטר זול.

💰 **הגנת UPF 50+:** הנתון הכי חשוב — מסנן קרינה מאומת שבאמת שומר עליכם בשעות החמות.

🛡️ **תחזוקה פשוטה:** דוחה חול, מתייבש בשניות, מתקפל לתיק קטן.

💡 **הערת Dknow:** הסוד ליציבות — מלאו את השקים בחול רטוב ומתחו חזק בכיוון הנגדי לרוח.

💲 ₪[מחיר בפועל]

https://lazada.co.th/...

### CRITICAL RULES
- Output the URL EXACTLY: ${productUrl} — do not modify any character.
- No signature. No "reemdknow". No content after the URL.
- Maximum one exclamation mark in entire message.
- Under 200 words.`;

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
