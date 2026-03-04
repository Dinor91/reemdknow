import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const AUTHORIZED_USER_ID = parseInt(Deno.env.get("TELEGRAM_USER_ID") || "0");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ────────── TELEGRAM API HELPERS ──────────

async function sendMessage(chatId: number, text: string, options: any = {}) {
  const body: any = { chat_id: chatId, text, parse_mode: "HTML", ...options };
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!data.ok) console.error("Telegram sendMessage error:", data);
  return data;
}

async function sendPhoto(chatId: number, photoUrl: string, caption: string, options: any = {}) {
  const body: any = { chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML", ...options };
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!data.ok) console.error("Telegram sendPhoto error:", data);
  return data;
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessage(chatId: number, messageId: number, text: string, options: any = {}) {
  const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", ...options };
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ────────── HELPERS ──────────

function formatRating(rating: any): string {
  if (!rating || rating === 0) return "";
  return ` ⭐${Number(rating).toFixed(2)}`;
}

function getProductDisplayName(p: any, fallbackCategory?: string): string {
  if (p.product_name_hebrew) return p.product_name_hebrew;
  if (p.product_name_english) return p.product_name_english;
  if (p.product_name) return p.product_name;
  if (p.name_hebrew) return p.name_hebrew;
  if (p.name_english) return p.name_english;
  if (fallbackCategory) return `${fallbackCategory}`;
  return "מוצר";
}

// ────────── PLATFORM EVENTS CALENDAR ──────────

interface PlatformEvent {
  name: string; nameHe: string; start: string; end: string;
  platforms: ("aliexpress" | "lazada")[]; code?: string; discount?: string;
}

const PLATFORM_EVENTS: PlatformEvent[] = [
  { name: "Chinese New Year Sale", nameHe: "מבצע שנה סינית חדשה", start: "01-20", end: "02-05", platforms: ["aliexpress"], code: "CNYSALE", discount: "עד 70% הנחה" },
  { name: "Valentine's Day", nameHe: "מבצע ולנטיינז", start: "02-10", end: "02-15", platforms: ["aliexpress", "lazada"], discount: "הנחות מיוחדות" },
  { name: "3.3 Sale", nameHe: "מבצע 3.3", start: "03-01", end: "03-05", platforms: ["aliexpress", "lazada"], discount: "הנחות מיוחדות" },
  { name: "Lazada Birthday", nameHe: "יום הולדת לזדה", start: "03-25", end: "03-28", platforms: ["lazada"], code: "BDAY27", discount: "קופונים מיוחדים" },
  { name: "Pesach Sale", nameHe: "מבצע פסח", start: "04-10", end: "04-20", platforms: ["aliexpress"], discount: "הנחות לחג" },
  { name: "5.5 Sale", nameHe: "מבצע 5.5", start: "05-03", end: "05-07", platforms: ["aliexpress", "lazada"], discount: "הנחות מיוחדות" },
  { name: "6.6 Mid Year Sale", nameHe: "מבצע אמצע שנה 6.6", start: "06-04", end: "06-08", platforms: ["aliexpress", "lazada"], code: "MIDYEAR", discount: "עד 60% הנחה" },
  { name: "7.7 Sale", nameHe: "מבצע 7.7", start: "07-05", end: "07-09", platforms: ["aliexpress", "lazada"], discount: "הנחות מיוחדות" },
  { name: "8.8 Sale", nameHe: "מבצע 8.8", start: "08-06", end: "08-10", platforms: ["aliexpress", "lazada"], discount: "הנחות מיוחדות" },
  { name: "Back to School", nameHe: "מבצע חזרה ללימודים", start: "08-25", end: "09-05", platforms: ["aliexpress"], discount: "הנחות על ציוד לימודים" },
  { name: "Rosh Hashana", nameHe: "מבצע ראש השנה", start: "09-15", end: "09-28", platforms: ["aliexpress"], discount: "הנחות לחגים" },
  { name: "9.9 Sale", nameHe: "מבצע 9.9", start: "09-07", end: "09-11", platforms: ["aliexpress", "lazada"], code: "SUPER99", discount: "עד 70% הנחה" },
  { name: "10.10 Sale", nameHe: "מבצע 10.10", start: "10-08", end: "10-12", platforms: ["aliexpress", "lazada"], discount: "הנחות מיוחדות" },
  { name: "11.11 Singles Day", nameHe: "מבצע 11.11 יום הרווקים", start: "11-08", end: "11-12", platforms: ["aliexpress", "lazada"], code: "DS11", discount: "המבצע הכי גדול בשנה!" },
  { name: "Black Friday", nameHe: "בלאק פריידיי", start: "11-25", end: "11-30", platforms: ["aliexpress", "lazada"], discount: "הנחות ענק" },
  { name: "Hanukkah Sale", nameHe: "מבצע חנוכה", start: "12-15", end: "12-28", platforms: ["aliexpress"], discount: "הנחות לחנוכה" },
  { name: "12.12 Sale", nameHe: "מבצע 12.12", start: "12-10", end: "12-14", platforms: ["aliexpress", "lazada"], code: "YEAR12", discount: "סיום שנה במבצע" },
];

function getActiveEvents(platform?: "aliexpress" | "lazada"): PlatformEvent[] {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return PLATFORM_EVENTS.filter(e => {
    if (platform && !e.platforms.includes(platform)) return false;
    return mmdd >= e.start && mmdd <= e.end;
  });
}

// ────────── COMMAND HANDLERS ──────────

async function handleStart(chatId: number) {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot-handler`;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
  } catch (e) { console.error("Webhook setup error:", e); }

  const text = `שלום! ברוך הבא לעוזר DKNOW של רים 👋

כאן תוכל לנהל את כל ההמלצות שלך מהנייד.

📱 <b>פקודות זמינות:</b>`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "📊 דוח רווחים", callback_data: "cmd:revenue" }, { text: "📈 ניתוח שבועי", callback_data: "cmd:weekly" }],
      [{ text: "🛒 יצירת דיל", callback_data: "cmd:deal" }, { text: "📋 סטטיסטיקות", callback_data: "cmd:stats" }],
      [{ text: "🎉 אירועים פעילים", callback_data: "cmd:events" }],
    ],
  };

  await sendMessage(chatId, text, { reply_markup: keyboard });
}

async function handleRevenue(chatId: number) {
  await sendMessage(chatId, "⏳ טוען נתוני רווחים...");

  const results: string[] = [];
  let totalILS = 0;

  // Lazada
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
      ? `🇹🇭 <b>לזדה:</b> ${orders.length} הזמנות | ฿${comm.toFixed(0)} עמלה (≈₪${ils})`
      : `🇹🇭 <b>לזדה:</b> אין הזמנות`);

    // Upsert Lazada orders to persistent history
    if (orders.length > 0) {
      const sc = createServiceClient();
      const rawRows = orders.map((o: any) => ({
        order_id: String(o.orderId || o.order_id || ""),
        product_name: o.skuName || o.productName || o.product_name || null,
        category_name: o.categoryL1 || o.categoryName || o.category_name || null,
        order_amount_thb: parseFloat(String(o.orderAmt || "0")) || 0,
        commission_thb: parseFloat(String(o.estPayout || "0")) || 0,
        order_status: o.status || o.orderStatus || null,
        order_date: (o.conversionTime || o.orderDate)
          ? new Date(o.conversionTime || o.orderDate).toISOString() : null,
        raw_data: o,
      })).filter((r: any) => r.order_id);
      const dedupMap = new Map<string, any>();
      for (const row of rawRows) {
        if (dedupMap.has(row.order_id)) {
          const ex = dedupMap.get(row.order_id);
          ex.order_amount_thb += row.order_amount_thb;
          ex.commission_thb += row.commission_thb;
        } else {
          dedupMap.set(row.order_id, { ...row });
        }
      }
      const rows = Array.from(dedupMap.values());
      if (rows.length > 0) {
        const { error: uErr } = await sc.from("orders_lazada").upsert(rows, { onConflict: "order_id" });
        if (uErr) console.error("TG Lazada upsert error:", uErr);
        else console.log(`TG: Upserted ${rows.length} deduplicated Lazada orders`);
      }
    }
  } catch {
    results.push("🇹🇭 לזדה: שגיאה בטעינה");
  }

  // AliExpress
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
      ? `🇮🇱 <b>אליאקספרס:</b> ${orders.length} הזמנות | $${comm.toFixed(2)} עמלה (≈₪${ils})`
      : `🇮🇱 <b>אליאקספרס:</b> אין הזמנות`);

    // Upsert AliExpress orders with correct product_title field
    if (orders.length > 0) {
      const sc = createServiceClient();
      const rows = orders.map((o: any) => ({
        order_id: String(o.order_id || o.order_number || ""),
        product_name: o.product_title || o.product_name || null,
        category_name: o.category_id ? String(o.category_id) : null,
        paid_amount_usd: (parseFloat(o.paid_amount) || 0) / 100,
        commission_usd: (parseFloat(o.estimated_finished_commission) || parseFloat(o.estimated_paid_commission) || 0) / 100,
        order_status: o.order_status || null,
        order_date: o.paid_time ? new Date(o.paid_time).toISOString() : o.created_time ? new Date(o.created_time).toISOString() : null,
        raw_data: o,
      })).filter((r: any) => r.order_id);
      if (rows.length > 0) {
        const { error: uErr } = await sc.from("orders_aliexpress").upsert(rows, { onConflict: "order_id" });
        if (uErr) console.error("TG AliExpress upsert error:", uErr);
        else console.log(`TG: Upserted ${rows.length} AliExpress orders`);
      }
    }
  } catch {
    results.push("🇮🇱 אליאקספרס: שגיאה בטעינה");
  }

  const msg = `📊 <b>דוח רווחים (30 יום)</b>\n\n${results.join("\n")}\n\n💰 <b>סה״כ רווח משוער: ₪${totalILS}</b>\n\n<i>שער: 1฿=₪0.36, $1=₪3.70</i>`;
  await sendMessage(chatId, msg);
}

// ────────── FIX 1: WEEKLY BY PLATFORM ──────────

async function handleWeeklyAnalytics(chatId: number) {
  // Show platform selection instead of generating combined report
  const keyboard = {
    inline_keyboard: [
      [{ text: "🇹🇭 הודעה לתאילנד", callback_data: "weekly_platform:thailand" }, { text: "🇮🇱 הודעה לישראל", callback_data: "weekly_platform:israel" }],
      [{ text: "📊 סקירה כללית", callback_data: "weekly_overview" }],
    ],
  };
  await sendMessage(chatId, "📈 <b>סיכום שבועי</b>\n\nבחר פלטפורמה להודעה:", { reply_markup: keyboard });
}

async function handleWeeklyOverview(chatId: number) {
  await sendMessage(chatId, "⏳ מכין סקירה כללית...");

  const serviceClient = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [lazThis, aliThis] = await Promise.all([
    serviceClient.from("orders_lazada").select("*").gte("created_at", weekAgo),
    serviceClient.from("orders_aliexpress").select("*").gte("created_at", weekAgo),
  ]);
  const [lazPrev, aliPrev] = await Promise.all([
    serviceClient.from("orders_lazada").select("commission_thb").gte("created_at", twoWeeksAgo).lt("created_at", weekAgo),
    serviceClient.from("orders_aliexpress").select("commission_usd").gte("created_at", twoWeeksAgo).lt("created_at", weekAgo),
  ]);

  const lazOrders = lazThis.data || [];
  const aliOrders = aliThis.data || [];

  const totalOrders = lazOrders.length + aliOrders.length;
  const totalCommissionILS = Math.round(
    lazOrders.reduce((s: number, o: any) => s + (o.commission_thb || 0) * 0.36, 0) +
    aliOrders.reduce((s: number, o: any) => s + (o.commission_usd || 0) * 3.70, 0)
  );
  const prevCommissionILS = Math.round(
    (lazPrev.data || []).reduce((s: number, o: any) => s + (o.commission_thb || 0) * 0.36, 0) +
    (aliPrev.data || []).reduce((s: number, o: any) => s + (o.commission_usd || 0) * 3.70, 0)
  );
  const trend = prevCommissionILS > 0
    ? Math.round(((totalCommissionILS - prevCommissionILS) / prevCommissionILS) * 100)
    : null;

  // Top products per platform
  const productMap: Record<string, { name: string; commission_ils: number; count: number; platform: string }> = {};
  for (const o of lazOrders) {
    const name = o.product_name || "Unknown";
    const key = `laz_${name}`;
    if (!productMap[key]) productMap[key] = { name, commission_ils: 0, count: 0, platform: "🇹🇭" };
    productMap[key].commission_ils += (o.commission_thb || 0) * 0.36;
    productMap[key].count++;
  }
  for (const o of aliOrders) {
    const name = o.product_name || "Unknown";
    const key = `ali_${name}`;
    if (!productMap[key]) productMap[key] = { name, commission_ils: 0, count: 0, platform: "🇮🇱" };
    productMap[key].commission_ils += (o.commission_usd || 0) * 3.70;
    productMap[key].count++;
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.commission_ils - a.commission_ils).slice(0, 5);

  const trendStr = trend !== null ? (trend >= 0 ? `📈 +${trend}%` : `📉 ${trend}%`) : "";
  let msg = `📈 <b>סקירה שבועית</b>\n\n`;
  msg += `📦 הזמנות: ${totalOrders} (🇹🇭${lazOrders.length} + 🇮🇱${aliOrders.length})\n`;
  msg += `💰 עמלה: ₪${totalCommissionILS} ${trendStr}\n`;
  if (prevCommissionILS > 0) msg += `📊 שבוע קודם: ₪${prevCommissionILS}\n`;
  msg += `\n🏆 <b>מוצרים מובילים:</b>\n`;
  topProducts.forEach((p, i) => {
    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    msg += `${medals[i]} ${p.platform} ${p.name.substring(0, 40)} — ${p.count} מכירות (₪${Math.round(p.commission_ils)})\n`;
  });

  await sendMessage(chatId, msg);
}

async function handleWeeklyPlatformMessage(chatId: number, platform: string) {
  await sendMessage(chatId, `⏳ מייצר הודעה שבועית ל${platform === "thailand" ? "תאילנד" : "ישראל"}...`);

  const serviceClient = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let orders: any[] = [];
  let currencySymbol: string;
  let platformLabel: string;

  if (platform === "thailand") {
    const { data } = await serviceClient.from("orders_lazada").select("*").gte("created_at", weekAgo);
    orders = data || [];
    currencySymbol = "฿";
    platformLabel = "Lazada תאילנד";
  } else {
    const { data } = await serviceClient.from("orders_aliexpress").select("*").gte("created_at", weekAgo);
    orders = data || [];
    currencySymbol = "$";
    platformLabel = "AliExpress ישראל";
  }

  if (orders.length === 0) {
    await sendMessage(chatId, `❌ אין הזמנות מ-${platformLabel} השבוע`);
    return;
  }

  // Top 3 products by commission
  const productMap: Record<string, { name: string; commission: number; count: number }> = {};
  for (const o of orders) {
    const name = o.product_name || "Unknown";
    const key = name;
    const comm = platform === "thailand" ? (o.commission_thb || 0) : (o.commission_usd || 0);
    if (!productMap[key]) productMap[key] = { name, commission: 0, count: 0 };
    productMap[key].commission += comm;
    productMap[key].count++;
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.commission - a.commission).slice(0, 3);

  const totalComm = platform === "thailand"
    ? orders.reduce((s: number, o: any) => s + (o.commission_thb || 0), 0)
    : orders.reduce((s: number, o: any) => s + (o.commission_usd || 0), 0);

  // Fetch template
  const { data: templateData } = await serviceClient.from("message_templates").select("content").eq("template_name", "סיכום_שבועי").maybeSingle();
  const template = templateData?.content || "";

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const prompt = `אתה reemdknow — אבא לשניים, בעל, חובב גאדג'טים. כותב סיכום שבועי לקבוצת וואטסאפ.

פלטפורמה: ${platformLabel} (${platform === "thailand" ? "קבוצת תאילנד" : "קבוצת ישראל"})
מטבע: ${currencySymbol}

נתוני השבוע:
- ${orders.length} הזמנות
- עמלה כוללת: ${currencySymbol}${totalComm.toFixed(2)}
- מובילים: ${topProducts.map((p, i) => `${i + 1}. ${p.name.substring(0, 50)} (${p.count} מכירות, ${currencySymbol}${p.commission.toFixed(2)} עמלה)`).join("\n")}

${template ? `תבנית:\n${template}\n\n` : ""}

כללים:
1. פתח בתודה חמה
2. 3 מוצרים עם 🥇🥈🥉 - השתמש בשמות הממש של המוצרים
3. טון אישי, לא פרסומי
4. השתמש ב-${currencySymbol} לכל מחיר
5. שאלה מזמינה בסוף
6. עד 150 מילים
7. אל תערבב פלטפורמות - רק ${platformLabel}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "אתה reemdknow, ממליץ מוצרים אישי. כותב בעברית חמה." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await resp.json();
    const message = data.choices?.[0]?.message?.content || "שגיאה ביצירת הודעה";
    const flag = platform === "thailand" ? "🇹🇭" : "🇮🇱";
    await sendMessage(chatId, `${flag} <b>הודעה מוכנה לקבוצה:</b>\n\n${message}`);
  } catch (e) {
    console.error("Weekly platform message error:", e);
    await sendMessage(chatId, "⚠️ שגיאה ביצירת ההודעה השבועית");
  }
}

async function handleStats(chatId: number) {
  const serviceClient = createServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: weekClicks } = await serviceClient.from("button_clicks").select("button_type, source").gte("created_at", weekAgo);
  const { count: monthTotal } = await serviceClient.from("button_clicks").select("*", { count: "exact", head: true }).gte("created_at", monthAgo);

  const sourceCount: Record<string, number> = {};
  for (const click of (weekClicks || [])) {
    const key = click.source || click.button_type || "unknown";
    sourceCount[key] = (sourceCount[key] || 0) + 1;
  }
  const top3 = Object.entries(sourceCount).sort(([, a], [, b]) => b - a).slice(0, 3);

  let msg = `📋 <b>סטטיסטיקות</b>\n\n`;
  msg += `סה"כ קליקים החודש: ${monthTotal || 0}\n\n`;
  msg += `🏆 <b>טופ 3 השבוע:</b>\n`;
  top3.forEach(([source, count], i) => {
    msg += `${i + 1}. ${source} — ${count} קליקים\n`;
  });
  if (top3.length === 0) msg += "אין מספיק נתונים השבוע";

  await sendMessage(chatId, msg);
}

// ────────── FIX 2: EVENTS WITH PRODUCTS ──────────

async function handleEvents(chatId: number) {
  const activeEvents = getActiveEvents();
  if (activeEvents.length === 0) {
    await sendMessage(chatId, "📅 אין מבצעים פעילים כרגע.\n\nהמבצע הבא יופיע כאן אוטומטית 🎯");
    return;
  }

  const serviceClient = createServiceClient();

  for (const e of activeEvents) {
    const platforms = e.platforms.map(p => p === "aliexpress" ? "🇮🇱" : "🇹🇭").join(" ");
    
    // Calculate days remaining
    const now = new Date();
    const endMonth = parseInt(e.end.split("-")[0]) - 1;
    const endDay = parseInt(e.end.split("-")[1]);
    const endDate = new Date(now.getFullYear(), endMonth, endDay);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const urgency = daysLeft <= 1 ? "⚠️ נגמר היום!" : daysLeft <= 2 ? "⏰ נגמר מחר!" : `📅 נשארו ${daysLeft} ימים`;

    let msg = `${platforms} <b>${e.nameHe}</b>\n${urgency}\n`;
    if (e.discount) msg += `💰 ${e.discount}\n`;
    if (e.code) msg += `🎫 קוד: <code>${e.code}</code>\n`;

    // Fetch recommended products for each platform in this event
    const buttons: any[] = [];
    
    for (const plat of e.platforms) {
      if (plat === "aliexpress") {
        const { data: products } = await serviceClient
          .from("aliexpress_feed_products")
          .select("id, product_name_hebrew, product_name, price_usd, commission_rate, image_url")
          .eq("is_campaign_product", true)
          .eq("out_of_stock", false)
          .order("commission_rate", { ascending: false, nullsFirst: false })
          .limit(3);
        
        if (products && products.length > 0) {
          msg += `\n💡 <b>מומלצים לקידום (🇮🇱):</b>\n`;
          for (const p of products) {
            const name = getProductDisplayName(p);
            const commPct = p.commission_rate ? `${Math.round(Number(p.commission_rate) * 100)}%` : "?";
            msg += `• ${name.substring(0, 40)} — ${commPct} עמלה — $${p.price_usd || "?"}\n`;
            buttons.push({ text: `✍️ ${name.substring(0, 20)}`, callback_data: `deal_gen:${p.id}`.substring(0, 64) });
          }
        }
      } else {
        const { data: products } = await serviceClient
          .from("feed_products")
          .select("id, product_name, category_name_hebrew, price_thb, commission_rate, image_url")
          .eq("out_of_stock", false)
          .order("commission_rate", { ascending: false, nullsFirst: false })
          .limit(3);
        
        if (products && products.length > 0) {
          msg += `\n💡 <b>מומלצים לקידום (🇹🇭):</b>\n`;
          for (const p of products) {
            const name = getProductDisplayName(p, p.category_name_hebrew);
            const commPct = p.commission_rate ? `${Math.round(Number(p.commission_rate) * 100)}%` : "?";
            msg += `• ${name.substring(0, 40)} — ${commPct} עמלה — ฿${p.price_thb || "?"}\n`;
            buttons.push({ text: `✍️ ${name.substring(0, 20)}`, callback_data: `deal_gen:${p.id}`.substring(0, 64) });
          }
        }
      }
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    await sendMessage(chatId, msg, rows.length > 0 ? { reply_markup: { inline_keyboard: rows } } : {});
  }
}

// ────────── DEAL FLOW ──────────

async function handleDealStart(chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🇮🇱 ישראל", callback_data: "deal_platform:israel" }, { text: "🇹🇭 תאילנד", callback_data: "deal_platform:thailand" }],
      [{ text: "🔥 עמלה גבוהה 🇮🇱", callback_data: "deal_platform:israel_hc" }, { text: "🔥 עמלה גבוהה 🇹🇭", callback_data: "deal_platform:thailand_hc" }],
    ],
  };
  await sendMessage(chatId, "🛒 <b>יצירת דיל</b>\n\nבחר פלטפורמה:", { reply_markup: keyboard });
}

async function handleDealPlatform(chatId: number, messageId: number, platform: string) {
  const serviceClient = createServiceClient();

  if (platform === "israel") {
    const { data } = await serviceClient
      .from("israel_editor_products")
      .select("category_name_hebrew")
      .eq("is_active", true);

    const catCounts: Record<string, number> = {};
    for (const p of (data || [])) {
      const cat = p.category_name_hebrew || "כללי";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }

    const buttons = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([cat, count]) => ({ text: `${cat} (${count})`, callback_data: `deal_cat:israel:${cat}`.substring(0, 64) }));

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    await editMessage(chatId, messageId, "🇮🇱 <b>ישראל — בחר קטגוריה:</b>", { reply_markup: { inline_keyboard: rows } });
  } else {
    const { data } = await serviceClient
      .from("feed_products")
      .select("category_name_hebrew")
      .eq("out_of_stock", false);

    const catCounts: Record<string, number> = {};
    for (const p of (data || [])) {
      const cat = p.category_name_hebrew || "כללי";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }

    const buttons = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([cat, count]) => ({ text: `${cat} (${count})`, callback_data: `deal_cat:thailand:${cat}`.substring(0, 64) }));

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    await editMessage(chatId, messageId, "🇹🇭 <b>תאילנד — בחר קטגוריה:</b>", { reply_markup: { inline_keyboard: rows } });
  }
}

async function handleDealCategory(chatId: number, messageId: number, platform: string, category: string) {
  const serviceClient = createServiceClient();
  await editMessage(chatId, messageId, `⏳ טוען מוצרים מ-${category}...`);

  let products: any[] = [];

  if (platform === "israel") {
    const { data } = await serviceClient
      .from("israel_editor_products")
      .select("*")
      .eq("category_name_hebrew", category)
      .eq("is_active", true)
      .order("sales_count", { ascending: false, nullsFirst: false })
      .limit(10);
    products = (data || []).map(p => ({
      id: p.id,
      name: getProductDisplayName(p, category),
      price: p.price_usd ? `$${p.price_usd}` : "לא ידוע",
      rating: p.rating,
      sales_7d: p.sales_count,
      url: p.tracking_link,
      image_url: p.image_url,
      platform: "israel",
    }));
  } else {
    const { data } = await serviceClient
      .from("feed_products")
      .select("*")
      .eq("category_name_hebrew", category)
      .eq("out_of_stock", false)
      .order("sales_7d", { ascending: false, nullsFirst: false })
      .limit(10);
    products = (data || []).map(p => ({
      id: p.id,
      name: getProductDisplayName(p, category),
      price: p.price_thb ? `฿${p.price_thb}` : "לא ידוע",
      rating: p.rating,
      sales_7d: p.sales_7d,
      url: p.tracking_link,
      image_url: p.image_url,
      brand: p.brand_name,
      commission_rate: p.commission_rate,
      platform: "thailand",
    }));
  }

  if (products.length === 0) {
    await editMessage(chatId, messageId, `❌ אין מוצרים בקטגוריה ${category}`);
    return;
  }

  let msg = `🛍️ <b>טופ מוצרים — ${category}</b>\n\n`;
  const buttons: any[] = [];

  products.forEach((p, i) => {
    const ratingStr = formatRating(p.rating);
    const salesStr = p.sales_7d ? ` | 🔥${p.sales_7d}` : "";
    msg += `${i + 1}. ${p.name?.substring(0, 45)}\n   💰 ${p.price}${ratingStr}${salesStr}\n\n`;
    // FIX 3: Product card button + deal button
    buttons.push({ text: `${i + 1}. 👁️ צפה`, callback_data: `prod_card:${p.id}`.substring(0, 64) });
  });

  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  await editMessage(chatId, messageId, msg, { reply_markup: { inline_keyboard: rows } });
}

// ────────── FIX 3: PRODUCT CARD WITH IMAGE ──────────

async function handleProductCard(chatId: number, productId: string) {
  const serviceClient = createServiceClient();

  // Try all tables to find the product
  let product: any = null;
  let source = "";

  const { data: israelProd } = await serviceClient.from("israel_editor_products").select("*").eq("id", productId).maybeSingle();
  if (israelProd) {
    product = {
      name: getProductDisplayName(israelProd),
      price: israelProd.price_usd ? `$${israelProd.price_usd}` : "לא ידוע",
      original_price: israelProd.original_price_usd ? `$${israelProd.original_price_usd}` : null,
      discount: israelProd.discount_percentage ? `${israelProd.discount_percentage}%` : null,
      rating: israelProd.rating,
      sales: israelProd.sales_count,
      url: israelProd.tracking_link,
      image_url: israelProd.image_url,
      category: israelProd.category_name_hebrew,
      commission_rate: null,
    };
    source = "israel";
  }

  if (!product) {
    const { data: thaiProd } = await serviceClient.from("feed_products").select("*").eq("id", productId).maybeSingle();
    if (thaiProd) {
      product = {
        name: getProductDisplayName(thaiProd, thaiProd.category_name_hebrew),
        price: thaiProd.price_thb ? `฿${thaiProd.price_thb}` : "לא ידוע",
        original_price: thaiProd.original_price_thb ? `฿${thaiProd.original_price_thb}` : null,
        discount: thaiProd.discount_percentage ? `${thaiProd.discount_percentage}%` : null,
        rating: thaiProd.rating,
        sales: thaiProd.sales_7d,
        url: thaiProd.tracking_link,
        image_url: thaiProd.image_url,
        category: thaiProd.category_name_hebrew,
        commission_rate: thaiProd.commission_rate,
      };
      source = "thailand";
    }
  }

  if (!product) {
    const { data: aliProd } = await serviceClient.from("aliexpress_feed_products").select("*").eq("id", productId).maybeSingle();
    if (aliProd) {
      product = {
        name: getProductDisplayName(aliProd),
        price: aliProd.price_usd ? `$${aliProd.price_usd}` : "לא ידוע",
        original_price: aliProd.original_price_usd ? `$${aliProd.original_price_usd}` : null,
        discount: aliProd.discount_percentage ? `${aliProd.discount_percentage}%` : null,
        rating: aliProd.rating,
        sales: aliProd.sales_30d,
        url: aliProd.tracking_link,
        image_url: aliProd.image_url,
        category: aliProd.category_name_hebrew,
        commission_rate: aliProd.commission_rate,
      };
      source = "israel";
    }
  }

  if (!product) {
    await sendMessage(chatId, "❌ מוצר לא נמצא");
    return;
  }

  // Build caption
  let caption = `<b>${product.name}</b>\n\n`;
  caption += `💰 מחיר: ${product.price}`;
  if (product.original_price && product.discount) {
    caption += ` (${product.original_price} ←${product.discount} הנחה)`;
  }
  caption += "\n";
  if (product.rating && product.rating > 0) caption += `⭐ דירוג: ${Number(product.rating).toFixed(2)}\n`;
  if (product.sales) caption += `🔥 מכירות: ${product.sales}\n`;
  if (product.commission_rate) caption += `💎 עמלה: ${Math.round(Number(product.commission_rate) * 100)}%\n`;
  if (product.category) caption += `📂 ${product.category}\n`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔗 צפה במוצר", url: product.url },
        { text: "✍️ צור דיל", callback_data: `deal_gen:${productId}`.substring(0, 64) },
      ],
    ],
  };

  // Send photo if available, otherwise text
  if (product.image_url) {
    await sendPhoto(chatId, product.image_url, caption, { reply_markup: keyboard });
  } else {
    if (product.url) caption += `\n🔗 <a href="${product.url}">לינק למוצר</a>`;
    await sendMessage(chatId, caption, { reply_markup: keyboard });
  }
}

// ────────── HIGH COMMISSION DEAL FLOW ──────────

async function handleDealPlatformHighCommission(chatId: number, messageId: number, platform: string) {
  const serviceClient = createServiceClient();

  let catCounts: Record<string, number> = {};

  if (platform === "israel_hc") {
    const { data } = await serviceClient
      .from("aliexpress_feed_products")
      .select("category_name_hebrew, commission_rate")
      .eq("is_campaign_product", true)
      .gte("commission_rate", 0.15);

    for (const p of (data || [])) {
      const cat = p.category_name_hebrew || "כללי";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
  } else {
    const { data } = await serviceClient
      .from("feed_products")
      .select("category_name_hebrew, commission_rate")
      .gte("commission_rate", 0.15)
      .eq("out_of_stock", false);

    for (const p of (data || [])) {
      const cat = p.category_name_hebrew || "כללי";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
  }

  const entries = Object.entries(catCounts).sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    await editMessage(chatId, messageId, "❌ אין מוצרים עם עמלה גבוהה כרגע.\nנסה את הקטגוריות הרגילות.");
    return;
  }

  const buttons = entries.slice(0, 10).map(([cat, count]) => ({
    text: `${cat} (${count})`,
    callback_data: `deal_hc_cat:${platform}:${cat}`.substring(0, 64),
  }));

  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  const flag = platform === "israel_hc" ? "🇮🇱" : "🇹🇭";
  await editMessage(chatId, messageId, `🔥 <b>${flag} עמלה גבוהה — בחר קטגוריה:</b>`, { reply_markup: { inline_keyboard: rows } });
}

async function handleDealCategoryHighCommission(chatId: number, messageId: number, platform: string, category: string) {
  const serviceClient = createServiceClient();
  await editMessage(chatId, messageId, `⏳ טוען מוצרי עמלה גבוהה מ-${category}...`);

  let products: any[] = [];

  if (platform === "israel_hc") {
    const { data } = await serviceClient
      .from("aliexpress_feed_products")
      .select("*")
      .eq("category_name_hebrew", category)
      .eq("is_campaign_product", true)
      .gte("commission_rate", 0.15)
      .order("commission_rate", { ascending: false })
      .limit(10);
    products = (data || []).map(p => ({
      id: p.id,
      name: getProductDisplayName(p, category),
      price: p.price_usd ? `$${p.price_usd}` : "לא ידוע",
      rating: p.rating,
      sales_7d: p.sales_30d,
      url: p.tracking_link,
      image_url: p.image_url,
      commission_rate: p.commission_rate,
      platform: "israel",
    }));
  } else {
    const { data } = await serviceClient
      .from("feed_products")
      .select("*")
      .eq("category_name_hebrew", category)
      .gte("commission_rate", 0.15)
      .eq("out_of_stock", false)
      .order("commission_rate", { ascending: false })
      .limit(10);
    products = (data || []).map(p => ({
      id: p.id,
      name: getProductDisplayName(p, category),
      price: p.price_thb ? `฿${p.price_thb}` : "לא ידוע",
      rating: p.rating,
      sales_7d: p.sales_7d,
      url: p.tracking_link,
      image_url: p.image_url,
      commission_rate: p.commission_rate,
      platform: "thailand",
    }));
  }

  if (products.length === 0) {
    await editMessage(chatId, messageId, `❌ אין מוצרי עמלה גבוהה בקטגוריה ${category}`);
    return;
  }

  let msg = `🔥 <b>מוצרי עמלה גבוהה — ${category}</b>\n\n`;
  const buttons: any[] = [];

  products.forEach((p, i) => {
    const commStr = p.commission_rate ? ` | 🔥 ${Math.round(p.commission_rate * 100)}% עמלה` : "";
    const ratingStr = formatRating(p.rating);
    msg += `${i + 1}. ${p.name?.substring(0, 40)}\n   💰 ${p.price}${ratingStr}${commStr}\n\n`;
    buttons.push({ text: `${i + 1}. 👁️ צפה`, callback_data: `prod_card:${p.id}`.substring(0, 64) });
  });

  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  await editMessage(chatId, messageId, msg, { reply_markup: { inline_keyboard: rows } });
}

async function handleDealGenerate(chatId: number, productId: string) {
  await sendMessage(chatId, "⏳ מייצר הודעת דיל...");

  const serviceClient = createServiceClient();

  // Try israel first, then thailand, then aliexpress feed
  let product: any = null;
  const { data: israelProduct } = await serviceClient.from("israel_editor_products").select("*").eq("id", productId).maybeSingle();
  if (israelProduct) {
    product = {
      name: getProductDisplayName(israelProduct),
      price: israelProduct.price_usd ? `$${israelProduct.price_usd}` : "לא ידוע",
      rating: israelProduct.rating,
      sales_7d: israelProduct.sales_count,
      url: israelProduct.tracking_link,
      brand: null,
      category: israelProduct.category_name_hebrew,
    };
  } else {
    const { data: thaiProduct } = await serviceClient.from("feed_products").select("*").eq("id", productId).maybeSingle();
    if (thaiProduct) {
      product = {
        name: getProductDisplayName(thaiProduct, thaiProduct.category_name_hebrew),
        price: thaiProduct.price_thb ? `฿${thaiProduct.price_thb}` : "לא ידוע",
        rating: thaiProduct.rating,
        sales_7d: thaiProduct.sales_7d,
        url: thaiProduct.tracking_link,
        brand: thaiProduct.brand_name,
        category: thaiProduct.category_name_hebrew,
      };
    } else {
      // Also check aliexpress_feed_products
      const { data: aliProduct } = await serviceClient.from("aliexpress_feed_products").select("*").eq("id", productId).maybeSingle();
      if (aliProduct) {
        product = {
          name: getProductDisplayName(aliProduct),
          price: aliProduct.price_usd ? `$${aliProduct.price_usd}` : "לא ידוע",
          rating: aliProduct.rating,
          sales_7d: aliProduct.sales_30d,
          url: aliProduct.tracking_link,
          brand: null,
          category: aliProduct.category_name_hebrew,
        };
      }
    }
  }

  if (!product) {
    await sendMessage(chatId, "❌ מוצר לא נמצא");
    return;
  }

  // Check for active events coupon
  let coupon = "";
  const eventPlatform = product.url?.includes("aliexpress") ? "aliexpress" as const : "lazada" as const;
  const activeEvents = getActiveEvents(eventPlatform);
  const eventWithCode = activeEvents.find(e => e.code);
  if (eventWithCode) coupon = eventWithCode.code!;

  // Call generate-deal-message
  try {
    const dealResp = await fetch(`${SUPABASE_URL}/functions/v1/generate-deal-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ product, coupon }),
    });
    const dealData = await dealResp.json();

    if (dealData.message) {
      let finalMsg = dealData.message;
      if (activeEvents.length > 0) {
        for (const e of activeEvents) {
          finalMsg += `\n\n🎉 ${e.nameHe}`;
          if (e.code) finalMsg += `\n🎫 קוד: ${e.code}`;
          if (e.discount) finalMsg += `\n💰 ${e.discount}`;
        }
      }

      await sendMessage(chatId, `📋 <b>הודעה מוכנה לשליחה:</b>\n\n${finalMsg}`);
    } else {
      await sendMessage(chatId, `⚠️ שגיאה ביצירת ההודעה: ${dealData.error || "לא ידוע"}`);
    }
  } catch (e) {
    console.error("Deal generate error:", e);
    await sendMessage(chatId, "⚠️ שגיאה ביצירת הודעת הדיל");
  }
}

// ────────── MAIN HANDLER ──────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const update = await req.json();
    console.log("Telegram update:", JSON.stringify(update).substring(0, 500));

    // Handle callback queries (inline keyboard presses)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;
      const userId = cb.from?.id;
      const data = cb.data || "";

      // Security check
      if (userId !== AUTHORIZED_USER_ID) {
        await answerCallbackQuery(cb.id);
        return new Response("OK");
      }

      await answerCallbackQuery(cb.id, "מעבד...");

      if (data === "cmd:revenue") await handleRevenue(chatId);
      else if (data === "cmd:weekly") await handleWeeklyAnalytics(chatId);
      else if (data === "cmd:deal") await handleDealStart(chatId);
      else if (data === "cmd:stats") await handleStats(chatId);
      else if (data === "cmd:events") await handleEvents(chatId);
      // Weekly platform selection
      else if (data.startsWith("weekly_platform:")) await handleWeeklyPlatformMessage(chatId, data.split(":")[1]);
      else if (data === "weekly_overview") await handleWeeklyOverview(chatId);
      // Product card
      else if (data.startsWith("prod_card:")) await handleProductCard(chatId, data.split(":")[1]);
      // High commission flow
      else if (data === "deal_platform:israel_hc" || data === "deal_platform:thailand_hc") await handleDealPlatformHighCommission(chatId, messageId, data.split(":")[1]);
      else if (data.startsWith("deal_hc_cat:")) {
        const parts = data.split(":");
        await handleDealCategoryHighCommission(chatId, messageId, parts[1], parts[2]);
      }
      // Regular deal flow
      else if (data.startsWith("deal_platform:")) await handleDealPlatform(chatId, messageId, data.split(":")[1]);
      else if (data.startsWith("deal_cat:")) {
        const parts = data.split(":");
        await handleDealCategory(chatId, messageId, parts[1], parts[2]);
      }
      else if (data.startsWith("deal_gen:")) await handleDealGenerate(chatId, data.split(":")[1]);
      // Legacy weekly_msg
      else if (data.startsWith("weekly_msg")) await handleWeeklyPlatformMessage(chatId, "thailand");

      return new Response("OK");
    }

    // Handle regular messages
    const message = update.message;
    if (!message) return new Response("OK");

    const chatId = message.chat.id;
    const userId = message.from?.id;
    const text = (message.text || "").trim();

    // Security: only respond to authorized user
    if (userId !== AUTHORIZED_USER_ID) {
      console.log(`Unauthorized user ${userId} blocked`);
      return new Response("OK");
    }

    // Route commands
    if (text === "/start") await handleStart(chatId);
    else if (text === "/revenue" || text === "/רווח") await handleRevenue(chatId);
    else if (text === "/weekly" || text === "/שבועי") await handleWeeklyAnalytics(chatId);
    else if (text === "/deal" || text === "/דיל") await handleDealStart(chatId);
    else if (text === "/stats" || text === "/סטטיסטיקות") await handleStats(chatId);
    else if (text === "/events" || text === "/אירועים") await handleEvents(chatId);
    else {
      await sendMessage(chatId, "לא הבנתי 🤔\nנסה /start לתפריט הפקודות");
    }

    return new Response("OK");
  } catch (e) {
    console.error("telegram-bot-handler error:", e);
    return new Response("OK");
  }
});
