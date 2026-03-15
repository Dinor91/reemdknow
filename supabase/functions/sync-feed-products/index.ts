import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { verifyAdminAuth, createUnauthorizedResponse, createForbiddenResponse } from '../_shared/auth.ts'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

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

import { detectCategory } from '../_shared/categories.ts'

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
    // Allow service role key bypass for cron jobs, otherwise require admin auth
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const isCronCall = authHeader === `Bearer ${serviceRoleKey}`
    
    if (!isCronCall) {
      const authResult = await verifyAdminAuth(authHeader)
      
      if (authResult.error === 'Missing authorization header' || authResult.error === 'Invalid auth token') {
        return createUnauthorizedResponse(authResult.error, corsHeaders)
      }
      
      if (!authResult.isAdmin) {
        return createForbiddenResponse('Admin access required', corsHeaders)
      }
    }
    
    console.log(`Auth: ${isCronCall ? 'cron/service-role' : 'admin user'}`)

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

    // Filter and categorize products - now with minimum 4-star rating filter (like Israel)
    const validProducts = allProducts
      .filter(p => {
        // Basic filters
        if (p.outOfStock || !p.discountPrice || p.discountPrice <= 0 || !p.pictures?.length) {
          return false;
        }
        // Rating filter: minimum 4 stars (if rating exists)
        if (p.ratingScore && p.ratingScore < 4) {
          return false;
        }
        return true;
      })
      .slice(0, 100) // Limit to 100 products

    // Translate product names to Hebrew via AI before upsert
    const hebrewNames = new Map<string, string>()
    if (LOVABLE_API_KEY) {
      console.log('Translating product names to Hebrew...')
      const batchSize = 50
      for (let i = 0; i < validProducts.length; i += batchSize) {
        const batch = validProducts.slice(i, i + batchSize)
        const names = batch.map((p: any) => p.productName).join('\n---\n')
        try {
          const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: `You are a product translator for an Israeli e-commerce site.
RULES:
1. Translate product names to SHORT Hebrew (3-5 words maximum)
2. Include the BRAND NAME only if it's a well-known international brand
3. Focus on: Brand (if known) + What the product does
4. Remove all technical specs, model numbers, colors, sizes
5. Return ONLY the translations, one per line, separated by ---

EXAMPLES:
"Xiaomi Redmi Buds 4 Lite TWS Bluetooth Earphones" → "Xiaomi - אוזניות בלוטות'"
"Anker 737 Power Bank 24000mAh 140W" → "Anker - סוללה ניידת"
"High Quality 100% Pure Silver Headphone Cable 3.5mm" → "כבל אוזניות"
"Smart Watch Men Women Fitness Tracker" → "שעון חכם ספורטיבי"` },
                { role: 'user', content: `Translate these product names to Hebrew (3-5 words, include brand if well-known):\n\n${names}` }
              ],
              temperature: 0.3,
            }),
          })
          if (aiResp.ok) {
            const aiData = await aiResp.json()
            const translations = (aiData.choices?.[0]?.message?.content || '').split('---').map((t: string) => t.trim()).filter((t: string) => t)
            batch.forEach((p: any, idx: number) => {
              if (translations[idx]) {
                hebrewNames.set(String(p.productId), translations[idx])
              }
            })
            console.log(`Translated batch ${Math.floor(i / batchSize) + 1}: ${translations.length} names`)
          }
        } catch (translateErr) {
          console.error('AI translation batch error:', translateErr)
        }
        if (i + batchSize < validProducts.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    // Get tracking links for all products
    const productIds = validProducts.map((p: any) => String(p.productId))
    const trackingLinks = await getTrackingLinks(productIds)

    // Upsert products into feed_products table
    let upserted = 0
    for (const product of validProducts) {
      const productId = String(product.productId)
      
      // Calculate discount percentage
      let discountPercentage = null
      if (product.originalPrice && product.discountPrice) {
        const original = parseFloat(product.originalPrice)
        const sale = parseFloat(product.discountPrice)
        if (original > sale) {
          discountPercentage = Math.round(((original - sale) / original) * 100)
        }
      }

      // Auto-detect Hebrew category from product name
      const hebrewCategory = detectCategory(product.productName);

      const { error: upsertError } = await supabase
        .from('feed_products')
        .upsert({
          lazada_product_id: productId,
          product_name: product.productName,
          image_url: product.pictures?.[0],
          price_thb: product.discountPrice,
          original_price_thb: product.originalPrice || null,
          discount_percentage: discountPercentage,
          rating: product.ratingScore || null,
          reviews_count: product.reviewCount || 0,
          currency: product.currency || '฿',
          sales_7d: product.sales7d || 0,
          commission_rate: product.totalCommissionRate,
          category_l1: product.categoryL1,
          category_name_hebrew: hebrewCategory,
          brand_name: product.brandName,
          tracking_link: trackingLinks.get(productId) || `https://www.lazada.co.th/products/-i${productId}.html`,
          product_name_hebrew: hebrewNames.get(productId) || null,
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
