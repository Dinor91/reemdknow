import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crypto as stdCrypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ALIEXPRESS_APP_KEY = Deno.env.get('ALIEXPRESS_APP_KEY')?.trim()
const ALIEXPRESS_APP_SECRET = Deno.env.get('ALIEXPRESS_APP_SECRET')?.trim()
const ALIEXPRESS_TRACKING_ID = Deno.env.get('ALIEXPRESS_TRACKING_ID')?.trim()
const ALIEXPRESS_API_URL = 'https://api-sg.aliexpress.com/sync'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Hebrew category mapping using keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "רכב": ["car", "auto", "vehicle", "tire", "wheel", "motor", "engine", "dashboard", "gps", "driving", "parking", "seat cover", "steering", "headlight", "brake", "motorcycle", "bike holder", "trunk", "windshield", "charger car", "obd", "fuel", "rearview", "mirror car", "bumper", "wiper", "car seat"],
  "גאדג׳טים": ["gadget", "electronic", "usb", "bluetooth", "wireless", "speaker", "headphone", "earphone", "power bank", "cable", "charger", "adapter", "mouse", "keyboard", "webcam", "microphone", "led", "light strip", "drone", "camera", "tripod", "phone holder", "tablet", "smart watch", "fitness tracker", "vr", "gaming", "earbuds", "tws", "headset", "portable", "hub", "dock", "stand phone"],
  "ילדים": ["kid", "child", "baby", "toy", "game", "puzzle", "doll", "lego", "educational", "stroller", "diaper", "bottle", "pacifier", "infant", "toddler", "children", "school", "backpack kid", "lunch box", "playmat", "breast pump", "breastfeeding", "nursing", "newborn", "balloon", "party kids", "birthday"],
  "בית": ["home", "kitchen", "bathroom", "bedroom", "living room", "furniture", "decor", "storage", "organizer", "shelf", "hook", "hanger", "towel", "curtain", "rug", "mat", "pillow", "blanket", "bedding", "lamp", "vase", "plant", "garden", "cleaning", "trash", "laundry", "iron", "vacuum", "pot", "pan", "bowl", "container", "lid", "utensil", "knife", "cutting board", "spoon", "fork", "plate", "cup", "mug", "glass", "blender", "mixer", "oven", "microwave", "coffee", "tea", "bbq", "grill", "cover pot", "silicone", "opener", "beverage"],
  "בית חכם": ["smart home", "wifi", "alexa", "google home", "automation", "sensor", "switch", "socket", "plug smart", "bulb smart", "camera security", "doorbell", "lock smart", "thermostat", "remote control", "zigbee", "tuya", "robot vacuum", "dreame", "xiaomi robot", "roborock", "roomba", "ecovacs"],
  "אופנה": ["fashion", "clothing", "shirt", "dress", "pants", "jeans", "jacket", "coat", "shoes", "sneakers", "boots", "sandals", "bag", "handbag", "wallet", "belt", "watch", "jewelry", "necklace", "bracelet", "ring", "earring", "sunglasses", "hat", "scarf", "gloves", "underwear", "socks", "swimwear", "bikini", "shorts", "cotton", "t-shirt"],
  "נסיעות": ["travel", "luggage", "suitcase", "backpack", "passport", "neck pillow", "travel adapter", "packing", "organizer bag", "camping", "hiking", "outdoor", "tent", "sleeping bag", "flashlight", "compass", "water bottle travel"],
  "בריאות": ["health", "medical", "massage", "fitness", "exercise", "yoga", "gym", "weight", "scale", "blood pressure", "thermometer", "first aid", "vitamin", "supplement", "posture", "back support", "knee", "wrist", "ankle", "pain relief", "sleep", "trimmer", "clipper", "shaver", "beard", "hair cut", "barber", "razor", "essential oil", "aromatherapy", "diffuser"],
  "כלי עבודה": ["tool", "drill", "screwdriver", "wrench", "hammer", "plier", "saw", "measure", "tape", "level", "multimeter", "soldering", "welding", "cutting", "grinding", "toolbox", "work light", "gloves work", "safety", "ladder", "pump inflat"],
}

function detectHebrewCategory(productName: string): string {
  if (!productName) return "כללי"
  const lowerName = productName.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase())) return category
    }
  }
  return "כללי"
}

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

async function generateSignature(params: Record<string, string>, appSecret: string): Promise<string> {
  const sortedString = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('')
  const signStr = appSecret + sortedString + appSecret
  const data = new TextEncoder().encode(signStr)
  const hashBuffer = await stdCrypto.subtle.digest('MD5', data)
  return toHex(new Uint8Array(hashBuffer))
}

async function callAliExpressAPI(method: string, additionalParams: Record<string, string> = {}) {
  const params: Record<string, string> = {
    app_key: ALIEXPRESS_APP_KEY!,
    method,
    timestamp: Date.now().toString(),
    sign_method: 'md5',
    v: '2.0',
    ...additionalParams,
  }
  if (ALIEXPRESS_TRACKING_ID) params.tracking_id = ALIEXPRESS_TRACKING_ID

  params.sign = await generateSignature(params, ALIEXPRESS_APP_SECRET!)

  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const url = `${ALIEXPRESS_API_URL}?${qs}`
  console.log(`Calling AliExpress API: ${method}`)
  const resp = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
  const data = await resp.json()
  console.log(`Response (first 500):`, JSON.stringify(data).substring(0, 500))
  return data
}

async function generateAffiliateLink(productUrl: string): Promise<string | null> {
  try {
    const result = await callAliExpressAPI('aliexpress.affiliate.link.generate', {
      source_values: productUrl,
      promotion_link_type: '0',
    })
    const links = result?.aliexpress_affiliate_link_generate_response?.resp_result?.result?.promotion_links?.promotion_link
    if (links && links.length > 0) return links[0].promotion_link
  } catch (e) {
    console.error('Affiliate link error:', e)
  }
  return null
}

// Fetch products dynamically (up to maxPages, break early if page < 50)
async function fetchProductsDynamic(
  method: string,
  responseKey: string,
  extraParams: Record<string, string>,
  maxPages: number,
  campaignLabel: string
): Promise<{ products: any[]; pages: number }> {
  const products: any[] = []
  let pages = 0

  for (let page = 1; page <= maxPages; page++) {
    const result = await callAliExpressAPI(method, {
      ...extraParams,
      page_no: page.toString(),
      page_size: '50',
      target_currency: 'USD',
      target_language: 'EN',
    })

    const pageProducts = result?.[responseKey]?.resp_result?.result?.products?.product || []
    pages = page
    if (pageProducts.length === 0) break
    products.push(...pageProducts)
    console.log(`[${campaignLabel}] Page ${page}: ${pageProducts.length} products`)

    if (pageProducts.length < 50) break // last page
    await new Promise(r => setTimeout(r, 500))
  }

  return { products, pages }
}

function filterQualityProducts(raw: any[]): any[] {
  return raw.filter(p => {
    if (!p.product_id || !p.product_main_image_url || !p.target_sale_price) return false
    const evalRate = p.evaluate_rate ? parseFloat(String(p.evaluate_rate).replace('%', '')) : 0
    const commRate = p.commission_rate ? parseFloat(String(p.commission_rate).replace('%', '')) : 0
    return evalRate >= 70 && commRate >= 5
  })
}

function deduplicateProducts(products: any[]): any[] {
  const seen = new Set<string>()
  return products.filter(p => {
    const id = String(p.product_id)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET) {
      return new Response(JSON.stringify({ error: 'AliExpress API credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // === Step 1: Discover campaigns ===
    console.log('=== Fetching Featured Promos ===')
    const promosResult = await callAliExpressAPI('aliexpress.affiliate.featuredpromo.get', {})
    const promos = promosResult?.aliexpress_affiliate_featuredpromo_get_response?.resp_result?.result?.promos?.promo || []
    console.log(`Found ${promos.length} active campaigns`)

    // === Step 2: Upsert campaigns ===
    const now = new Date().toISOString()
    for (const promo of promos) {
      await supabase.from('aliexpress_campaigns').upsert({
        promo_id: String(promo.promo_id || promo.promo_name),
        promo_name: promo.promo_name || 'Unknown',
        promo_desc: promo.promo_desc || null,
        is_active: true,
        last_synced: now,
        updated_at: now,
      }, { onConflict: 'promo_id' })
    }

    // Deactivate stale campaigns (last_synced > 7 days ago)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('aliexpress_campaigns')
      .update({ is_active: false, updated_at: now })
      .lt('last_synced', sevenDaysAgo)

    // === Step 3: Fetch products per campaign ===
    const campaignBreakdown: Record<string, { raw: number; pages: number; quality: number; kids: number }> = {}
    const allTaggedProducts: (any & { _campaign_name: string })[] = []

    for (const promo of promos) {
      const campaignName = promo.promo_name || 'Unknown'
      const promoId = String(promo.promo_id || '')

      const params: Record<string, string> = {
        promotion_link_type: '0',
      }
      // Only add promo_id if available (some promos may not have it)
      // The API uses promotion_start/end dates or promo category to filter
      
      const { products, pages } = await fetchProductsDynamic(
        'aliexpress.affiliate.featuredpromo.products.get',
        'aliexpress_affiliate_featuredpromo_products_get_response',
        params,
        20,
        campaignName
      )

      const quality = filterQualityProducts(products)
      const kidsCount = quality.filter(p => detectHebrewCategory(p.product_title || '') === 'ילדים').length

      campaignBreakdown[campaignName] = { raw: products.length, pages, quality: quality.length, kids: kidsCount }

      for (const p of quality) {
        allTaggedProducts.push({ ...p, _campaign_name: campaignName })
      }

      console.log(`📢 Campaign "${campaignName}": ${products.length} raw → ${quality.length} quality (${pages} pages, ${kidsCount} kids)`)
      await new Promise(r => setTimeout(r, 300))
    }

    // === Step 4: Hot Products (no campaign) ===
    const { products: hotRaw, pages: hotPages } = await fetchProductsDynamic(
      'aliexpress.affiliate.hotproduct.query',
      'aliexpress_affiliate_hotproduct_query_response',
      { sort: 'LAST_VOLUME_DESC' },
      20,
      'Hot Products'
    )

    const hotQuality = filterQualityProducts(hotRaw)
    const hotKids = hotQuality.filter(p => detectHebrewCategory(p.product_title || '') === 'ילדים').length
    campaignBreakdown['Hot Products'] = { raw: hotRaw.length, pages: hotPages, quality: hotQuality.length, kids: hotKids }

    for (const p of hotQuality) {
      allTaggedProducts.push({ ...p, _campaign_name: 'Hot Products' })
    }

    console.log(`🔥 Hot Products: ${hotRaw.length} raw → ${hotQuality.length} quality (${hotPages} pages, ${hotKids} kids)`)

    // === Step 5: Deduplicate + Upsert ===
    const uniqueProducts = deduplicateProducts(allTaggedProducts)
    console.log(`Total unique quality products: ${uniqueProducts.length}`)

    let upserted = 0
    let errors = 0
    let totalKids = 0

    for (const product of uniqueProducts) {
      const productId = String(product.product_id)

      let discountPercentage: number | null = null
      if (product.target_original_price && product.target_sale_price) {
        const original = parseFloat(product.target_original_price)
        const sale = parseFloat(product.target_sale_price)
        if (original > sale) discountPercentage = Math.round(((original - sale) / original) * 100)
      }

      let trackingLink = product.promotion_link || null
      if (!trackingLink) {
        const productUrl = `https://www.aliexpress.com/item/${productId}.html`
        trackingLink = await generateAffiliateLink(productUrl) || productUrl
      }

      const baseRate = product.commission_rate ? parseFloat(String(product.commission_rate).replace('%', '')) : 0
      const hotRate = product.hot_product_commission_rate ? parseFloat(String(product.hot_product_commission_rate).replace('%', '')) : 0
      const totalRate = (baseRate + hotRate) / 100
      const commissionRate = totalRate > 0 ? totalRate : null

      const hebrewCategory = detectHebrewCategory(product.product_title || '')
      if (hebrewCategory === 'ילדים') totalKids++

      const { error } = await supabase.from('aliexpress_feed_products').upsert({
        aliexpress_product_id: productId,
        product_name: product.product_title || 'Unknown Product',
        image_url: product.product_main_image_url,
        price_usd: parseFloat(product.target_sale_price) || null,
        original_price_usd: product.target_original_price ? parseFloat(product.target_original_price) : null,
        discount_percentage: discountPercentage,
        commission_rate: commissionRate,
        sales_30d: product.lastest_volume || 0,
        rating: product.evaluate_rate ? parseFloat(String(product.evaluate_rate).replace('%', '')) / 20 : null,
        reviews_count: product.product_reviews || 0,
        category_id: product.first_level_category_id ? String(product.first_level_category_id) : null,
        category_name_hebrew: hebrewCategory,
        tracking_link: trackingLink,
        out_of_stock: false,
        is_campaign_product: true,
        campaign_name: product._campaign_name,
        updated_at: now,
      }, { onConflict: 'aliexpress_product_id' })

      if (error) {
        console.error(`Upsert error ${productId}:`, error)
        errors++
      } else {
        upserted++
      }
    }

    // Update products_count per campaign in aliexpress_campaigns
    for (const [name, data] of Object.entries(campaignBreakdown)) {
      if (name === 'Hot Products') continue
      await supabase.from('aliexpress_campaigns')
        .update({ products_count: data.quality, updated_at: now })
        .eq('promo_name', name)
    }

    // === Step 6: Auto-translate ===
    let translatedCount = 0
    try {
      const translateResp = await fetch(`${SUPABASE_URL}/functions/v1/translate-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({ platform: 'aliexpress' }),
      })
      if (translateResp.ok) {
        const result = await translateResp.json()
        translatedCount = result?.results?.aliexpress?.translated || 0
      }
    } catch (e) {
      console.error('Translation error:', e)
    }

    // Cleanup: mark expired campaign products as out_of_stock
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: expiredData, error: cleanupError } = await supabase
      .from('aliexpress_feed_products')
      .update({ out_of_stock: true })
      .eq('is_campaign_product', true)
      .lt('updated_at', thirtyDaysAgo)
      .select('id')
    const expiredCount = cleanupError ? 0 : (expiredData?.length || 0)

    const summary = {
      campaigns_found: promos.length,
      campaign_breakdown: campaignBreakdown,
      products_imported: upserted,
      total_kids_products: totalKids,
      translated: translatedCount,
      errors,
      expired_cleaned: expiredCount,
    }

    console.log('Campaign sync complete:', JSON.stringify(summary))

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Campaign sync error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
