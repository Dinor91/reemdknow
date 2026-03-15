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

// Priority-based regex category detection
function detectCategory(productName: string): string {
  const name = productName.toLowerCase();

  // בריאות וספורט — first (catches cpap, toothpaste before vehicles)
  if (/toothpaste|oral\s?care|dental|vitamin|supplement|protein|cpap|oxygen|medical|health|fitness|gym|yoga|sport|exercise|treadmill|massage/.test(name))
    return "בריאות וספורט";

  // ילדים ומשחקים — second (catches toy, baby, airtag kids)
  if (/\btoy\b|baby|diaper|nappy|infant|lego|\bkids\b|children|stroller|puzzle|doll/.test(name))
    return "ילדים ומשחקים";

  // גאדג׳טים ובית חכם — third (catches smart watch, laptop, gps tracker, airtag)
  if (/smart\s?watch|smartwatch|earphone|earbud|bluetooth|power\s?bank|led\s?strip|smart\s?home|router|\blaptop\b|drone|projector|network\s?card|airtag|gps\s?tracker|toner|printer|tripod/.test(name))
    return "גאדג׳טים ובית חכם";

  // כלי עבודה וציוד — fourth (catches lawn mower, tool cabinet)
  if (/lawn\s?mower|lawnmower|\bdrill\b|wrench|screwdriver|\btool\b|garden|\bpump\b|ladder|generator|compressor|cabinet/.test(name))
    return "כלי עבודה וציוד";

  // אופנה וסטייל
  if (/\bshirt\b|\bdress\b|\bpants\b|\bshoe\b|sneaker|\bbag\b|wallet|jewelry|necklace|bracelet|\bring\b|\bwatch\b|fashion|eyelash|makeup|lipstick|\bjacket\b(?!.*moto)/.test(name))
    return "אופנה וסטייל";

  // בית ומטבח
  if (/kitchen|cookware|\bpot\b|\bpan\b|\bknife\b|furniture|pillow|bedding|curtain|storage|organizer|vacuum|blender|coffee\s?maker|air\s?fryer/.test(name))
    return "בית ומטבח";

  // רכב ותחבורה — last (only true vehicle products)
  if (/\bcar\b|automotive|motorcycle|dash\s?cam|dashcam|\btire\b|\btyre\b|brake|steering|carplay|body\s?kit|roof\s?box|car\s?charger|car\s?mount|car\s?cover|car\s?seat|car\s?wash|\bhelmet\b(?=.*moto|\bhelmet\b)/.test(name))
    return "רכב ותחבורה";

  return "כללי";
}

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

    // Get tracking links for all products
    const productIds = validProducts.map(p => String(p.productId))
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
