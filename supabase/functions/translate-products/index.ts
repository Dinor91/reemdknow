import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// List of well-known brands to keep in translation
const KNOWN_BRANDS = [
  "xiaomi", "anker", "baseus", "ugreen", "orico", "samsung", "apple", "sony", "jbl", 
  "logitech", "razer", "corsair", "asus", "lenovo", "huawei", "oppo", "realme", "vivo",
  "redmi", "poco", "oneplus", "nothing", "google", "microsoft", "dell", "hp", "acer",
  "lg", "philips", "panasonic", "bosch", "dyson", "dji", "gopro", "kindle", "bose",
  "sennheiser", "audio-technica", "shure", "akg", "marshall", "harman", "beats",
  "nintendo", "playstation", "xbox", "steam", "valve", "epic", "nvidia", "amd", "intel",
  "tp-link", "netgear", "zyxel", "d-link", "linksys", "ubiquiti", "mikrotik",
  "sandisk", "kingston", "crucial", "seagate", "western digital", "wd", "toshiba",
  "transcend", "lexar", "pny", "adata", "silicon power",
  "creality", "elegoo", "anycubic", "prusa", "bambu", "flashforge",
  "dewalt", "makita", "milwaukee", "stanley", "black+decker", "bosch",
  "nike", "adidas", "puma", "new balance", "under armour", "reebok", "asics", "converse",
  "north face", "columbia", "patagonia", "arcteryx", "mammut",
  "lego", "hasbro", "mattel", "bandai", "funko", "hot toys",
  "oral-b", "philips sonicare", "braun", "gillette", "panasonic",
  "nespresso", "delonghi", "breville", "kitchenaid", "instant pot", "ninja",
  "roomba", "irobot", "roborock", "dreame", "ecovacs", "eufy",
  "ring", "nest", "arlo", "wyze", "eufy", "reolink", "hikvision", "dahua",
  "govee", "nanoleaf", "lifx", "sengled", "wiz", "ikea tradfri",
  "sonos", "denon", "yamaha", "marantz", "onkyo", "pioneer",
  "canon", "nikon", "fujifilm", "olympus", "pentax", "leica", "hasselblad",
  "zhiyun", "dji", "moza", "feiyu", "hohem", "insta360",
  "rode", "zoom", "tascam", "focusrite", "presonus", "behringer",
  "wacom", "huion", "xp-pen", "gaomon", "veikk",
  "fitbit", "garmin", "polar", "suunto", "coros", "amazfit", "zepp"
];

function extractKnownBrand(productName: string): string | null {
  const lowerName = productName.toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    if (lowerName.includes(brand.toLowerCase())) {
      // Return properly capitalized brand name
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  }
  return null;
}

function needsTranslation(name: string | null): boolean {
  if (!name) return false;
  // Check if the name starts with English letters or contains mostly non-Hebrew
  const hebrewRegex = /[\u0590-\u05FF]/;
  const englishRegex = /^[A-Za-z0-9\s\-\[\]\(\)]/;
  return englishRegex.test(name) || !hebrewRegex.test(name.charAt(0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body for platform selection
    let platform = "both";
    try {
      const body = await req.json();
      platform = body.platform || "both";
    } catch {
      // Default to both platforms
    }

    const results: { aliexpress: any; lazada: any; categoryProducts: any; israelProducts: any } = {
      aliexpress: null,
      lazada: null,
      categoryProducts: null,
      israelProducts: null
    };

    // Translate AliExpress products
    if (platform === "both" || platform === "aliexpress") {
      const { data: aliProducts, error: aliError } = await supabase
        .from("aliexpress_feed_products")
        .select("id, product_name, product_name_hebrew")
        .is("product_name_hebrew", null)
        .limit(30);

      if (aliError) throw aliError;

      if (aliProducts && aliProducts.length > 0) {
        const translated = await translateProducts(
          aliProducts.map(p => ({ id: p.id, name: p.product_name })),
          lovableApiKey
        );

        let updatedCount = 0;
        for (const item of translated) {
          const { error } = await supabase
            .from("aliexpress_feed_products")
            .update({ 
              product_name_hebrew: item.translation,
              updated_at: new Date().toISOString()
            })
            .eq("id", item.id);

          if (!error) updatedCount++;
        }

        results.aliexpress = { found: aliProducts.length, translated: updatedCount };
      } else {
        results.aliexpress = { found: 0, translated: 0, message: "All products already translated" };
      }
    }

    // Translate Lazada feed_products
    if (platform === "both" || platform === "lazada") {
      const { data: lazadaProducts, error: lazadaError } = await supabase
        .from("feed_products")
        .select("id, product_name, category_name_hebrew")
        .is("category_name_hebrew", null)
        .limit(30);

      if (lazadaError) throw lazadaError;

      if (lazadaProducts && lazadaProducts.length > 0) {
        const translated = await translateProducts(
          lazadaProducts.map(p => ({ id: p.id, name: p.product_name })),
          lovableApiKey
        );

        let updatedCount = 0;
        for (const item of translated) {
          const { error } = await supabase
            .from("feed_products")
            .update({ 
              category_name_hebrew: item.translation,
              updated_at: new Date().toISOString()
            })
            .eq("id", item.id);

          if (!error) updatedCount++;
        }

        results.lazada = { found: lazadaProducts.length, translated: updatedCount };
      } else {
        results.lazada = { found: 0, translated: 0, message: "All products already translated" };
      }
    }

    // Translate category_products (existing logic)
    if (platform === "both" || platform === "category") {
      const { data: products, error: fetchError } = await supabase
        .from("category_products")
        .select("id, name_hebrew, name_english")
        .eq("category", "כללי")
        .limit(30);

      if (fetchError) throw fetchError;

      const productsNeedingTranslation = (products || []).filter(p => 
        needsTranslation(p.name_hebrew)
      );

      if (productsNeedingTranslation.length > 0) {
        const translated = await translateProducts(
          productsNeedingTranslation.map(p => ({ 
            id: p.id, 
            name: p.name_english || p.name_hebrew 
          })),
          lovableApiKey
        );

        let updatedCount = 0;
        for (const item of translated) {
          const { error } = await supabase
            .from("category_products")
            .update({ 
              name_hebrew: item.translation,
              updated_at: new Date().toISOString()
            })
            .eq("id", item.id);

          if (!error) updatedCount++;
        }

        results.categoryProducts = { 
          found: productsNeedingTranslation.length, 
          translated: updatedCount 
        };
      } else {
        results.categoryProducts = { found: 0, translated: 0, message: "All products already translated" };
      }
    }

    // Translate israel_editor_products
    if (platform === "both" || platform === "israel") {
      const { data: israelProducts, error: israelError } = await supabase
        .from("israel_editor_products")
        .select("id, product_name_hebrew, product_name_english")
        .limit(50);

      if (israelError) throw israelError;

      // Filter products that need translation (Hebrew name looks English)
      const productsNeedingTranslation = (israelProducts || []).filter(p => 
        needsTranslation(p.product_name_hebrew)
      );

      if (productsNeedingTranslation.length > 0) {
        const translated = await translateProducts(
          productsNeedingTranslation.map(p => ({ 
            id: p.id, 
            name: p.product_name_english || p.product_name_hebrew 
          })),
          lovableApiKey
        );

        let updatedCount = 0;
        for (const item of translated) {
          const { error } = await supabase
            .from("israel_editor_products")
            .update({ 
              product_name_hebrew: item.translation,
              updated_at: new Date().toISOString()
            })
            .eq("id", item.id);

          if (!error) updatedCount++;
        }

        results.israelProducts = { 
          found: productsNeedingTranslation.length, 
          translated: updatedCount 
        };
      } else {
        results.israelProducts = { found: 0, translated: 0, message: "All products already translated" };
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Translation complete", 
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function translateProducts(
  products: Array<{ id: string; name: string }>,
  apiKey: string
): Promise<Array<{ id: string; translation: string }>> {
  if (products.length === 0) return [];

  // Extract brands for context
  const productsWithBrands = products.map(p => ({
    ...p,
    brand: extractKnownBrand(p.name)
  }));

  const productNames = productsWithBrands
    .map(p => p.name)
    .join("\n---\n");

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a product translator for an Israeli e-commerce site.

RULES:
1. Translate product names to SHORT Hebrew (3-5 words maximum)
2. Include the BRAND NAME only if it's a well-known international brand (like Xiaomi, Anker, Samsung, JBL, Sony, Logitech, etc.)
3. Focus on: Brand (if known) + What the product does
4. Remove all technical specs, model numbers, colors, sizes
5. Return ONLY the translations, one per line, separated by ---

EXAMPLES:
"Xiaomi Redmi Buds 4 Lite TWS Bluetooth Earphones" → "Xiaomi - אוזניות בלוטות'"
"Anker 737 Power Bank 24000mAh 140W" → "Anker - סוללה ניידת"
"ZADA Shimano 21NESSA XR Fishing Rod" → "חכת דיג מקצועית"
"High Quality 100% Pure Silver Headphone Cable 3.5mm" → "כבל אוזניות"
"Cool Electric Car Two-wheeled Self Balancing" → "קורקינט חשמלי"
"Baseus Car Phone Holder Air Vent Mount" → "Baseus - מחזיק טלפון לרכב"
"Generic USB Type C Cable Fast Charging" → "כבל USB-C טעינה מהירה"
"JBL Flip 6 Portable Bluetooth Speaker" → "JBL - רמקול בלוטות' נייד"
"Smart Watch Men Women Fitness Tracker" → "שעון חכם ספורטיבי"
"LED Strip Lights RGB 5M Remote Control" → "פס לד RGB"`
        },
        {
          role: "user",
          content: `Translate these product names to Hebrew (3-5 words, include brand if well-known):\n\n${productNames}`
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    throw new Error(`AI API error: ${errorText}`);
  }

  const aiData = await aiResponse.json();
  const translatedText = aiData.choices[0]?.message?.content || "";
  const translations = translatedText.split("---").map((t: string) => t.trim()).filter((t: string) => t);

  return products.map((product, index) => ({
    id: product.id,
    translation: translations[index] || product.name
  }));
}