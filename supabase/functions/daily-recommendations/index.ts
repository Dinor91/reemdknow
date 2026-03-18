import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ADMIN_CHAT_ID = parseInt(Deno.env.get("TELEGRAM_USER_ID") || "0");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ─── DAILY SLOTS ───────────────────────────────────────────────

interface DailySlot {
  name: string;
  category: string;
  includeKeywords: string[];
  excludeKeywords: string[];
}

const DAILY_SLOTS: DailySlot[] = [
  {
    name: "ילדים ומשחקים",
    category: "ילדים ומשחקים",
    includeKeywords: ["toy", "game", "puzzle", "lego", "doll", "car toy", "board game", "play", "kids"],
    excludeKeywords: ["sticker", "stamp", "pencil", "eraser", "notebook", "pen", "label", "tag", "card"],
  },
  {
    name: "גאדג׳ט טכנולוגי",
    category: "גאדג׳טים ובית חכם",
    includeKeywords: ["charger", "cable", "mouse", "earphone", "usb", "stand", "speaker", "wireless", "bluetooth"],
    excludeKeywords: ["jewelry", "bracelet", "stone", "crystal", "supplement", "herb"],
  },
  {
    name: "כלי עבודה",
    category: "כלי עבודה וציוד",
    includeKeywords: ["drill", "bit", "screwdriver", "tool", "wrench", "measure", "level", "clamp"],
    excludeKeywords: ["toy", "sticker", "decoration"],
  },
  {
    name: "פתרון לבית",
    category: "בית ומטבח",
    includeKeywords: ["magnet", "hook", "organizer", "storage", "silicone", "holder", "rack", "wall"],
    excludeKeywords: ["supplement", "herb", "medicine", "crystal", "stone"],
  },
  {
    name: "מוצר לחוץ לבית",
    category: "בריאות וספורט",
    includeKeywords: ["bottle", "thermos", "lunch box", "backpack", "outdoor", "sport", "travel", "bag"],
    excludeKeywords: ["supplement", "herb", "medicine", "energy", "male", "sexual"],
  },
];

// ─── HELPERS ───────────────────────────────────────────────────

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

// ─── SCORING ───────────────────────────────────────────────────

function scoreProduct(rating: number | null, sales: number | null, commissionRate: number | null): number {
  const r = rating ?? 0;
  const s = sales ?? 0;
  const c = commissionRate ?? 0;
  return (r * 0.4) + (Math.log(s + 1) * 0.35) + (c * 0.25);
}

// ─── KEYWORD FILTERING ────────────────────────────────────────

function matchesKeywords(productName: string, includeKeywords: string[], excludeKeywords: string[]): boolean {
  const lower = productName.toLowerCase();
  const hasInclude = includeKeywords.some((kw) => lower.includes(kw.toLowerCase()));
  if (!hasInclude) return false;
  const hasExclude = excludeKeywords.some((kw) => lower.includes(kw.toLowerCase()));
  if (hasExclude) return false;
  return true;
}

// ─── SLOT-BASED SELECTION ──────────────────────────────────────

async function selectProductForSlot(
  db: any,
  table: string,
  slot: DailySlot,
  salesColumn: string,
  recentDealIds: Set<string>,
): Promise<{ product: any; step: number } | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Base query builder
  const baseQuery = () =>
    db
      .from(table)
      .select("*")
      .eq("category_name_hebrew", slot.category)
      .eq("out_of_stock", false)
      .not("tracking_link", "is", null)
      .gte("commission_rate", 0.15)
      .order("last_shown", { ascending: true, nullsFirst: true })
      .limit(200);

  // ── Step 1: fresh + keywords ──
  const { data: step1Data } = await baseQuery();
  if (step1Data) {
    const candidates = (step1Data as any[]).filter((p) => {
      if (recentDealIds.has(p.id)) return false;
      if (p.last_shown && p.last_shown > sevenDaysAgo) return false;
      return matchesKeywords(p.product_name, slot.includeKeywords, slot.excludeKeywords);
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => scoreProduct(b.rating, b[salesColumn], b.commission_rate) - scoreProduct(a.rating, a[salesColumn], a.commission_rate));
      console.log(`🎰 [${slot.name}] שלב 1 — ${candidates.length} מועמדים, נבחר: "${candidates[0].product_name}"`);
      return { product: candidates[0], step: 1 };
    }
  }

  // ── Step 2: no freshness filter + keywords ──
  const { data: step2Data } = await baseQuery();
  if (step2Data) {
    const candidates = (step2Data as any[]).filter((p) => {
      if (recentDealIds.has(p.id)) return false;
      return matchesKeywords(p.product_name, slot.includeKeywords, slot.excludeKeywords);
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => scoreProduct(b.rating, b[salesColumn], b.commission_rate) - scoreProduct(a.rating, a[salesColumn], a.commission_rate));
      console.log(`🎰 [${slot.name}] שלב 2 (ללא רעננות) — ${candidates.length} מועמדים, נבחר: "${candidates[0].product_name}"`);
      return { product: candidates[0], step: 2 };
    }
  }

  // ── Step 3: fallback — no keyword filter ──
  const { data: step3Data } = await baseQuery();
  if (step3Data && step3Data.length > 0) {
    const candidates = (step3Data as any[]).filter((p) => !recentDealIds.has(p.id));
    const pool = candidates.length > 0 ? candidates : step3Data as any[];
    pool.sort((a: any, b: any) => scoreProduct(b.rating, b[salesColumn], b.commission_rate) - scoreProduct(a.rating, a[salesColumn], a.commission_rate));
    console.log(`🎰 [${slot.name}] שלב 3 (fallback) — ${pool.length} מועמדים, נבחר: "${pool[0].product_name}"`);
    return { product: pool[0], step: 3 };
  }

  console.log(`🎰 [${slot.name}] ❌ לא נמצא מוצר כלל`);
  return null;
}

// ─── PLATFORM RECOMMENDATIONS ──────────────────────────────────

async function getRecentDealIds(db: any): Promise<Set<string>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("deals_sent")
    .select("product_id")
    .gte("sent_at", thirtyDaysAgo);
  return new Set((data || []).map((d: any) => d.product_id).filter(Boolean));
}

async function getIsraelRecommendations(db: any): Promise<RecommendedProduct[]> {
  const recentDealIds = await getRecentDealIds(db);
  const results: RecommendedProduct[] = [];

  for (const slot of DAILY_SLOTS) {
    const result = await selectProductForSlot(db, "aliexpress_feed_products", slot, "sales_30d", recentDealIds);
    if (result) {
      const p = result.product;
      // Update last_shown
      await db.from("aliexpress_feed_products").update({ last_shown: new Date().toISOString() }).eq("id", p.id);
      results.push({
        id: p.id,
        name: p.product_name_hebrew || p.product_name,
        price: p.price_usd ? `$${p.price_usd}` : "לא ידוע",
        rating: p.rating,
        commission_rate: p.commission_rate,
        sales: p.sales_30d,
        category: p.category_name_hebrew,
        image_url: p.image_url,
        url: p.tracking_link,
      });
    }
  }

  return results;
}

async function getThailandRecommendations(db: any): Promise<RecommendedProduct[]> {
  const recentDealIds = await getRecentDealIds(db);
  const results: RecommendedProduct[] = [];

  for (const slot of DAILY_SLOTS) {
    const result = await selectProductForSlot(db, "feed_products", slot, "sales_7d", recentDealIds);
    if (result) {
      const p = result.product;
      // Update last_shown
      await db.from("feed_products").update({ last_shown: new Date().toISOString() }).eq("id", p.id);
      results.push({
        id: p.id,
        name: p.category_name_hebrew ? `${p.category_name_hebrew} — ${p.product_name}` : p.product_name,
        price: p.price_thb ? `฿${p.price_thb}` : "לא ידוע",
        rating: p.rating,
        commission_rate: p.commission_rate,
        sales: p.sales_7d,
        category: p.category_name_hebrew,
        image_url: p.image_url,
        url: p.tracking_link,
      });
    }
  }

  return results;
}

// ─── SEND RECOMMENDATIONS ──────────────────────────────────────

async function sendRecommendations(
  chatId: number,
  title: string,
  products: RecommendedProduct[],
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

    await new Promise((r) => setTimeout(r, 500));
  }
}

// ─── SERVE ─────────────────────────────────────────────────────

serve(async (req) => {
  try {
    console.log("🌅 Daily recommendations starting (slot-based)...");
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
    );

    await sendRecommendations(
      ADMIN_CHAT_ID,
      "🌅 המלצות יומיות — תאילנד 🇹🇭",
      thaiProducts,
    );

    return new Response(JSON.stringify({
      success: true,
      israel: israelProducts.length,
      thailand: thaiProducts.length,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Daily recommendations error:", e);
    try {
      await sendMessage(ADMIN_CHAT_ID, `❌ שגיאה בהמלצות יומיות:\n${e instanceof Error ? e.message : "Unknown"}`);
    } catch (_) {}
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
