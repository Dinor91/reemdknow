import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

  // Check pending contact requests
  const { count } = await supabase
    .from("contact_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  if (count && count > 0) {
    alerts.push(`יש ${count} בקשות לקוח ממתינות 📬`);
  }

  // Check products added recently (last 5 days)
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentProducts } = await supabase
    .from("category_products")
    .select("*", { count: "exact", head: true })
    .gte("created_at", fiveDaysAgo);

  const { count: recentIsrael } = await supabase
    .from("israel_editor_products")
    .select("*", { count: "exact", head: true })
    .gte("created_at", fiveDaysAgo);

  if ((recentProducts || 0) + (recentIsrael || 0) === 0) {
    alerts.push("לא נוספו מוצרים 5 ימים 📦");
  }

  return alerts;
}

async function handleProductSearch(supabase: any, platform: string, query: string): Promise<any> {
  // Call smart-search edge function
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
  // Get clicks this week
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

  // Count by source
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

async function detectIntent(messages: ChatMessage[]): Promise<{ intent: string; params: any }> {
  const systemPrompt = `You are an intent classifier for a Hebrew admin assistant called "דינו".
Analyze the latest user message and return a JSON object with:
{
  "intent": one of ["product_search", "daily_deal", "message_import", "weekly_summary", "statistics", "edit_template", "general_chat", "platform_select"],
  "params": {
    "platform": "israel" | "thailand" | null,
    "query": string | null,
    "template_name": string | null,
    "new_content": string | null,
    "pasted_message": string | null,
    "product_names": string[] | null
  }
}

Rules:
- If user mentions search/product/מוצר/חפש → product_search
- If user mentions deal/דיל/הודעה → daily_deal
- If user pastes a URL with lazada or aliexpress → message_import
- If user mentions summary/סיכום → weekly_summary
- If user mentions stats/סטטיסטיקות/קליקים → statistics
- If user mentions template/נוסח/תבנית → edit_template
- If user selects ישראל or תאילנד → platform_select
- Otherwise → general_chat

Return ONLY the JSON, no extra text.`;

  const raw = await callGemini([
    { role: "system", content: systemPrompt },
    ...messages.slice(-5),
  ]);

  try {
    let cleaned = (raw as string).trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    return JSON.parse(cleaned);
  } catch {
    return { intent: "general_chat", params: {} };
  }
}

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

    // Handle specific actions
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
      // Call generate-deal-message
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

    // Chat mode - detect intent and respond
    if (action === "chat") {
      const { intent, params: intentParams } = await detectIntent(messages);

      const dinoSystemPrompt = `אתה דינו 🦕, עוזר AI ידידותי של צוות DKNOW.
אתה מדבר בעברית בלבד, בגובה העיניים, קצר וחם.
אתה מכיר את המערכת: מוצרים מ-Lazada (תאילנד) ו-AliExpress (ישראל), מאגר curated, כלי דילים, וסטטיסטיקות.
תמיד תענה בקצרה וישירות. השתמש באימוג'ים בחסכנות.
אם שואלים על מוצר - תמיד תשאל קודם "🇮🇱 ישראל או 🇹🇭 תאילנד?"
אחרי תשובה כללית, תציע: "רוצה שאחפש את זה במאגר שלך?"`;

      // For general chat, use streaming
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
