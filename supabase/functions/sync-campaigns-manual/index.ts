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
  const resp = await fetch(`${ALIEXPRESS_API_URL}?${qs}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
  return await resp.json()
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

// Dynamic pagination: fetch up to maxPages, break early if page < 50
async function fetchProductsDynamic(
  method: string, responseKey: string, extraParams: Record<string, string>, maxPages: number, label: string
): Promise<{ products: any[]; pages: number }> {
  const products: any[] = []
  let pages = 0
  for (let page = 1; page <= maxPages; page++) {
    const result = await callAliExpressAPI(method, { ...extraParams, page_no: page.toString(), page_size: '50', target_currency: 'USD', target_language: 'EN' })
    const pageProducts = result?.[responseKey]?.resp_result?.result?.products?.product || []
    pages = page
    if (pageProducts.length === 0) break
    products.push(...pageProducts)
    console.log(`[${label}] Page ${page}: ${pageProducts.length} products`)
    if (pageProducts.length < 50) break
    await new Promise(r => setTimeout(r, 500))
  }
  return { products, pages }
}

function filterQuality(raw: any[]): any[] {
  return raw.filter(p => {
    if (!p.product_id || !p.product_main_image_url || !p.target_sale_price) return false
    const evalRate = p.evaluate_rate ? parseFloat(String(p.evaluate_rate).replace('%', '')) : 0
    const commRate = p.commission_rate ? parseFloat(String(p.commission_rate).replace('%', '')) : 0
    return evalRate >= 70 && commRate >= 5
  })
}

// AliExpress top-level category IDs for per-category fetching
const ALIEXPRESS_CATEGORY_IDS = [
  "502",        // Consumer Electronics
  "44",         // Phones & Telecom
  "7",          // Home Appliances
  "1503",       // Home & Garden
  "26",         // Home Decor
  "18",         // Sports & Outdoors
  "200003655",  // Tools
  "15",         // Shoes
  "2",          // Auto Parts
  "200000783",  // Toys
  "200003498",  // Baby & Kids
  "6",          // Jewelry
  "66",         // Bags
]

const CATEGORY_ID_TO_HEBREW: Record<string, string | null> = {
  '502':        'גאדג׳טים ובית חכם',
  '44':         'גאדג׳טים ובית חכם',
  '7':          'גאדג׳טים ובית חכם',
  '1503':       'בית ומטבח',
  '26':         'בית ומטבח',
  '18':         'בריאות וספורט',
  '200003655':  'כלי עבודה וציוד',
  '15':         'אופנה וסטייל',
  '2':          'רכב ותחבורה',
  '200000783':  'ילדים ומשחקים',
  '200003498':  'ילדים ומשחקים',
  '6':          'אופנה וסטייל',
  '66':         'אופנה וסטייל',
  '21':         null,
  '322':        null,
  '200000343':  null,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET) {
      return new Response(JSON.stringify({ error: 'AliExpress API credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const startTime = Date.now()
    const TIMEOUT_MS = 120_000 // 120 seconds safeguard
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const now = new Date().toISOString()

    // === Step 1: Discover & persist campaigns ===
    console.log('=== Fetching Featured Promos ===')
    const promosResult = await callAliExpressAPI('aliexpress.affiliate.featuredpromo.get', {})
    const promos = promosResult?.aliexpress_affiliate_featuredpromo_get_response?.resp_result?.result?.promos?.promo || []
    console.log(`Found ${promos.length} active campaigns`)

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

    // Deactivate stale campaigns (last_synced > 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('aliexpress_campaigns')
      .update({ is_active: false, updated_at: now })
      .lt('last_synced', sevenDaysAgo)

    // === Step 2: Fetch Featured Promo products ===
    const { products: promoRaw, pages: promoPages } = await fetchProductsDynamic(
      'aliexpress.affiliate.featuredpromo.products.get',
      'aliexpress_affiliate_featuredpromo_products_get_response',
      { promotion_link_type: '0' },
      20,
      'Featured Promo'
    )

    // === Step 3: Fetch Hot Products per category ===
    const hotRaw: any[] = []
    const categoryBreakdown: Record<string, { raw: number; pages: number }> = {}
    let timedOut = false

    for (const catId of ALIEXPRESS_CATEGORY_IDS) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log(`⏱ Timeout safeguard hit after ${Math.round((Date.now() - startTime) / 1000)}s, stopping at category ${catId}`)
        timedOut = true
        break
      }

      const label = `Hot-Cat-${catId}`
      const { products: catProducts, pages: catPages } = await fetchProductsDynamic(
        'aliexpress.affiliate.hotproduct.query',
        'aliexpress_affiliate_hotproduct_query_response',
        { category_ids: catId, sort: 'LAST_VOLUME_DESC' },
        5,
        label
      )
      const hebrewCat = CATEGORY_ID_TO_HEBREW[catId] || 'כללי'
      catProducts.forEach(p => {
        p._campaign_name = hebrewCat
        p._category_hebrew = hebrewCat
      })
      hotRaw.push(...catProducts)
      categoryBreakdown[catId] = { raw: catProducts.length, pages: catPages }
    }

    const promoQuality = filterQuality(promoRaw)
    const hotQuality = filterQuality(hotRaw)

    // Tag products with source
    const allTagged = [
      ...promoQuality.map(p => ({ ...p, _campaign_name: 'Featured Promo' })),
      ...hotQuality.map(p => ({ ...p, _campaign_name: 'Hot Products' })),
    ]

    // Deduplicate
    const seen = new Set<string>()
    const uniqueProducts = allTagged.filter(p => {
      const id = String(p.product_id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    console.log(`Promo: ${promoRaw.length} raw → ${promoQuality.length} quality (${promoPages} pages)`)
    console.log(`Hot: ${hotRaw.length} raw → ${hotQuality.length} quality (${Object.keys(categoryBreakdown).length} categories)`)
    console.log(`Total unique: ${uniqueProducts.length}`)

    // === Step 4: Upsert products ===
    let upserted = 0, errors = 0, totalKids = 0

    const buildProductPayload = async (product: any) => {
      const productId = String(product.product_id)
      const categoryId = product.first_level_category_id
        ? String(product.first_level_category_id)
        : null
      const hebrewCategory = categoryId !== null
        ? CATEGORY_ID_TO_HEBREW[categoryId]
        : undefined
      if (hebrewCategory === null || hebrewCategory === undefined) {
        console.log(`Skipping category ${categoryId}: ${product.product_title}`)
        return null
      }
      const catId = categoryId

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

      const hebrewFromMap = catId ? CATEGORY_ID_TO_HEBREW[catId] : undefined

      return {
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
        category_id: catId,
        category_name_hebrew: hebrewFromMap || product._category_hebrew || 'כללי',
        tracking_link: trackingLink,
        out_of_stock: false,
        is_campaign_product: true,
        campaign_name: product._campaign_name,
        updated_at: now,
      }
    }

    const productPayloads: any[] = []
    const LINK_BATCH_SIZE = 8
    for (let i = 0; i < uniqueProducts.length; i += LINK_BATCH_SIZE) {
      const batch = uniqueProducts.slice(i, i + LINK_BATCH_SIZE)
      const resolvedBatch = await Promise.all(batch.map(buildProductPayload))
      for (const p of resolvedBatch) {
        if (p !== null) productPayloads.push(p)
      }
    }

    totalKids = productPayloads.filter(product => product.category_name_hebrew === 'ילדים ומשחקים').length

    const UPSERT_BATCH_SIZE = 100
    for (let i = 0; i < productPayloads.length; i += UPSERT_BATCH_SIZE) {
      const batch = productPayloads.slice(i, i + UPSERT_BATCH_SIZE)
      const { error } = await supabase
        .from('aliexpress_feed_products')
        .upsert(batch, { onConflict: 'aliexpress_product_id' })

      if (error) {
        console.error(`Batch upsert error ${i}-${i + batch.length - 1}:`, error)

        for (const product of batch) {
          const { error: rowError } = await supabase
            .from('aliexpress_feed_products')
            .upsert(product, { onConflict: 'aliexpress_product_id' })

          if (rowError) {
            errors++
            console.error(`Upsert error ${product.aliexpress_product_id}:`, rowError)
          } else {
            upserted++
          }
        }
      } else {
        upserted += batch.length
      }
    }

    // === Step 5: Translate ===
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
    } catch (e) { console.error('Translation error:', e) }

    // Cleanup expired
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: expiredData } = await supabase
      .from('aliexpress_feed_products')
      .update({ out_of_stock: true })
      .eq('is_campaign_product', true)
      .lt('updated_at', thirtyDaysAgo)
      .select('id')
    const expiredCount = expiredData?.length || 0

    // Category breakdown for kids count
    const promoKids = promoQuality.filter(p => (p._category_hebrew || '') === 'ילדים ומשחקים').length
    const hotKids = hotQuality.filter(p => (p._category_hebrew || '') === 'ילדים ומשחקים').length

    const elapsedSec = Math.round((Date.now() - startTime) / 1000)

    const summary = {
      campaigns_found: promos.length,
      hot_categories_fetched: Object.keys(categoryBreakdown).length,
      hot_categories_total: ALIEXPRESS_CATEGORY_IDS.length,
      timed_out: timedOut,
      elapsed_seconds: elapsedSec,
      campaign_breakdown: {
        'Featured Promo': { raw: promoRaw.length, pages: promoPages, quality: promoQuality.length, kids: promoKids },
        'Hot Products': { raw: hotRaw.length, quality: hotQuality.length, kids: hotKids, category_breakdown: categoryBreakdown },
      },
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
