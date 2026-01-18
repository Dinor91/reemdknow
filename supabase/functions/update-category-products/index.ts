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

// Get product info from batch-links API
async function getProductInfoFromUrl(url: string): Promise<{
  productId?: string;
  productName?: string;
} | null> {
  try {
    const cleanUrl = url.split('?')[0]
    const result = await callLazadaAPI('/marketing/getlink', {
      inputType: 'url',
      inputValue: cleanUrl
    })
    
    const data = result?.result?.data?.urlBatchGetLinkInfoList?.[0]
    if (data) {
      return {
        productId: data.productId,
        productName: data.productName
      }
    }
  } catch (error) {
    console.error('Error getting product info:', error)
  }
  return null
}

// Fetch product details from product feed
async function fetchProductFeed(page: number = 1, limit: number = 50): Promise<any[]> {
  try {
    const result = await callLazadaAPI('/marketing/product/feed', {
      offerType: '1',
      page: page.toString(),
      limit: limit.toString()
    })
    
    return result?.result?.data || []
  } catch (error) {
    console.error('Error fetching product feed:', error)
    return []
  }
}

// Build a map of productId -> product details from the feed
async function buildProductMap(): Promise<Map<string, any>> {
  const productMap = new Map<string, any>()
  
  // Fetch multiple pages to get more products
  for (let page = 1; page <= 20; page++) {
    const products = await fetchProductFeed(page, 50)
    if (products.length === 0) break
    
    for (const product of products) {
      productMap.set(product.productId.toString(), product)
    }
    
    console.log(`Fetched page ${page}, total products in map: ${productMap.size}`)
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  return productMap
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

    // Get all active products that need updating
    const { data: products, error } = await supabase
      .from('category_products')
      .select('*')
      .eq('is_active', true)
    
    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`)
    }

    // Filter to products that need updates
    const productsToUpdate = products?.filter(p => 
      !p.lazada_product_id || !p.image_url || !p.price_thb
    ) || []

    console.log(`Found ${productsToUpdate.length} products to update out of ${products?.length || 0} total`)

    if (productsToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No products need updating', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build product map from Lazada feed
    console.log('Building product map from Lazada feed...')
    const productMap = await buildProductMap()
    console.log(`Product map built with ${productMap.size} products`)

    let updated = 0
    let failed = 0
    let foundInFeed = 0

    for (const product of productsToUpdate) {
      try {
        let productId = product.lazada_product_id
        let englishName = product.name_english
        
        // If no product ID, get it from API
        if (!productId && product.affiliate_link) {
          // Try to extract product ID from URL pattern first (faster)
          const urlMatch = product.affiliate_link.match(/i(\d+)-s\d+/)
          if (urlMatch) {
            productId = urlMatch[1]
          }
          
          // If still no ID, call the API
          if (!productId) {
            const info = await getProductInfoFromUrl(product.affiliate_link)
            if (info) {
              productId = info.productId
              englishName = info.productName
            }
            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }

        if (!productId) {
          console.log(`Could not get product ID for: ${product.name_hebrew}`)
          failed++
          continue
        }

        // Look up product in our feed map
        const feedProduct = productMap.get(productId.toString())
        
        const updateData: any = {
          lazada_product_id: productId,
          updated_at: new Date().toISOString()
        }

        if (englishName) {
          updateData.name_english = englishName
        }

        if (feedProduct) {
          foundInFeed++
          // Found in feed - update all available info
          if (feedProduct.productName && !englishName) {
            updateData.name_english = feedProduct.productName
          }
          if (feedProduct.discountPrice) {
            updateData.price_thb = feedProduct.discountPrice
          }
          if (feedProduct.pictures && feedProduct.pictures.length > 0) {
            updateData.image_url = feedProduct.pictures[0]
          }
          if (feedProduct.sales7d) {
            updateData.sales_count = feedProduct.sales7d
          }
          if (feedProduct.currency) {
            updateData.currency = feedProduct.currency
          }
          // Update out_of_stock status from feed
          if (feedProduct.outOfStock !== undefined) {
            updateData.out_of_stock = feedProduct.outOfStock === true || feedProduct.outOfStock === 'true'
          }
          console.log(`✅ Found full data for "${product.name_hebrew}": price=${feedProduct.discountPrice}, sales=${feedProduct.sales7d}, outOfStock=${feedProduct.outOfStock}`)
        } else {
          console.log(`⚠️ Product ${productId} (${product.name_hebrew}) not found in feed - only updating ID`)
        }

        const { error: updateError } = await supabase
          .from('category_products')
          .update(updateData)
          .eq('id', product.id)

        if (updateError) {
          console.error(`Failed to update ${product.name_hebrew}:`, updateError)
          failed++
        } else {
          updated++
        }

      } catch (err) {
        console.error(`Error processing ${product.name_hebrew}:`, err)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Update complete',
        updated,
        failed,
        foundInFeed,
        totalProductsChecked: productsToUpdate.length,
        feedProductsAvailable: productMap.size
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
