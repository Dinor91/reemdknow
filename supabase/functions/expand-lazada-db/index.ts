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

// All 30 Lazada categoryL1 IDs
const ALL_CATEGORIES = [
  3008, 10100869, 3833, 8428, 11830, 42062201, 5761, 11829, 10100083,
  10100387, 11832, 5090, 9154, 3835, 3838, 5095, 10100245, 10100380,
  3836, 3990, 5955, 7587, 11833, 62541004, 3834, 11828, 10100412,
  6277, 7513, 10100871
]

// Hebrew category mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "רכב": ["car", "auto", "vehicle", "tire", "wheel", "motor", "engine", "dashboard", "gps", "driving", "parking", "seat cover", "steering", "headlight", "brake", "motorcycle"],
  "גאדג׳טים": ["gadget", "electronic", "usb", "bluetooth", "wireless", "speaker", "headphone", "earphone", "power bank", "cable", "charger", "adapter", "mouse", "keyboard", "webcam", "microphone", "led", "drone", "camera", "tripod", "phone holder", "tablet", "smart watch", "earbuds", "tws", "headset", "hub", "dock"],
  "ילדים": ["kid", "child", "baby", "toy", "game", "puzzle", "doll", "lego", "educational", "stroller", "diaper", "bottle", "pacifier", "infant", "toddler", "children", "school", "backpack kid", "balloon", "birthday"],
  "בית": ["home", "kitchen", "bathroom", "bedroom", "furniture", "decor", "storage", "organizer", "towel", "curtain", "pillow", "blanket", "lamp", "pot", "pan", "bowl", "container", "utensil", "knife", "cutting board", "plate", "cup", "mug", "blender", "mixer", "coffee", "tea", "bbq", "grill", "opener", "silicone"],
  "בית חכם": ["smart home", "wifi", "alexa", "google home", "automation", "sensor", "switch", "socket", "plug smart", "bulb smart", "camera security", "doorbell", "lock smart", "thermostat", "remote control", "zigbee", "tuya", "robot vacuum"],
  "אופנה": ["fashion", "clothing", "shirt", "dress", "pants", "jeans", "jacket", "shoes", "sneakers", "boots", "sandals", "bag", "handbag", "wallet", "belt", "watch", "jewelry", "necklace", "bracelet", "ring", "earring", "sunglasses", "hat", "scarf", "swimwear", "bikini"],
  "נסיעות": ["travel", "luggage", "suitcase", "backpack", "passport", "neck pillow", "camping", "hiking", "outdoor", "tent", "sleeping bag", "flashlight"],
  "בריאות": ["health", "medical", "massage", "fitness", "exercise", "yoga", "gym", "weight", "scale", "blood pressure", "thermometer", "vitamin", "posture", "pain relief", "sleep", "trimmer", "clipper", "shaver", "beard", "razor", "essential oil", "diffuser"],
  "כלי עבודה": ["tool", "drill", "screwdriver", "wrench", "hammer", "plier", "saw", "measure", "tape", "level", "multimeter", "soldering", "welding", "toolbox", "safety", "ladder"],
}

function detectHebrewCategory(productName: string): string {
  if (!productName) return "כללי"
  const lowerName = productName.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase())) return category
    }
  }
  return "כללי"
}

async function generateSignature(apiPath: string, params: Record<string, string>): Promise<string> {
  const sortedParams = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('')
  const signStr = apiPath + sortedParams
  const encoder = new TextEncoder()
  const keyData = encoder.encode(LAZADA_APP_SECRET!)
  const messageData = encoder.encode(signStr)
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

async function callLazadaAPI(apiPath: string, additionalParams: Record<string, string> = {}) {
  const params: Record<string, string> = {
    app_key: LAZADA_APP_KEY!,
    timestamp: Date.now().toString(),
    sign_method: 'sha256',
    userToken: LAZADA_USER_TOKEN!,
    ...additionalParams,
  }
  const signature = await generateSignature(apiPath, params)
  params.sign = signature
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const url = `${LAZADA_API_URL}${apiPath}?${qs}`
  const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
  return await response.json()
}

async function getTrackingLinks(productIds: string[]): Promise<Map<string, string>> {
  const linkMap = new Map<string, string>()
  if (productIds.length === 0) return linkMap
  
  // Batch in groups of 50
  for (let i = 0; i < productIds.length; i += 50) {
    const batch = productIds.slice(i, i + 50)
    try {
      const result = await callLazadaAPI('/marketing/getlink', {
        inputType: 'productId',
        inputValue: batch.join(','),
      })
      const links = result?.result?.data?.productBatchGetLinkInfoList || []
      for (const link of links) {
        if (link.productId && link.regularPromotionLink) {
          linkMap.set(String(link.productId), link.regularPromotionLink)
        }
      }
    } catch (e) {
      console.error('Error getting tracking links batch:', e)
    }
    await new Promise(r => setTimeout(r, 200))
  }
  return linkMap
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse batch parameter (default: process categories 0-4, then 5-9, etc.)
    let batchIndex = 0
    try {
      const body = await req.json()
      batchIndex = body?.batch || 0
    } catch { /* no body = batch 0 */ }

    const BATCH_SIZE = 6
    const startIdx = batchIndex * BATCH_SIZE
    const batchCategories = ALL_CATEGORIES.slice(startIdx, startIdx + BATCH_SIZE)
    
    if (batchCategories.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All batches complete', batch: batchIndex }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')
    const authResult = await verifyAdminAuth(authHeader)
    if (authResult.error === 'Missing authorization header' || authResult.error === 'Invalid auth token') {
      return createUnauthorizedResponse(authResult.error, corsHeaders)
    }
    if (!authResult.isAdmin) {
      return createForbiddenResponse('Admin access required', corsHeaders)
    }

    if (!LAZADA_APP_KEY || !LAZADA_APP_SECRET || !LAZADA_USER_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Lazada API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get existing product IDs to skip duplicates
    const { data: existing } = await supabase
      .from('feed_products')
      .select('lazada_product_id')
    const existingIds = new Set((existing || []).map(p => p.lazada_product_id))
    const initialCount = existingIds.size

    console.log(`Starting batch ${batchIndex} (categories ${startIdx+1}-${startIdx+batchCategories.length} of ${ALL_CATEGORIES.length}). Existing products: ${initialCount}`)

    let totalNew = 0
    let categoriesProcessed = 0

    for (const categoryId of batchCategories) {
      categoriesProcessed++
      console.log(`Processing category ${categoryId} (${startIdx + categoriesProcessed}/${ALL_CATEGORIES.length})`)

      try {
        const result = await callLazadaAPI('/marketing/product/feed', {
          offerType: '1',
          categoryL1: categoryId.toString(),
          page: '1',
          limit: '50',
        })

        const products = result?.result?.data || []
        if (products.length === 0) {
          console.log(`Category ${categoryId}: no products`)
          continue
        }

        // Filter valid new products
        const newProducts = products.filter((p: any) => {
          const pid = String(p.productId)
          if (existingIds.has(pid)) return false
          if (p.outOfStock || !p.discountPrice || p.discountPrice <= 0 || !p.pictures?.length) return false
          if (p.ratingScore && p.ratingScore < 4) return false
          return true
        })

        if (newProducts.length === 0) {
          console.log(`Category ${categoryId}: ${products.length} products, 0 new`)
          continue
        }

        // Get tracking links
        const productIds = newProducts.map((p: any) => String(p.productId))
        const trackingLinks = await getTrackingLinks(productIds)

        // Upsert
        for (const product of newProducts) {
          const pid = String(product.productId)
          let discountPercentage = null
          if (product.originalPrice && product.discountPrice) {
            const orig = parseFloat(product.originalPrice)
            const sale = parseFloat(product.discountPrice)
            if (orig > sale) discountPercentage = Math.round(((orig - sale) / orig) * 100)
          }

          const { error } = await supabase
            .from('feed_products')
            .upsert({
              lazada_product_id: pid,
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
              category_l1: categoryId,
              category_name_hebrew: detectHebrewCategory(product.productName),
              brand_name: product.brandName,
              tracking_link: trackingLinks.get(pid) || `https://www.lazada.co.th/products/-i${pid}.html`,
              out_of_stock: false,
              seller_name: product.sellerName || null,
              stock: product.stock || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'lazada_product_id' })

          if (!error) {
            existingIds.add(pid)
            totalNew++
          }
        }

        console.log(`Category ${categoryId}: ${products.length} products, ${newProducts.length} new → ${totalNew} total new`)
      } catch (e) {
        console.error(`Error processing category ${categoryId}:`, e)
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500))
    }

    // Auto-translate new products
    let translatedCount = 0
    if (totalNew > 0) {
      try {
        const translateResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/translate-products`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ platform: 'lazada' }),
          }
        )
        if (translateResponse.ok) {
          const result = await translateResponse.json()
          translatedCount = result?.results?.lazada?.translated || 0
        }
      } catch (e) {
        console.error('Translation error:', e)
      }
    }

    const finalCount = existingIds.size
    const hasMore = startIdx + BATCH_SIZE < ALL_CATEGORIES.length
    const nextBatch = hasMore ? batchIndex + 1 : null

    return new Response(
      JSON.stringify({
        message: hasMore ? `Batch ${batchIndex} complete` : 'All batches complete',
        batch: batchIndex,
        next_batch: nextBatch,
        initial_count: initialCount,
        final_count: finalCount,
        new_products: totalNew,
        categories_processed: categoriesProcessed,
        total_categories: ALL_CATEGORIES.length,
        translated: translatedCount,
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
