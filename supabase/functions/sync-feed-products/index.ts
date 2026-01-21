import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LAZADA_APP_KEY = Deno.env.get('LAZADA_APP_KEY')
const LAZADA_APP_SECRET = Deno.env.get('LAZADA_APP_SECRET')
const LAZADA_USER_TOKEN = Deno.env.get('LAZADA_ACCESS_TOKEN')
const LAZADA_API_URL = 'https://api.lazada.co.th/rest'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function generateSignatureAsync(apiPath: string, params: Record<string, string>): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('')
  
  const signStr = apiPath + sortedParams
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(LAZADA_APP_SECRET!)
  const messageData = encoder.encode(signStr)
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

async function callLazadaAPI(apiPath: string, additionalParams: Record<string, string> = {}) {
  const timestamp = Date.now().toString()
  
  const params: Record<string, string> = {
    app_key: LAZADA_APP_KEY!,
    timestamp,
    sign_method: 'sha256',
    userToken: LAZADA_USER_TOKEN!,
    ...additionalParams
  }
  
  const signature = await generateSignatureAsync(apiPath, params)
  params.sign = signature
  
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  
  const url = `${LAZADA_API_URL}${apiPath}?${queryString}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  
  return await response.json()
}

// Get tracking links for products
async function getTrackingLinks(productIds: string[]): Promise<Map<string, string>> {
  const linkMap = new Map<string, string>()
  
  try {
    const result = await callLazadaAPI('/marketing/getlink', {
      inputType: 'productId',
      inputValue: productIds.join(',')
    })
    
    const links = result?.result?.data?.productBatchGetLinkInfoList || []
    for (const link of links) {
      if (link.productId && link.regularPromotionLink) {
        linkMap.set(String(link.productId), link.regularPromotionLink)
      }
    }
  } catch (error) {
    console.error('Error getting tracking links:', error)
  }
  
  return linkMap
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!LAZADA_APP_KEY || !LAZADA_APP_SECRET || !LAZADA_USER_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Lazada API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get active feed categories
    const { data: categories, error: catError } = await supabase
      .from('feed_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (catError) throw catError

    console.log(`Found ${categories?.length || 0} active categories`)

    const allProducts: any[] = []
    const categoryNameMap = new Map<number, string>()

    // Build category name map
    for (const cat of categories || []) {
      categoryNameMap.set(cat.category_id, cat.category_name_hebrew)
    }

    // Fetch products from the feed (we'll assign categories based on categoryL1)
    for (let page = 1; page <= 10; page++) {
      const result = await callLazadaAPI('/marketing/product/feed', {
        offerType: '1',
        page: page.toString(),
        limit: '50'
      })
      
      const products = result?.result?.data || []
      if (products.length === 0) break
      
      allProducts.push(...products)
      console.log(`Fetched page ${page}, total: ${allProducts.length}`)
      
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    console.log(`Total products from feed: ${allProducts.length}`)

    // Filter and categorize products
    const validProducts = allProducts
      .filter(p => !p.outOfStock && p.discountPrice > 0 && p.pictures?.length > 0)
      .slice(0, 100) // Limit to 100 products

    // Get tracking links for all products
    const productIds = validProducts.map(p => String(p.productId))
    const trackingLinks = await getTrackingLinks(productIds)

    // Upsert products into feed_products table
    let upserted = 0
    for (const product of validProducts) {
      const productId = String(product.productId)
      
      const { error: upsertError } = await supabase
        .from('feed_products')
        .upsert({
          lazada_product_id: productId,
          product_name: product.productName,
          image_url: product.pictures?.[0],
          price_thb: product.discountPrice,
          currency: product.currency || '฿',
          sales_7d: product.sales7d || 0,
          commission_rate: product.totalCommissionRate,
          category_l1: product.categoryL1,
          brand_name: product.brandName,
          tracking_link: trackingLinks.get(productId) || `https://www.lazada.co.th/products/-i${productId}.html`,
          out_of_stock: product.outOfStock || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'lazada_product_id'
        })

      if (upsertError) {
        console.error(`Error upserting product ${productId}:`, upsertError)
      } else {
        upserted++
      }
    }

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
          body: JSON.stringify({ platform: 'lazada' })
        }
      )
      
      if (translateResponse.ok) {
        const translateResult = await translateResponse.json()
        translatedCount = translateResult?.results?.lazada?.translated || 0
        console.log(`Auto-translated ${translatedCount} products to Hebrew`)
      }
    } catch (translateError) {
      console.error('Auto-translation error:', translateError)
    }

    return new Response(
      JSON.stringify({ 
        message: 'Sync complete',
        totalFetched: allProducts.length,
        validProducts: validProducts.length,
        upserted,
        translated: translatedCount,
        categories: categories?.length || 0
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
