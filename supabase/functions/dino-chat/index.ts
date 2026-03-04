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

    // ────────── CONVERSION REPORTS ──────────
    if (action === "conversions_lazada") {
      try {
        const now = new Date();
        // Split into calendar month calls (API requires single-month queries)
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const formatDateStr = (d: Date) => d.toISOString().split("T")[0];

        const fetchLazMonth = async (start: Date, end: Date) => {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/lazada-api`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({
              action: "conversion-report",
              dateStart: formatDateStr(start),
              dateEnd: formatDateStr(end),
            }),
          });
          return await resp.json();
        };

        // Fetch previous month + current month in parallel
        const [prevData, currData] = await Promise.all([
          fetchLazMonth(prevMonthStart, new Date(currentMonthStart.getTime() - 1)),
          fetchLazMonth(currentMonthStart, now),
        ]);

        // Correct data path: data.result.data (array of order objects)
        const prevOrders = prevData.data?.result?.data || [];
        const currOrders = currData.data?.result?.data || [];
        const allOrders = [...prevOrders, ...currOrders];

        // Correct commission field: estPayout (THB)
        const totalCommission = allOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.estPayout) || 0), 0);
        const totalSales = allOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.orderAmt) || 0), 0);
        const ilsAmount = Math.round(totalCommission * 0.36);

        console.log(`Lazada conversions: ${allOrders.length} orders, ฿${totalCommission.toFixed(0)} commission, ฿${totalSales.toFixed(0)} sales`);

        const msg = allOrders.length > 0
          ? `🇹🇭 לזדה (30 יום):\n${allOrders.length} הזמנות | ฿${totalSales.toFixed(0)} מכירות | ฿${totalCommission.toFixed(0)} עמלה (≈₪${ilsAmount})`
          : `🇹🇭 לזדה: אין הזמנות ב-30 יום האחרונים\n💡 טיפ: שתף עוד דילים בקבוצה כדי להגדיל המרות`;

        return new Response(JSON.stringify({ message: msg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("Lazada conversions error:", e);
        return new Response(JSON.stringify({ message: "⚠️ שגיאה בטעינת נתוני Lazada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "conversions_aliexpress") {
      try {
        // Fetch TWO statuses in parallel: "Payment Completed" + "Buyer Confirmed Receipt"
        const fetchAliOrders = async (status: string) => {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/aliexpress-api`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ action: "order-list", status }),
          });
          return await resp.json();
        };

        const [paidData, confirmedData] = await Promise.all([
          fetchAliOrders("Payment Completed"),
          fetchAliOrders("Buyer Confirmed Receipt"),
        ]);

        // Extract orders from both responses
        const paidOrders = paidData.data?.aliexpress_affiliate_order_list_response?.resp_result?.result?.orders?.order || [];
        const confirmedOrders = confirmedData.data?.aliexpress_affiliate_order_list_response?.resp_result?.result?.orders?.order || [];

        // Deduplicate by order_id — prefer confirmed (settled) version
        const orderMap = new Map<string, any>();
        for (const o of paidOrders) orderMap.set(o.order_id || o.order_number, o);
        for (const o of confirmedOrders) orderMap.set(o.order_id || o.order_number, o); // overwrites paid with confirmed
        const allOrders = Array.from(orderMap.values());

        // Sum commissions: prefer estimated_finished_commission, fallback to estimated_paid_commission (all in cents)
        const totalCommissionCents = allOrders.reduce((sum: number, o: any) => {
          return sum + (parseFloat(o.estimated_finished_commission) || parseFloat(o.estimated_paid_commission) || 0);
        }, 0);
        const totalAmountCents = allOrders.reduce((sum: number, o: any) => {
          return sum + (parseFloat(o.finished_amount) || parseFloat(o.paid_amount) || 0);
        }, 0);
        const totalCommission = totalCommissionCents / 100;
        const totalAmount = totalAmountCents / 100;
        const ilsAmount = Math.round(totalCommission * 3.70);

        console.log(`AliExpress conversions: ${allOrders.length} orders (${paidOrders.length} paid + ${confirmedOrders.length} confirmed), $${totalCommission.toFixed(2)} commission`);

        const msg = allOrders.length > 0
          ? `🇮🇱 אליאקספרס (30 יום):\n${allOrders.length} הזמנות | $${totalAmount.toFixed(2)} מכירות | $${totalCommission.toFixed(2)} עמלה (≈₪${ilsAmount})`
          : `🇮🇱 אליאקספרס: אין הזמנות ב-30 יום האחרונים\n💡 טיפ: פרסם מוצרי קמפיין עם עמלה גבוהה`;

        return new Response(JSON.stringify({ message: msg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("AliExpress conversions error:", e);
        return new Response(JSON.stringify({ message: "⚠️ שגיאה בטעינת נתוני AliExpress" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "conversions_all") {
      const results: string[] = [];
      let totalILS = 0;

      // Lazada — calendar month split + correct data path
      try {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const fmtD = (d: Date) => d.toISOString().split("T")[0];

        const fetchLaz = async (start: Date, end: Date) => {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/lazada-api`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ action: "conversion-report", dateStart: fmtD(start), dateEnd: fmtD(end) }),
          });
          return await r.json();
        };

        const [prev, curr] = await Promise.all([
          fetchLaz(prevMonthStart, new Date(currentMonthStart.getTime() - 1)),
          fetchLaz(currentMonthStart, now),
        ]);

        const orders = [...(prev.data?.result?.data || []), ...(curr.data?.result?.data || [])];
        const comm = orders.reduce((s: number, o: any) => s + (parseFloat(o.estPayout) || 0), 0);
        const ils = Math.round(comm * 0.36);
        totalILS += ils;
        results.push(orders.length > 0
          ? `🇹🇭 לזדה: ${orders.length} הזמנות | ฿${comm.toFixed(0)} עמלה (≈₪${ils})`
          : `🇹🇭 לזדה: אין הזמנות`);
      } catch {
        results.push("🇹🇭 לזדה: שגיאה בטעינה");
      }

      // AliExpress — two statuses + dedup
      try {
        const fetchAli = async (status: string) => {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/aliexpress-api`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ action: "order-list", status }),
          });
          return await r.json();
        };

        const [paidD, confD] = await Promise.all([
          fetchAli("Payment Completed"),
          fetchAli("Buyer Confirmed Receipt"),
        ]);

        if (!paidD.error && !confD.error) {
          const paidO = paidD.data?.aliexpress_affiliate_order_list_response?.resp_result?.result?.orders?.order || [];
          const confO = confD.data?.aliexpress_affiliate_order_list_response?.resp_result?.result?.orders?.order || [];
          const oMap = new Map<string, any>();
          for (const o of paidO) oMap.set(o.order_id || o.order_number, o);
          for (const o of confO) oMap.set(o.order_id || o.order_number, o);
          const orders = Array.from(oMap.values());

          const commCents = orders.reduce((s: number, o: any) => s + (parseFloat(o.estimated_finished_commission) || parseFloat(o.estimated_paid_commission) || 0), 0);
          const comm = commCents / 100;
          const ils = Math.round(comm * 3.70);
          totalILS += ils;
          results.push(orders.length > 0
            ? `🇮🇱 אליאקספרס: ${orders.length} הזמנות | $${comm.toFixed(2)} עמלה (≈₪${ils})`
            : `🇮🇱 אליאקספרס: אין הזמנות`);
        } else {
          results.push("🇮🇱 אליאקספרס: API לא זמין (נדרש שדרוג)");
        }
      } catch {
        results.push("🇮🇱 אליאקספרס: שגיאה בטעינה");
      }

      const msg = `📊 דוח רווחים (30 יום):\n\n${results.join("\n")}\n\n💰 סה״כ רווח משוער: ₪${totalILS}\n\n_* שער המרה: 1฿=₪0.36, $1=₪3.70_`;

      return new Response(JSON.stringify({ message: msg }), {
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
