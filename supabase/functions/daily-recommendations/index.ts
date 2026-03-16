import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ADMIN_CHAT_ID = parseInt(Deno.env.get("TELEGRAM_USER_ID") || "0");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function sendMessage(chatId: number, text: string, extra?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML", ...extra };
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendPhoto(chatId: number, photoUrl: string, caption: string, extra?: any) {
  const body: any = { chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML", ...extra };
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    // Fallback to text if photo fails
    await sendMessage(chatId, caption, extra);
  }
}

interface RecommendedProduct {
  id: string;
  name: string;
  price: string;
  rating: number | null;
  commission_rate: number | null;
  sales: number | null;
  category: string | null;
  image_url: string | null;
  url: string | null;
}

async function getIsraelRecommendations(db: any): Promise<RecommendedProduct[]> {
  // Get product IDs sent as deals in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentDeals } = await db
    .from("deals_sent")
    .select("product_id")
    .gte("sent_at", thirtyDaysAgo);
  const recentDealIds = new Set((recentDeals || []).map((d: any) => d.product_id).filter(Boolean));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Query aliexpress_feed_products with rotation logic
  const { data: products, error } = await db
    .from("aliexpress_feed_products")
    .select("*")
    .eq("out_of_stock", false)
    .not("tracking_link", "is", null)
    .gte("rating", 4)
    .order("last_shown", { ascending: true, nullsFirst: true })
    .order("commission_rate", { ascending: false, nullsFirst: false })
    .order("sales_30d", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error || !products) return [];

  // Filter out recently sent deals and recently shown
  const candidates = products.filter((p: any) => {
    if (recentDealIds.has(p.id)) return false;
    if (p.last_shown && p.last_shown > sevenDaysAgo) return false;
    return true;
  });

  // Diversify by category — max 2 per category
  const categoryCount: Record<string, number> = {};
  const selected: any[] = [];

  for (const p of candidates) {
    if (selected.length >= 5) break;
    const cat = p.category_name_hebrew || "כללי";
    if ((categoryCount[cat] || 0) >= 2) continue;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    selected.push(p);
  }

  return selected.map((p: any) => ({
    id: p.id,
    name: p.product_name_hebrew || p.product_name,
    price: p.price_usd ? `$${p.price_usd}` : "לא ידוע",
    rating: p.rating,
    commission_rate: p.commission_rate,
    sales: p.sales_30d,
    category: p.category_name_hebrew,
    image_url: p.image_url,
    url: p.tracking_link,
  }));
}

async function getThailandRecommendations(db: any): Promise<RecommendedProduct[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentDeals } = await db
    .from("deals_sent")
    .select("product_id")
    .gte("sent_at", thirtyDaysAgo);
  const recentDealIds = new Set((recentDeals || []).map((d: any) => d.product_id).filter(Boolean));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const EXCLUDED = ['ציוד רפואי', 'פסלים', 'ציוד משרדי', 'מכונות', 'ציוד תעשייתי', 'הדברה', 'מוצרי מזון ישראליים'];

  const { data: products, error } = await db
    .from("feed_products")
    .select("*")
    .eq("out_of_stock", false)
    .not("tracking_link", "is", null)
    .order("last_shown", { ascending: true, nullsFirst: true })
    .order("commission_rate", { ascending: false, nullsFirst: false })
    .order("sales_7d", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error || !products) return [];

  const candidates = products.filter((p: any) => {
    if (recentDealIds.has(p.id)) return false;
    if (p.last_shown && p.last_shown > sevenDaysAgo) return false;
    if (EXCLUDED.includes(p.category_name_hebrew)) return false;
    return true;
  });

  const categoryCount: Record<string, number> = {};
  const selected: any[] = [];

  for (const p of candidates) {
    if (selected.length >= 5) break;
    const cat = p.category_name_hebrew || "כללי";
    if ((categoryCount[cat] || 0) >= 2) continue;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    selected.push(p);
  }

  return selected.map((p: any) => ({
    id: p.id,
    name: p.category_name_hebrew ? `${p.category_name_hebrew} — ${p.product_name}` : p.product_name,
    price: p.price_thb ? `฿${p.price_thb}` : "לא ידוע",
    rating: p.rating,
    commission_rate: p.commission_rate,
    sales: p.sales_7d,
    category: p.category_name_hebrew,
    image_url: p.image_url,
    url: p.tracking_link,
  }));
}

async function sendRecommendations(
  chatId: number,
  title: string,
  products: RecommendedProduct[],
  db: any,
  table: string,
) {
  if (products.length === 0) {
    await sendMessage(chatId, `${title}\n\n📭 אין מספיק מוצרים חדשים היום`);
    return;
  }

  await sendMessage(chatId, `${title}\n\n${products.length} מוצרים מומלצים:`);

  for (const p of products) {
    let caption = `<b>${p.name}</b>\n\n`;
    caption += `💰 מחיר: ${p.price}\n`;
    if (p.rating && p.rating > 0) caption += `⭐ דירוג: ${Number(p.rating).toFixed(1)}\n`;
    if (p.sales && p.sales > 0) caption += `🔥 מכירות: ${p.sales}\n`;
    if (p.commission_rate) caption += `💎 עמלה: ${Math.round(Number(p.commission_rate) * 100)}%\n`;
    if (p.category) caption += `📂 ${p.category}\n`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔗 צפה במוצר", url: p.url },
          { text: "✍️ צור דיל", callback_data: `deal_gen:${p.id}`.substring(0, 64) },
        ],
      ],
    };

    if (p.image_url) {
      await sendPhoto(chatId, p.image_url, caption, { reply_markup: keyboard });
    } else {
      await sendMessage(chatId, caption, { reply_markup: keyboard });
    }

    // Small delay between messages to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  // Update last_shown for selected products
  const ids = products.map((p) => p.id);
  await db
    .from(table)
    .update({ last_shown: new Date().toISOString() })
    .in("id", ids);
}

serve(async (req) => {
  try {
    console.log("🌅 Daily recommendations starting...");
    const db = createServiceClient();

    const [israelProducts, thaiProducts] = await Promise.all([
      getIsraelRecommendations(db),
      getThailandRecommendations(db),
    ]);

    console.log(`Found ${israelProducts.length} Israel, ${thaiProducts.length} Thailand recommendations`);

    await sendRecommendations(
      ADMIN_CHAT_ID,
      "🌅 המלצות יומיות — ישראל 🇮🇱",
      israelProducts,
      db,
      "aliexpress_feed_products",
    );

    await sendRecommendations(
      ADMIN_CHAT_ID,
      "🌅 המלצות יומיות — תאילנד 🇹🇭",
      thaiProducts,
      db,
      "feed_products",
    );

    return new Response(JSON.stringify({ 
      success: true, 
      israel: israelProducts.length, 
      thailand: thaiProducts.length 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Daily recommendations error:", e);
    // Notify admin about failure
    try {
      await sendMessage(ADMIN_CHAT_ID, `❌ שגיאה בהמלצות יומיות:\n${e instanceof Error ? e.message : "Unknown"}`);
    } catch (_) {}
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
