import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { crypto as stdCrypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AliExpress API configuration - trim whitespace from env vars
const ALIEXPRESS_APP_KEY = Deno.env.get('ALIEXPRESS_APP_KEY')?.trim()
const ALIEXPRESS_APP_SECRET = Deno.env.get('ALIEXPRESS_APP_SECRET')?.trim()
const ALIEXPRESS_TRACKING_ID = Deno.env.get('ALIEXPRESS_TRACKING_ID')?.trim()
const ALIEXPRESS_API_URL = 'https://api-sg.aliexpress.com/sync'

// Helper to convert Uint8Array to hex string
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Generate MD5 signature for AliExpress API
// Format: MD5(SECRET + key1value1key2value2... + SECRET)
async function generateSignature(params: Record<string, string>, appSecret: string): Promise<string> {
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key]
      return acc
    }, {} as Record<string, string>)

  // Concatenate sorted params: key1value1key2value2...
  const sortedString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}${value}`)
    .join('')

  // MD5 format: SECRET + sortedParams + SECRET
  const signStr = appSecret + sortedString + appSecret

  console.log('Sign string (first 200 chars):', signStr.substring(0, 200))

  // Create MD5 hash using Deno std crypto
  const encoder = new TextEncoder()
  const data = encoder.encode(signStr)
  const hashBuffer = await stdCrypto.subtle.digest('MD5', data)
  return toHex(new Uint8Array(hashBuffer))
}

// Call AliExpress Affiliate API
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

  // Add tracking_id if available
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

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })

  const data = await response.json()
  console.log(`AliExpress API response:`, JSON.stringify(data).substring(0, 1500))

  return data
}

// Get hot products (trending/bestsellers)
async function getHotProducts(
  categoryIds?: string,
  keywords?: string,
  pageNo: number = 1,
  pageSize: number = 20,
  targetCurrency: string = 'USD',
  targetLanguage: string = 'EN',
  sort?: string
) {
  console.log(`Getting hot products, page: ${pageNo}`)

  const params: Record<string, string> = {
    page_no: pageNo.toString(),
    page_size: pageSize.toString(),
    target_currency: targetCurrency,
    target_language: targetLanguage
  }

  if (categoryIds) params.category_ids = categoryIds
  if (keywords) params.keywords = keywords
  if (sort) params.sort = sort // SALE_PRICE_ASC, SALE_PRICE_DESC, LAST_VOLUME_DESC, etc.

  return await callAliExpressAPI('aliexpress.affiliate.hotproduct.query', params)
}

// Generate affiliate link
async function generateAffiliateLink(
  sourceValues: string,
  promotionLinkType: number = 0 // 0: normal link, 1: hot link
) {
  console.log(`Generating affiliate link for: ${sourceValues}`)

  const params: Record<string, string> = {
    source_values: sourceValues,
    promotion_link_type: promotionLinkType.toString()
  }

  return await callAliExpressAPI('aliexpress.affiliate.link.generate', params)
}

// Get product details
async function getProductDetails(
  productIds: string,
  targetCurrency: string = 'USD',
  targetLanguage: string = 'EN'
) {
  console.log(`Getting product details for: ${productIds}`)

  const params: Record<string, string> = {
    product_ids: productIds,
    target_currency: targetCurrency,
    target_language: targetLanguage
  }

  return await callAliExpressAPI('aliexpress.affiliate.productdetail.get', params)
}

// Search products
async function searchProducts(
  keywords: string,
  categoryIds?: string,
  pageNo: number = 1,
  pageSize: number = 20,
  targetCurrency: string = 'USD',
  targetLanguage: string = 'EN',
  sort?: string,
  minPrice?: number,
  maxPrice?: number
) {
  console.log(`Searching products: ${keywords}, page: ${pageNo}`)

  const params: Record<string, string> = {
    keywords,
    page_no: pageNo.toString(),
    page_size: pageSize.toString(),
    target_currency: targetCurrency,
    target_language: targetLanguage
  }

  if (categoryIds) params.category_ids = categoryIds
  if (sort) params.sort = sort
  if (minPrice) params.min_sale_price = minPrice.toString()
  if (maxPrice) params.max_sale_price = maxPrice.toString()

  return await callAliExpressAPI('aliexpress.affiliate.product.query', params)
}

// Get featured promo info (deals/coupons)
async function getFeaturedPromo() {
  console.log('Getting featured promos')
  return await callAliExpressAPI('aliexpress.affiliate.featuredpromo.get', {})
}

// Get category info
async function getCategories() {
  console.log('Getting categories')
  return await callAliExpressAPI('aliexpress.affiliate.category.get', {})
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate API credentials
    if (!ALIEXPRESS_APP_KEY || !ALIEXPRESS_APP_SECRET) {
      console.error('Missing AliExpress API credentials')
      return new Response(
        JSON.stringify({ 
          error: 'AliExpress API credentials not configured',
          required: ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET'],
          optional: ['ALIEXPRESS_TRACKING_ID']
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const {
      action,
      keywords,
      categoryIds,
      productIds,
      sourceValues,
      promotionLinkType,
      pageNo,
      pageSize,
      targetCurrency,
      targetLanguage,
      sort,
      minPrice,
      maxPrice
    } = body

    console.log(`Received action: ${action}`, JSON.stringify(body))

    let result

    switch (action) {
      // Get hot/trending products
      case 'hot-products':
        result = await getHotProducts(
          categoryIds,
          keywords,
          pageNo || 1,
          pageSize || 20,
          targetCurrency || 'USD',
          targetLanguage || 'EN',
          sort
        )
        break

      // Search products
      case 'search':
        if (!keywords) {
          return new Response(
            JSON.stringify({ error: 'keywords is required for search' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await searchProducts(
          keywords,
          categoryIds,
          pageNo || 1,
          pageSize || 20,
          targetCurrency || 'USD',
          targetLanguage || 'EN',
          sort,
          minPrice,
          maxPrice
        )
        break

      // Get product details
      case 'product-details':
        if (!productIds) {
          return new Response(
            JSON.stringify({ error: 'productIds is required (comma-separated)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getProductDetails(
          productIds,
          targetCurrency || 'USD',
          targetLanguage || 'EN'
        )
        break

      // Generate affiliate link
      case 'generate-link':
        if (!sourceValues) {
          return new Response(
            JSON.stringify({ error: 'sourceValues is required (product URLs or IDs)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await generateAffiliateLink(sourceValues, promotionLinkType || 0)
        break

      // Get featured promos
      case 'featured-promo':
        result = await getFeaturedPromo()
        break

      // Get categories
      case 'categories':
        result = await getCategories()
        break

      // Test API connection
      case 'test':
        result = {
          status: 'configured',
          message: 'AliExpress Affiliate API credentials are configured',
          appKey: ALIEXPRESS_APP_KEY?.substring(0, 8) + '...',
          trackingId: ALIEXPRESS_TRACKING_ID || 'not set',
          timestamp: new Date().toISOString(),
          availableActions: [
            'hot-products - Get trending/bestseller products',
            'search - Search products by keywords',
            'product-details - Get details for specific products (productIds required)',
            'generate-link - Generate affiliate link (sourceValues required)',
            'featured-promo - Get current deals and promos',
            'categories - Get all product categories'
          ]
        }
        break

      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid action',
            availableActions: [
              'hot-products',
              'search',
              'product-details',
              'generate-link',
              'featured-promo',
              'categories',
              'test'
            ]
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in aliexpress-api function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
