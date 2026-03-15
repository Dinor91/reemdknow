import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crypto as stdCrypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { verifyAdminAuth, createUnauthorizedResponse, createForbiddenResponse } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AliExpress API configuration
const ALIEXPRESS_APP_KEY = Deno.env.get('ALIEXPRESS_APP_KEY')?.trim()
const ALIEXPRESS_APP_SECRET = Deno.env.get('ALIEXPRESS_APP_SECRET')?.trim()
const ALIEXPRESS_TRACKING_ID = Deno.env.get('ALIEXPRESS_TRACKING_ID')?.trim()
const ALIEXPRESS_API_URL = 'https://api-sg.aliexpress.com/sync'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Priority-based regex category detection — same logic as sync-feed-products
function detectCategory(productName: string): string {
  const name = productName.toLowerCase();

  if (/toothpaste|oral\s?care|dental|vitamin|supplement|protein|cpap|oxygen|medical|health|fitness|gym|yoga|sport|exercise|treadmill|massage/.test(name))
    return "בריאות וספורט";

  if (/\btoy\b|baby|diaper|nappy|infant|lego|\bkids\b|children|stroller|puzzle|doll/.test(name))
    return "ילדים ומשחקים";

  if (/smart\s?watch|smartwatch|earphone|earbud|bluetooth|power\s?bank|led\s?strip|smart\s?home|router|\blaptop\b|drone|projector|network\s?card|airtag|gps\s?tracker|toner|printer|tripod/.test(name))
    return "גאדג׳טים ובית חכם";

  if (/lawn\s?mower|lawnmower|\bdrill\b|wrench|screwdriver|\btool\b|garden|\bpump\b|ladder|generator|compressor|cabinet/.test(name))
    return "כלי עבודה וציוד";

  if (/\bshirt\b|\bdress\b|\bpants\b|\bshoe\b|sneaker|\bbag\b|wallet|jewelry|necklace|bracelet|\bring\b|\bwatch\b|fashion|eyelash|makeup|lipstick|\bjacket\b(?!.*moto)/.test(name))
    return "אופנה וסטייל";

  if (/kitchen|cookware|\bpot\b|\bpan\b|\bknife\b|furniture|pillow|bedding|curtain|storage|organizer|vacuum|blender|coffee\s?maker|air\s?fryer/.test(name))
    return "בית ומטבח";

  if (/\bcar\b|automotive|motorcycle|dash\s?cam|dashcam|\btire\b|\btyre\b|brake|steering|carplay|body\s?kit|roof\s?box|car\s?charger|car\s?mount|car\s?cover|car\s?seat|car\s?wash|\bhelmet\b(?=.*moto|\bhelmet\b)/.test(name))
    return "רכב ותחבורה";

  return "כללי";
}

// Helper to convert Uint8Array to hex string
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Generate MD5 signature for AliExpress API
async function generateSignature(params: Record<string, string>, appSecret: string): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key]
      return acc
    }, {} as Record<string, string>)

  const sortedString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}${value}`)
    .join('')

  const signStr = appSecret + sortedString + appSecret

  const encoder = new TextEncoder()
  const data = encoder.encode(signStr)
  const hashBuffer = await stdCrypto.subtle.digest('MD5', data)
  return toHex(new Uint8Array(hashBuffer))
}

// Call AliExpress API
async function callAliExpressAPI(method: string, additionalParams: Record<string, string> = {}) {
  const timestamp = Date.now().toString()

  const params: Record<string, string> = {
    app_key: ALIEXPRESS_APP_KEY!,
    method,
    timestamp,
    sign_method: 'md5',
    v: '2.0',
    ...additionalParams
  }

  if (ALIEXPRESS_TRACKING_ID) {
    params.tracking_id = ALIEXPRESS_TRACKING_ID
  }

  const signature = await generateSignature(params, ALIEXPRESS_APP_SECRET!)
  params.sign = signature

  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const url = `${ALIEXPRESS_API_URL}?${queryString}`

  console.log(`Calling AliExpress API: ${method}`)
  console.log(`Request URL: ${url.substring(0, 200)}...`)

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  const data = await response.json()
  console.log(`API Response: ${JSON.stringify(data).substring(0, 500)}`)
  return data
}

// Get featured promos (campaigns with high commissions) - Available in Standard API!
async function getFeaturedPromos() {
  return await callAliExpressAPI('aliexpress.affiliate.featuredpromo.get', {})
}

// Get products from a specific promo/campaign
async function getPromoProducts(
  promoUrl: string,
  pageNo: number = 1,
  pageSize: number = 50
) {
  const params: Record<string, string> = {
    promotion_link_type: '0',
    page_no: pageNo.toString(),
    page_size: pageSize.toString(),
    target_currency: 'USD',
    target_language: 'EN'
  }

  // Try using featuredpromo.products.get for promo-specific products
  return await callAliExpressAPI('aliexpress.affiliate.featuredpromo.products.get', {
    ...params,
    promotion_start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    promotion_end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
}

// Get hot products from AliExpress (requires Advanced API)
async function getHotProducts(
  pageNo: number = 1,
  pageSize: number = 50,
  categoryIds?: string,
  sort: string = 'LAST_VOLUME_DESC'
) {
  const params: Record<string, string> = {
    page_no: pageNo.toString(),
    page_size: pageSize.toString(),
    target_currency: 'USD',
    target_language: 'EN',
    sort
  }

  if (categoryIds) params.category_ids = categoryIds

  return await callAliExpressAPI('aliexpress.affiliate.hotproduct.query', params)
}

// Search products from AliExpress
async function searchProducts(
  keywords: string,
  pageNo: number = 1,
  pageSize: number = 50,
  categoryIds?: string
) {
  const params: Record<string, string> = {
    keywords,
    page_no: pageNo.toString(),
    page_size: pageSize.toString(),
    target_currency: 'USD',
    target_language: 'EN',
    sort: 'LAST_VOLUME_DESC'
  }

  if (categoryIds) params.category_ids = categoryIds

  return await callAliExpressAPI('aliexpress.affiliate.product.query', params)
}

// Generate affiliate link for a product
async function generateAffiliateLink(productUrl: string): Promise<string | null> {
  try {
    const result = await callAliExpressAPI('aliexpress.affiliate.link.generate', {
      source_values: productUrl,
      promotion_link_type: '0'
    })

    const links = result?.aliexpress_affiliate_link_generate_response?.resp_result?.result?.promotion_links?.promotion_link
    if (links && links.length > 0) {
      return links[0].promotion_link
    }
  } catch (error) {
    console.error('Error generating affiliate link:', error)
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    const authResult = await verifyAdminAuth(authHeader)
    
    if (authResult.error === 'Missing authorization header' || authResult.error === 'Invalid auth token') {
      return createUnauthorizedResponse(authResult.error, corsHeaders)
    }
    
    if (!authResult.isAdmin) {
      return createForbiddenResponse('Admin access required', corsHeaders)
    }

    if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET) {
      return new Response(
        JSON.stringify({ error: 'AliExpress API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse request body for optional parameters
    let categoryIds: string | undefined
    let keywords: string | undefined
    let maxProducts = 100

    try {
      const body = await req.json()
      categoryIds = body.categoryIds
      keywords = body.keywords
      maxProducts = body.maxProducts || 100
    } catch {
      // No body provided, use defaults
    }

    console.log('Starting AliExpress products sync...')

    const allProducts: any[] = []

    // Strategy 1: Try Featured Promos API first (high commission campaigns - Standard API)
    console.log('=== Strategy 1: Fetching Featured Promos (high commission campaigns) ===')
    let promoProducts: any[] = []
    
    try {
      const promosResult = await getFeaturedPromos()
      console.log('Featured Promos response:', JSON.stringify(promosResult).substring(0, 1000))
      
      const promos = promosResult?.aliexpress_affiliate_featuredpromo_get_response?.resp_result?.result?.promos?.promo || []
      console.log(`Found ${promos.length} active promotional campaigns`)
      
      if (promos.length > 0) {
        // Log available promos with their commission rates
        for (const promo of promos) {
          console.log(`📢 Campaign: ${promo.promo_name || 'Unknown'} | Commission: ${promo.promo_desc || 'N/A'}`)
        }
        
        // Try to get products from featured promos
        const promoProductsResult = await getPromoProducts('', 1, 50)
        console.log('Promo Products response:', JSON.stringify(promoProductsResult).substring(0, 1000))
        
        const fetchedPromoProducts = promoProductsResult?.aliexpress_affiliate_featuredpromo_products_get_response?.resp_result?.result?.products?.product || []
        if (fetchedPromoProducts.length > 0) {
          promoProducts = fetchedPromoProducts
          console.log(`✅ Fetched ${promoProducts.length} products from promotional campaigns!`)
        }
      }
    } catch (promoError) {
      console.log('Featured Promo API error:', promoError)
    }

    // Strategy 2: Try Hot Products API (requires Advanced API - might be pending)
    console.log('=== Strategy 2: Trying Hot Products API (Advanced) ===')
    let hotProducts: any[] = []
    
    try {
      for (let page = 1; page <= 3; page++) {
        if (hotProducts.length + promoProducts.length >= maxProducts) break
        
        const result = await getHotProducts(page, 50, categoryIds, 'LAST_VOLUME_DESC')
        const products = result?.aliexpress_affiliate_hotproduct_query_response?.resp_result?.result?.products?.product || []
        
        if (products.length === 0) {
          if (page === 1) {
            console.log('⏳ Hot Products API returned no results - Advanced API may be pending approval')
          }
          break
        }
        
        hotProducts.push(...products)
        console.log(`[HOT] Fetched page ${page}: ${products.length} products, total: ${hotProducts.length}`)
        
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      if (hotProducts.length > 0) {
        console.log(`✅ Successfully fetched ${hotProducts.length} Hot Products!`)
      }
    } catch (hotError) {
      console.log('Hot Products API error:', hotError)
    }

    // Combine promo products (priority) with hot products
    allProducts.push(...promoProducts)
    allProducts.push(...hotProducts)
    console.log(`After promo + hot: ${allProducts.length} products (${promoProducts.length} promo, ${hotProducts.length} hot)`)

    // Strategy 3: Fall back to regular search if still not enough products
    if (allProducts.length < maxProducts) {
      console.log('=== Strategy 3: Regular product search (Standard API) ===')
      
      // Default search keywords if none provided (popular product categories)
      const searchKeywords = keywords || 'electronics,phone accessories,bluetooth earphones,smart watch,USB charger'
      const keywordList = searchKeywords.split(',').map((k: string) => k.trim())

      for (const keyword of keywordList) {
        if (allProducts.length >= maxProducts) break
        
        console.log(`Searching for: ${keyword}`)
        
        for (let page = 1; page <= 2; page++) {
          const result = await searchProducts(keyword, page, 50, categoryIds)
          const products = result?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product || []
          
          if (products.length === 0) {
            console.log(`No products found for "${keyword}" on page ${page}`)
            break
          }
          
          allProducts.push(...products)
          console.log(`Fetched ${products.length} products for "${keyword}", total: ${allProducts.length}`)
          
          if (allProducts.length >= maxProducts) break
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    console.log(`Total products from AliExpress: ${allProducts.length}`)

    // Filter valid products
    const validProducts = allProducts
      .filter(p => p.product_id && p.product_main_image_url && p.target_sale_price)
      .slice(0, maxProducts)

    console.log(`Valid products to upsert: ${validProducts.length}`)

    // Upsert products into aliexpress_feed_products table
    let upserted = 0
    let errors = 0

    for (const product of validProducts) {
      const productId = String(product.product_id)
      
      // Calculate discount percentage
      let discountPercentage = null
      if (product.target_original_price && product.target_sale_price) {
        const original = parseFloat(product.target_original_price)
        const sale = parseFloat(product.target_sale_price)
        if (original > sale) {
          discountPercentage = Math.round(((original - sale) / original) * 100)
        }
      }

      // Get tracking link from product or generate
      let trackingLink = product.promotion_link || null
      if (!trackingLink) {
        const productUrl = `https://www.aliexpress.com/item/${productId}.html`
        trackingLink = await generateAffiliateLink(productUrl) || productUrl
      }

      const { error: upsertError } = await supabase
        .from('aliexpress_feed_products')
        .upsert({
          aliexpress_product_id: productId,
          product_name: product.product_title || 'Unknown Product',
          image_url: product.product_main_image_url,
          price_usd: parseFloat(product.target_sale_price) || null,
          original_price_usd: product.target_original_price ? parseFloat(product.target_original_price) : null,
          discount_percentage: discountPercentage,
          commission_rate: product.commission_rate ? parseFloat(product.commission_rate) / 100 : null,
          sales_30d: product.lastest_volume || 0,
          rating: product.evaluate_rate ? parseFloat(product.evaluate_rate.replace('%', '')) / 20 : null,
          reviews_count: product.product_reviews || 0,
          category_id: product.first_level_category_id ? String(product.first_level_category_id) : null,
          category_name_hebrew: detectCategory(product.product_title || ''),
          tracking_link: trackingLink,
          out_of_stock: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'aliexpress_product_id'
        })

      if (upsertError) {
        console.error(`Error upserting product ${productId}:`, upsertError)
        errors++
      } else {
        upserted++
      }
    }

    console.log(`Sync complete: ${upserted} upserted, ${errors} errors`)

    // Auto-translate new products to Hebrew
    console.log('Starting auto-translation of new products...')
    let translatedCount = 0
    try {
      const translateResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/translate-products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ platform: 'aliexpress' })
        }
      )
      
      if (translateResponse.ok) {
        const translateResult = await translateResponse.json()
        translatedCount = translateResult?.results?.aliexpress?.translated || 0
        console.log(`Auto-translated ${translatedCount} products to Hebrew`)
      }
    } catch (translateError) {
      console.error('Auto-translation error:', translateError)
    }

    return new Response(
      JSON.stringify({ 
        message: 'AliExpress sync complete',
        totalFetched: allProducts.length,
        validProducts: validProducts.length,
        upserted,
        translated: translatedCount,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
