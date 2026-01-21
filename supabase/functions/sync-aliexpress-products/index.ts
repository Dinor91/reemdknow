import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crypto as stdCrypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

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

// Get hot products from AliExpress
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

    // Default search keywords if none provided (popular product categories)
    const searchKeywords = keywords || 'electronics,phone accessories,bluetooth earphones,smart watch,USB charger'
    const keywordList = searchKeywords.split(',').map((k: string) => k.trim())

    // Fetch products using search API (available to all affiliates)
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

    return new Response(
      JSON.stringify({ 
        message: 'AliExpress sync complete',
        totalFetched: allProducts.length,
        validProducts: validProducts.length,
        upserted,
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
