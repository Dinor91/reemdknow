import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

async function callGemini(messages: ChatMessage[], stream = false): Promise<any> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      temperature: 0.7,
      stream,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI error: ${status}`);
  }

  if (stream) return response;
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function createSupabaseClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
}

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function verifyAdmin(supabase: any, authHeader: string): Promise<boolean> {
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return false;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  return !!roleData;
}

async function getProactiveAlerts(supabase: any): Promise<string[]> {
  const alerts: string[] = [];

  // Pending contact requests
  const { count } = await supabase
    .from("contact_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  if (count && count > 0) {
    alerts.push(`יש ${count} בקשות לקוח ממתינות 📬`);
  }

  // Per-country freshness tracking
  try {
    const { data: lastIsrael } = await supabase
      .from("israel_editor_products")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const { data: lastThailand } = await supabase
      .from("category_products")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const now = Date.now();
    if (lastIsrael?.created_at) {
      const daysIsrael = Math.floor((now - new Date(lastIsrael.created_at).getTime()) / (24 * 60 * 60 * 1000));
      if (daysIsrael > 3) {
        alerts.push(`🇮🇱 ישראל: ${daysIsrael} ימים ללא מוצר חדש`);
      }
    } else {
      alerts.push("🇮🇱 ישראל: אין מוצרים עדיין");
    }

    if (lastThailand?.created_at) {
      const daysThailand = Math.floor((now - new Date(lastThailand.created_at).getTime()) / (24 * 60 * 60 * 1000));
      if (daysThailand > 3) {
        alerts.push(`🇹🇭 תאילנד: ${daysThailand} ימים ללא מוצר חדש`);
      }
    } else {
      alerts.push("🇹🇭 תאילנד: אין מוצרים עדיין");
    }
  } catch { /* ignore */ }

  // Weekend summary reminders (Israel timezone UTC+3)
  try {
    const israelTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const day = israelTime.getUTCDay(); // 0=Sun, 4=Thu, 5=Fri
    const hour = israelTime.getUTCHours();

    if (day === 4 && hour >= 20) {
      alerts.push("🔔 הכיני סיכום סופ\"ש (מחר בצהריים)");
    } else if (day === 5 && hour >= 10 && hour < 16) {
      alerts.push("⏳ תזכורת אחרונה: סיכום סופ\"ש");
    }
  } catch { /* ignore */ }

  // Campaign health traffic light - AliExpress
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { count: campaignCount } = await serviceClient
      .from("aliexpress_feed_products")
      .select("*", { count: "exact", head: true })
      .eq("is_campaign_product", true)
      .eq("out_of_stock", false);

    const cc = campaignCount || 0;
    if (cc >= 50) {
      alerts.push(`✅ 🇮🇱 מצב מעולה — ${cc} מוצרי קמפיין`);
    } else if (cc > 0) {
      alerts.push(`⚠️ 🇮🇱 שים לב — רק ${cc} מוצרי קמפיין`);
    } else {
      alerts.push(`❌ 🇮🇱 אין קמפיינים — הרץ ייבוא`);
    }

    // Lazada high commission health
    const { count: lazadaHcCount } = await serviceClient
      .from("feed_products")
      .select("*", { count: "exact", head: true })
      .gte("commission_rate", 0.15)
      .eq("out_of_stock", false);

    const lhc = lazadaHcCount || 0;
    if (lhc >= 30) {
      alerts.push(`✅ 🇹🇭 ${lhc} מוצרי עמלה גבוהה`);
    } else if (lhc > 0) {
      alerts.push(`⚠️ 🇹🇭 רק ${lhc} מוצרי עמלה גבוהה`);
    } else {
      alerts.push(`❌ 🇹🇭 אין מוצרי עמלה גבוהה`);
    }
  } catch { /* ignore */ }

  return alerts;
}

async function handleProductSearch(supabase: any, platform: string, query: string): Promise<any> {
  const searchUrl = `${SUPABASE_URL}/functions/v1/smart-search`;
  const response = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      message: query,
      audience: platform === "israel" ? "israel" : "thailand",
    }),
  });

  if (!response.ok) throw new Error("Search failed");
  return await response.json();
}

async function handleStatistics(supabase: any): Promise<string> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: weekClicks } = await supabase
    .from("button_clicks")
    .select("button_type, source")
    .gte("created_at", weekAgo);

  const { count: monthTotal } = await supabase
    .from("button_clicks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthAgo);

  const sourceCount: Record<string, number> = {};
  for (const click of (weekClicks || [])) {
    const key = click.source || click.button_type || "unknown";
    sourceCount[key] = (sourceCount[key] || 0) + 1;
  }

  const top3 = Object.entries(sourceCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  let response = "📊 סטטיסטיקות:\n\n";
  response += `סה\"כ קליקים החודש: ${monthTotal || 0}\n\n`;
  response += "🏆 טופ 3 השבוע:\n";
  top3.forEach(([source, count], i) => {
    response += `${i + 1}. ${source} — ${count} קליקים\n`;
  });

  if (top3.length === 0) {
    response += "אין מספיק נתונים השבוע";
  }

  return response;
}

async function handleTemplateEdit(supabase: any, templateName: string, newContent: string): Promise<string> {
  const { error } = await supabase
    .from("message_templates")
    .update({ content: newContent })
    .eq("template_name", templateName);

  if (error) {
    console.error("Template update error:", error);
    return "שגיאה בעדכון התבנית ❌";
  }
  return "עודכן ✅";
}

// ────────── IMPORT PRODUCT ──────────

function extractProductId(url: string): { platform: "israel" | "thailand"; productId: string | null } {
  // AliExpress: /item/1234567890.html
  const aliMatch = url.match(/aliexpress\.com\/item\/(\d+)\.html/i);
  if (aliMatch) return { platform: "israel", productId: aliMatch[1] };

  // AliExpress product ID in query params
  const aliParamMatch = url.match(/productId=(\d+)/i);
  if (aliParamMatch) return { platform: "israel", productId: aliParamMatch[1] };

  // Lazada: /products/name-i{productId}-s{skuId}.html
  const lazMatch = url.match(/-i(\d+)-s\d+/i);
  if (lazMatch) return { platform: "thailand", productId: lazMatch[1] };

  // Lazada alternate: /products/{slug}.html with mp= param
  const lazMpMatch = url.match(/[?&]mp=(\d+)/i);
  if (lazMpMatch) return { platform: "thailand", productId: lazMpMatch[1] };

  // Detect platform even if no ID
  if (url.includes("lazada")) return { platform: "thailand", productId: null };
  if (url.includes("aliexpress")) return { platform: "israel", productId: null };

  return { platform: "israel", productId: null };
}

function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"']+/gi;
  return text.match(urlRegex) || [];
}

async function handleImportProduct(params: any): Promise<any> {
  const { text, confirmed, platform: confirmedPlatform, resolved_url, product_name } = params;

  // Step 1: Extract URLs and resolve short links
  if (!confirmed) {
    const urls = extractUrlsFromText(text);
    if (urls.length === 0) {
      return { success: false, error: "לא נמצא לינק בהודעה" };
    }

    const url = urls[0];
    let finalUrl = url;

    // Check if it's a short link that needs resolving
    const shortDomains = ["s.lazada.co.th", "c.lazada.co.th", "s.click.aliexpress.com", "a.aliexpress.com"];
    const isShort = shortDomains.some(d => url.includes(d));

    if (isShort) {
      try {
        const resolveResp = await fetch(`${SUPABASE_URL}/functions/v1/resolve-short-links`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ urls: [url] }),
        });
        const resolveData = await resolveResp.json();
        if (resolveData.resolved?.[url]) {
          finalUrl = resolveData.resolved[url];
        }
      } catch (e) {
        console.error("Failed to resolve short link:", e);
      }
    }

    const { platform, productId } = extractProductId(finalUrl);
    const platformLabel = platform === "israel" ? "🇮🇱 AliExpress (ישראל)" : "🇹🇭 Lazada (תאילנד)";

    return {
      success: true,
      step: "confirm",
      platform,
      platformLabel,
      productId,
      resolved_url: finalUrl,
      original_url: url,
    };
  }

  // Step 2: User confirmed → save to DB
  const serviceClient = createServiceClient();
  const platform = confirmedPlatform;

  if (platform === "israel") {
    // Build tracking link with affiliate params
    const trackingId = Deno.env.get("ALIEXPRESS_TRACKING_ID") || "";
    let trackingLink = resolved_url;
    if (trackingId && resolved_url.includes("aliexpress.com")) {
      const separator = resolved_url.includes("?") ? "&" : "?";
      trackingLink = `${resolved_url}${separator}aff_fcid=${trackingId}&aff_platform=portals-tool`;
    }

    const insertData: any = {
      product_name_hebrew: product_name || "מוצר חדש מ-AliExpress",
      tracking_link: trackingLink,
      category_name_hebrew: "כללי",
      is_active: true,
      out_of_stock: false,
    };

    // Extract product ID if available
    const aliMatch = resolved_url.match(/item\/(\d+)/);
    if (aliMatch) {
      insertData.aliexpress_product_id = aliMatch[1];
    }

    const { data, error } = await serviceClient
      .from("israel_editor_products")
      .insert(insertData)
      .select("id, product_name_hebrew")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return { success: false, error: `שגיאה בשמירה: ${error.message}` };
    }

    // Verify the row exists
    const { data: verify, error: verifyErr } = await serviceClient
      .from("israel_editor_products")
      .select("id, product_name_hebrew")
      .eq("id", data.id)
      .single();

    if (verifyErr || !verify) {
      return { success: false, error: "השורה לא נמצאה אחרי השמירה ❌" };
    }

    return {
      success: true,
      step: "saved",
      message: `נשמר ✅ — ${verify.product_name_hebrew} (ID #${verify.id.substring(0, 8)})`,
      id: verify.id,
    };
  } else {
    // Thailand / Lazada
    const insertData: any = {
      name_hebrew: product_name || "מוצר חדש מ-Lazada",
      affiliate_link: resolved_url,
      category: "כללי",
      is_active: true,
      out_of_stock: false,
    };

    // Extract Lazada product ID
    const lazMatch = resolved_url.match(/-i(\d+)-s/);
    if (lazMatch) {
      insertData.lazada_product_id = lazMatch[1];
    }

    const { data, error } = await serviceClient
      .from("category_products")
      .insert(insertData)
      .select("id, name_hebrew")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return { success: false, error: `שגיאה בשמירה: ${error.message}` };
    }

    // Verify
    const { data: verify, error: verifyErr } = await serviceClient
      .from("category_products")
      .select("id, name_hebrew")
      .eq("id", data.id)
      .single();

    if (verifyErr || !verify) {
      return { success: false, error: "השורה לא נמצאה אחרי השמירה ❌" };
    }

    return {
      success: true,
      step: "saved",
      message: `נשמר ✅ — ${verify.name_hebrew} (ID #${verify.id.substring(0, 8)})`,
      id: verify.id,
    };
  }
}

// ────────── MAIN HANDLER ──────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseClient(authHeader);
    const isAdmin = await verifyAdmin(supabase, authHeader);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, messages, params } = await req.json();

    if (action === "get_alerts") {
      const alerts = await getProactiveAlerts(supabase);
      return new Response(JSON.stringify({ alerts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search") {
      const results = await handleProductSearch(supabase, params.platform, params.query);
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "statistics") {
      const stats = await handleStatistics(supabase);
      return new Response(JSON.stringify({ message: stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_template") {
      const result = await handleTemplateEdit(supabase, params.template_name, params.new_content);
      return new Response(JSON.stringify({ message: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_deal") {
      const dealUrl = `${SUPABASE_URL}/functions/v1/generate-deal-message`;
      const dealResp = await fetch(dealUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      });
      const dealData = await dealResp.json();
      return new Response(JSON.stringify(dealData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fetch_template") {
      const { data, error } = await supabase
        .from("message_templates")
        .select("content")
        .eq("template_name", params.template_name)
        .maybeSingle();
      if (error) {
        console.error("Fetch template error:", error);
        return new Response(JSON.stringify({ error: "שגיאה בטעינת התבנית" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ content: data?.content || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_summary") {
      const template = params.template || "";
      const productNames = params.product_names || [];
      const summaryPrompt = `אתה כותב סיכום שבועי לקהילת דילים בוואטסאפ בעברית.
השתמש בתבנית הבאה כבסיס:
${template}

המוצרים של השבוע:
${productNames.map((n: string, i: number) => `${i + 1}. ${n}`).join("\n")}

כתוב הודעה חמה וקצרה בעברית, עם אימוג׳ים בחסכנות.
שמור על הפורמט של התבנית.`;

      const raw = await callGemini([
        { role: "system", content: "אתה כותב תוכן שיווקי בעברית לקהילת דילים." },
        { role: "user", content: summaryPrompt },
      ]);
      return new Response(JSON.stringify({ message: raw }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_templates") {
      const { data, error } = await supabase
        .from("message_templates")
        .select("template_name, content");
      if (error) {
        return new Response(JSON.stringify({ error: "שגיאה בטעינת תבניות" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ templates: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ────────── IMPORT PRODUCT ──────────
    if (action === "import_product") {
      const result = await handleImportProduct(params);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chat mode - streaming AI
    if (action === "chat") {
      const dinoSystemPrompt = `אתה דינו 🦕, עוזר AI ידידותי של צוות DKNOW.
אתה מדבר בעברית בלבד, בגובה העיניים, קצר וחם.
אתה מכיר את המערכת: מוצרים מ-Lazada (תאילנד) ו-AliExpress (ישראל), מאגר curated, כלי דילים, וסטטיסטיקות.
תמיד תענה בקצרה וישירות. השתמש באימוג'ים בחסכנות.`;

      const response = await callGemini(
        [
          { role: "system", content: dinoSystemPrompt },
          ...messages,
        ],
        true
      );

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dino-chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    let status = 500;
    if (msg === "RATE_LIMITED") status = 429;
    if (msg === "PAYMENT_REQUIRED") status = 402;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
