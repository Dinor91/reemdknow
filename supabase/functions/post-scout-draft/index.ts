// Posts an approved Scout V2 draft to the Israel Telegram channel.
// Body: { productId: string, platform: 'aliexpress' | 'amazon' }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TG_CHAT = Deno.env.get("TELEGRAM_ISRAEL_GROUP_ID")!;
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function fmtPriceUSD(p: number | null) {
  if (!p || p <= 0) return "";
  return `💰 $${Number(p).toFixed(2)}`;
}

function buildMessage(p: any, platform: string) {
  const name = p.product_name_hebrew || p.product_name_english || p.product_name || "מוצר";
  const lines: string[] = [];
  lines.push(`*${name}*`);
  if (p.audit_notes) lines.push(`\n📝 ${p.audit_notes}`);
  const meta: string[] = [];
  const price = fmtPriceUSD(p.price_usd);
  if (price) meta.push(price);
  if (p.rating && p.rating > 0) meta.push(`⭐ ${Number(p.rating).toFixed(1)}`);
  if (p.sales_count && p.sales_count > 0) meta.push(`🔥 ${p.sales_count}`);
  if (meta.length) lines.push(`\n${meta.join("  •  ")}`);
  if (p.tracking_link) lines.push(`\n🔗 ${p.tracking_link}`);
  lines.push(`\n_מקור: ${platform === "amazon" ? "Amazon" : "AliExpress"}_`);
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { productId, platform } = await req.json();
    if (!productId || !platform) {
      return new Response(JSON.stringify({ error: "productId & platform required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const table = platform === "amazon" ? "amazon_editor_products" : "israel_editor_products";
    const supa = createClient(SUPA_URL, SUPA_KEY);
    const { data: product, error } = await supa.from(table).select("*").eq("id", productId).single();
    if (error || !product) throw new Error("Product not found");

    const text = buildMessage(product, platform);
    const tgRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });
    const tgJson = await tgRes.json();
    if (!tgJson.ok) throw new Error(`Telegram: ${JSON.stringify(tgJson)}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
