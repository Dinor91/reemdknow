import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Platform-specific strategic focus injected into the prompt
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

  const hasManualNote = product.note && String(product.note).trim().length > 0;
  const manualNote = hasManualNote ? String(product.note).trim() : null;
  const shippingInfo = product.shipping_info ? String(product.shipping_info).trim() : null;

  const dknowNoteInstruction = hasManualNote
    ? `Use this EXACT manual Dknow note as the CORE — character-for-character: "${manualNote}".
This is the user's professional verdict — it overrides everything else.`
    : `Generate a Dknow note that is STRICTLY one of:
   (א) פעולת תחזוקה/שימוש קונקרטית שהמשתמש צריך לעשות ("להעביר חלקי הסיליקון במדיח פעם בשבוע", "לבדוק חיזוק ברגים אחרי 100 ק\"מ", "להפעיל מצב self-clean פעם בחודש").
   (ב) אזהרה מדגם דומה/זול יותר באותו מותג שהוא "מלכודת" צרכנית (פשרה איכותית).
NEVER: לחזור על שם המוצר, להזכיר מחיר, לכתוב "מומלץ"/"כדאי" בלי הצדקה טכנית, לסכם את הבולטים שמעל.`;

  const groundingBlock = groundingFacts
    ? `### GROUNDING FACTS (real web research)
${groundingFacts}

USE THESE FACTS to extract the SPECIFIC name of the technology/patent/material/standard:
- חומרים: "נירוסטה 304", "PU מוזרק 32 מ\"מ", "סיליקון food-grade", "ABS"
- פטנטים/טכנולוגיות: "פטנט Hydraflow", "מנגנון FreeSip", "טכנולוגיית UVGuard"
- תקנים: "CE", "RoHS", "FDA", "ANSI Z87.1", "TIS 1521", "IP67"
- ביצועים מדידים: "שמירת קור 24 שעות", "600W", "טווח 10 מטר"
NEVER invent. אם אין נתון בגראונדינג — דלג על הבולט.`
    : `### GROUNDING FACTS
NONE. השתמש רק במידע מהשדות. אל תמציא מפרט.`;

  const systemPrompt = `### BRAND IDENTITY
You are "Dknow Auditor v4" — engineering-grade product reviewer for the Israeli community "reemdknow".
You write a polished, conversational AUDIT — not an ad. The tone is a knowledgeable friend explaining why a specific engineering detail matters.

### YOUR JOB
Generate ONLY the CONTENT BLOCK. The price line and link line are added automatically by the system AFTER your output — do NOT write them yourself.

### CORE PRINCIPLE
Wrong: "קיבולת 49 ליטר — נפח שמתאים למשפחה" (anyone can read the box)
Right: "**בידוד ואקום משולש**: שומר על המים קרים גם ברכב לוהט בקיץ הישראלי, לא רק בקבוק יפה"

### FORBIDDEN WORDS (Anti-Bot)
NEVER: מטורף, מדהים, הזוי, חובה, הכי טוב, מספק, מציע, יחסית, תמורה טובה, מיועד ל
NEVER use robotic connectors: "מה שזה אומר עבורך", "המשמעות היא", "זה אומר ש", "כלומר".
המשפט בכל בולט חייב לזרום טבעי, כאילו אתה מסביר לחבר. אך ורק עברית — בלי מילים בערבית/אנגלית בתוך הסבר עברי.

### EXACT OUTPUT STRUCTURE (write EXACTLY this, nothing else)

[שורה 1] Hook — שאלת תסכול יומיומית. בלי "אם אתם מחפשים".
[שורה ריקה]
[שורה 2] שם המוצר - מותג   (פורמט: "שם המוצר - שם המותג")
[שורה ריקה]
[שורה 3] ✨ למה זאת הבחירה שלי?
[שורות בולטים] בדיוק 2 או 3 בולטים (לא 4, לא 1!) בפורמט:
• **[שם הטכנולוגיה/פטנט/חומר הספציפי מהגראונדינג]:** הסבר טבעי שמחבר את ההנדסה לתועלת יומיומית.
[שורה ריקה]
💡 הערת Dknow: [לפי החוקים בהמשך]

⛔ STOP HERE. אל תכתוב כלום אחרי הערת Dknow. אסור לכתוב מחיר, לינק, קופון, משלוח, חתימה, או כל דבר נוסף. המערכת מוסיפה את זה אוטומטית.

### BULLET RULES
⛔ אסור: אימוג'י לפני הבולט (לא 🔧 לא 💰 לא 🛡️). רק התו "•".
⛔ אסור: שם בולט גנרי כמו "טכני" / "ערך" / "בטיחות". חייב להיות שם ספציפי.
⛔ אסור: ביטויי קישור רובוטיים אחרי הנקודתיים.
⛔ אסור: יותר מ-3 בולטים.

### ABSOLUTE PROHIBITIONS
⛔ אין שורת סטטוס של ⭐ דירוג / 🏷️ הנחה / 📈 מכירות / 🏆 BestSeller.
⛔ אין מחיר, קופון, משלוח, או לינק בפלט שלך — המערכת מוסיפה אותם אוטומטית.
⛔ אין חתימה, אין "reemdknow", אין שום דבר אחרי הערת Dknow.
⛔ מקסימום סימן קריאה אחד בכל ההודעה. עד 150 מילים.

### DKNOW NOTE RULES (THE VERDICT)
${dknowNoteInstruction}

### COMPARISON RULE
לא להשוות סתם. רק אם: (א) המשתמש נתן כיוון בהערה הידנית, או (ב) הגראונדינג חושף דגם זול יותר באותו מותג שהוא מלכודת.

### PLATFORM CONTEXT
${platformContext}

${groundingBlock}

### DATA INJECTION
- Brand = ${product.brand || "NONE"}
- Category = ${product.category || "כללי"}
- Manual Verdict = ${manualNote ?? "NONE"}`;

  const userPrompt = `Generate the audit CONTENT BLOCK only (Hook → name → ✨ bullets → 💡 Dknow note). STOP after the Dknow note.

Source: ${source || "default"}
Name: ${product.name}
Brand: ${product.brand || "NONE"}
Category: ${product.category || "כללי"}
Manual Dknow Verdict: ${manualNote ?? "NONE — generate from grounding"}

Remember:
- 2-3 bullets only, with • and **bold** technology name.
- No emojis on bullets.
- STOP after the 💡 Dknow note. Do not write price, coupon, shipping, or link.`;

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

    // === Post-processing enforcement v4 ===
    // 1. Fix unicode replacement chars (�) — happens when model corrupts emojis
    // Try to restore based on line context
    message = message.replace(/^[\s•*]*\*\*\s*�\s*הערת Dknow/gm, "💡 הערת Dknow");
    message = message.replace(/^[\s•*]*\*\*\s*�\s*(\d)/gm, "💲 $1");
    message = message.replace(/^[\s•*]*\*\*\s*�\s*לינק/gm, "🔗 לינק");
    message = message.replace(/�/g, ""); // strip any remaining replacement chars

    // 2. If model wrote bullet-prefixed lines for the structural blocks, restore them
    message = message.replace(/^[\s]*•\s*\*\*\s*הערת Dknow:?\s*/gm, "💡 הערת Dknow: ");
    message = message.replace(/^[\s]*•\s*\*\*\s*(?=\d+\s*₪|\d+\s*$)/gm, "💲 ");
    message = message.replace(/^[\s]*•\s*\*\*\s*(?=לינק)/gm, "🔗 ");

    // 3. Convert engineering bullet emojis to • if model slipped them at start of bullet
    message = message.replace(/^[\s]*[🔧💰🛡️⚙️🔩]\s*\*?\*?\s*/gm, "• **");

    // 4. Remove any leftover status lines (⭐/🏷️/📈/🏆 — short lines dominated by these)
    message = message.replace(/^.*[⭐🏷️📈🏆].*$/gm, (line) => {
      const stripped = line.replace(/[⭐🏷️📈🏆\s\d.,%|]/g, "");
      return stripped.length < 5 ? "" : line;
    });
    // 5. Remove placeholder phrases for missing data
    message = message.replace(/^.*(ללא דירוג|אין דירוג|אין הנחה|ללא נתוני מכירה|ללא הנחה|לא ידוע).*$/gm, "");
    // 6. Remove "💰 אזור מחיר ומשלוח" header line if model added it
    message = message.replace(/^.*💰\s*אזור מחיר.*$/gm, "");
    // 7. Remove "כמה תשלמו?" if model added it
    message = message.replace(/💲\s*כמה תשלמו\?\s*/g, "💲 ");
    // 8. Strip robotic connectors after bullet colons
    message = message.replace(/:\*\*\s*(מה שזה אומר עבורך|המשמעות היא|זה אומר ש|כלומר)[,:\s]*/g, ":** ");
    message = message.replace(/(מה שזה אומר עבורך|המשמעות היא|זה אומר ש)[,:\s]+/g, "");

    // 9. Merge separate price/coupon/shipping lines into single line
    message = message.replace(
      /(💲[^\n|]+?)\n+(🎟️[^\n|]+?)(?:\n+(🚚[^\n|]+?))?(?=\n|$)/g,
      (_m, p, c, s) => s ? `${p.trim()} | ${c.trim()} | ${s.trim()}` : `${p.trim()} | ${c.trim()}`
    );
    message = message.replace(
      /(💲[^\n|]+?)\n+(🚚[^\n|]+?)(?=\n|$)/g,
      (_m, p, s) => `${p.trim()} | ${s.trim()}`
    );

    // 10. Limit bullets to 3 max (in the ✨ block)
    message = message.replace(
      /(✨[^\n]*\n)((?:^•[^\n]*\n){4,})/m,
      (_m, header, bullets) => {
        const lines = bullets.split("\n").filter((l: string) => l.trim().startsWith("•"));
        return header + lines.slice(0, 3).join("\n") + "\n";
      }
    );

    // 11. Collapse 3+ blank lines into 2
    message = message.replace(/\n{3,}/g, "\n\n").trim();

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
