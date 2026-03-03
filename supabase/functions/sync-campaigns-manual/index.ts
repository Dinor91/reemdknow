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

    // Step 1: Get featured promos (campaigns)
    console.log('=== Fetching Featured Promos ===')
    const promosResult = await callAliExpressAPI('aliexpress.affiliate.featuredpromo.get', {})
    const promos = promosResult?.aliexpress_affiliate_featuredpromo_get_response?.resp_result?.result?.promos?.promo || []
    console.log(`Found ${promos.length} active campaigns`)

    for (const promo of promos) {
      console.log(`📢 Campaign: ${promo.promo_name || 'Unknown'} | ${promo.promo_desc || ''}`)
    }

    // Step 2: Get products from campaigns (pages 1-2)
    const allProducts: any[] = []

    for (let page = 1; page <= 4; page++) {
      console.log(`Fetching campaign products page ${page}...`)
      const result = await callAliExpressAPI('aliexpress.affiliate.featuredpromo.products.get', {
        promotion_link_type: '0',
        page_no: page.toString(),
        page_size: '50',
        target_currency: 'USD',
        target_language: 'EN',
        promotion_start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        promotion_end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })

      const products = result?.aliexpress_affiliate_featuredpromo_products_get_response?.resp_result?.result?.products?.product || []
      if (products.length === 0) break
      allProducts.push(...products)
      console.log(`Page ${page}: ${products.length} products`)
      await new Promise(r => setTimeout(r, 500))
    }

    // Also try hot products for high-commission items
    console.log('=== Fetching Hot Products ===')
    for (let page = 1; page <= 4; page++) {
      if (allProducts.length >= 400) break
      const result = await callAliExpressAPI('aliexpress.affiliate.hotproduct.query', {
        page_no: page.toString(),
        page_size: '50',
        target_currency: 'USD',
        target_language: 'EN',
        sort: 'LAST_VOLUME_DESC',
      })
      const products = result?.aliexpress_affiliate_hotproduct_query_response?.resp_result?.result?.products?.product || []
      if (products.length === 0) break
      allProducts.push(...products)
      console.log(`Hot page ${page}: ${products.length} products`)
      await new Promise(r => setTimeout(r, 500))
    }

    console.log(`Total raw products: ${allProducts.length}`)

    // Step 3: Filter by quality (relaxed: rating >= 3.5 = evaluate_rate >= 70%, commission >= 5%)
    const ratePassCount = allProducts.filter(p => {
      const evalRate = p.evaluate_rate ? parseFloat(String(p.evaluate_rate).replace('%', '')) : 0
      return evalRate >= 70
    }).length
    const commPassCount = allProducts.filter(p => {
      const commRate = p.commission_rate ? parseFloat(String(p.commission_rate)) : 0
      return commRate >= 5
    }).length

    const qualityProducts = allProducts.filter(p => {
      if (!p.product_id || !p.product_main_image_url || !p.target_sale_price) return false
      const evalRate = p.evaluate_rate ? parseFloat(String(p.evaluate_rate).replace('%', '')) : 0
      const commRate = p.commission_rate ? parseFloat(String(p.commission_rate)) : 0
      return evalRate >= 70 && commRate >= 5
    })

    console.log(`Filter breakdown: rate>=70: ${ratePassCount}, commission>=5: ${commPassCount}, both: ${qualityProducts.length}`)

    // Deduplicate by product_id
    const seen = new Set<string>()
    const uniqueProducts = qualityProducts.filter(p => {
      const id = String(p.product_id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    console.log(`Quality filtered: ${uniqueProducts.length} (from ${allProducts.length} raw)`)

    // Step 4: Upsert into DB with is_campaign_product = true
    let upserted = 0
    let errors = 0
    let totalCommission = 0

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

      const baseRate = product.commission_rate ? parseFloat(String(product.commission_rate)) : 0
      const incentiveRate = product.incentive_commission_rate ? parseFloat(String(product.incentive_commission_rate)) : 0
      const totalRate = (baseRate + incentiveRate) / 100
      const commissionRate = totalRate > 0 ? totalRate : null
      if (commissionRate) totalCommission += commissionRate

      // Log first 3 products for debugging commission fields
      if (upserted < 3) {
        console.log(`📊 Product ${productId}: base=${baseRate}%, incentive=${incentiveRate}%, total=${totalRate * 100}%`)
      }

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
        tracking_link: trackingLink,
        out_of_stock: false,
        is_campaign_product: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'aliexpress_product_id' })

      if (error) {
        console.error(`Upsert error ${productId}:`, error)
        errors++
      } else {
        upserted++
      }
    }

    const avgCommission = upserted > 0 ? Math.round((totalCommission / upserted) * 100) : 0

    // Auto-translate
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
    if (expiredCount > 0) console.log(`Cleaned up ${expiredCount} expired campaign products`)

    const summary = {
      campaigns_found: promos.length,
      products_imported: upserted,
      avg_commission_rate: `${avgCommission}%`,
      translated: translatedCount,
      errors,
      total_raw: allProducts.length,
      quality_filtered: uniqueProducts.length,
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
