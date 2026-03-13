import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { verifyAdminAuth, createUnauthorizedResponse, createForbiddenResponse } from '../_shared/auth.ts'

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

// Hebrew category mapping using keywords (same as Israel Link Converter)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "רכב ותחבורה": [
    "car", "auto", "vehicle", "tire", "wheel", "motor", "engine", "dashboard", 
    "gps", "driving", "parking", "seat cover", "steering", "headlight", "brake",
    "motorcycle", "bike holder", "trunk", "windshield", "charger car", "obd",
    "fuel", "rearview", "mirror car", "bumper", "wiper", "car seat"
  ],
  "גאדג׳טים": [
    "gadget", "electronic", "usb", "bluetooth", "wireless", "speaker", "headphone",
    "earphone", "power bank", "cable", "charger", "adapter", "mouse", "keyboard",
    "webcam", "microphone", "led", "light strip", "drone", "camera", "tripod",
    "phone holder", "tablet", "smart watch", "fitness tracker", "vr", "gaming",
    "earbuds", "tws", "headset", "portable", "hub", "dock", "stand phone"
  ],
  "ילדים": [
    "kid", "child", "baby", "toy", "game", "puzzle", "doll", "lego", "educational",
    "stroller", "diaper", "bottle", "pacifier", "infant", "toddler", "children",
    "school", "backpack kid", "lunch box", "playmat", "breast pump", "breastfeeding",
    "nursing", "newborn", "balloon", "party kids", "birthday"
  ],
  "בית": [
    "home", "kitchen", "bathroom", "bedroom", "living room", "furniture", "decor",
    "storage", "organizer", "shelf", "hook", "hanger", "towel", "curtain", "rug",
    "mat", "pillow", "blanket", "bedding", "lamp", "vase", "plant", "garden",
    "cleaning", "trash", "laundry", "iron", "vacuum", "pot", "pan", "bowl", 
    "container", "lid", "utensil", "knife", "cutting board", "spoon", "fork",
    "plate", "cup", "mug", "glass", "blender", "mixer", "oven", "microwave",
    "coffee", "tea", "bbq", "grill", "cover pot", "silicone", "strap", "fixing",
    "ice cream", "creami", "ninja", "opener", "can opener", "beverage"
  ],
  "בית חכם": [
    "smart home", "wifi", "alexa", "google home", "automation", "sensor", "switch",
    "socket", "plug smart", "bulb smart", "camera security", "doorbell", "lock smart",
    "thermostat", "remote control", "zigbee", "tuya", "robot vacuum", "dreame",
    "xiaomi robot", "roborock", "roomba", "ecovacs"
  ],
  "אופנה": [
    "fashion", "clothing", "shirt", "dress", "pants", "jeans", "jacket", "coat",
    "shoes", "sneakers", "boots", "sandals", "bag", "handbag", "wallet", "belt",
    "watch", "jewelry", "necklace", "bracelet", "ring", "earring", "sunglasses",
    "hat", "scarf", "gloves", "underwear", "socks", "swimwear", "bikini",
    "shorts", "cotton", "men", "women", "summer", "winter", "t-shirt"
  ],
  "נסיעות": [
    "travel", "luggage", "suitcase", "backpack", "passport", "neck pillow", 
    "travel adapter", "packing", "organizer bag", "camping", "hiking", "outdoor",
    "tent", "sleeping bag", "flashlight", "compass", "water bottle travel"
  ],
  "בריאות": [
    "health", "medical", "massage", "fitness", "exercise", "yoga", "gym", "weight",
    "scale", "blood pressure", "thermometer", "first aid", "vitamin", "supplement",
    "posture", "back support", "knee", "wrist", "ankle", "pain relief", "sleep",
    "trimmer", "clipper", "shaver", "beard", "hair cut", "barber", "razor",
    "essential oil", "aromatherapy", "fragrance oil", "diffuser"
  ],
  "כלי עבודה": [
    "tool", "drill", "screwdriver", "wrench", "hammer", "plier", "saw", "measure",
    "tape", "level", "multimeter", "soldering", "welding", "cutting", "grinding",
    "toolbox", "work light", "gloves work", "safety", "ladder", "pump inflat"
  ]
};

// Detect Hebrew category from product name
function detectHebrewCategory(productName: string): string {
  if (!productName) return "כללי";
  
  const lowerName = productName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
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
      const hebrewCategory = detectHebrewCategory(product.productName);

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
