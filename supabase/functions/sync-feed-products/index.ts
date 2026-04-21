import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import { verifyAdminAuth, createUnauthorizedResponse, createForbiddenResponse } from '../_shared/auth.ts'
import { LAZADA_CATEGORY_MAP, UNWANTED_PRODUCT_KEYWORDS } from '../_shared/constants.ts'

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

// ── Strict category detection (skip unrecognized products) ──────
function detectHebrewCategory(productName: string): string | null {
  const name = productName.toLowerCase();

  // מוצרים שצריך לדלג עליהם לחלוטין
  const hardExclusions = [
    'cpap', 'oxygen concentrat', 'patient bed', 'hospital bed', 'medical device',
    'wheelchair', 'nebulizer', 'dialysis', 'stethoscope',
    'soldering station', 'reflow', 'motherboard', 'pcb board', 'desoldering',
    'collagen supplement', 'weight loss pill', 'fat burner', 'testosterone',
    'protein powder', 'pre-workout', 'amino acid supplement',
    'lingerie', 'bikini top', 'underwear set', 'bra set',
    'replacement blade for', 'spare part for', 'compatible with model',
  ];
  if (hardExclusions.some(ex => name.includes(ex))) return null;

  // זיהוי קטגוריה
  if (/\b(toy|lego|puzzle|plush|doll|rc car|action figure|board game|educational|montessori|stem kit|building block|magnetic tile|robot kit|drum set|go-kart|swing set|slide|dollhouse|bubble machine)\b/.test(name))
    return 'ילדים ומשחקים';

  if (/\b(charger|charging cable|usb-c|usb c|power bank|wireless earbuds|tws|bluetooth speaker|smart plug|smart switch|zigbee|tuya|led strip|rgb|drone|gimbal|stabilizer|webcam|mechanical keyboard|gaming mouse|usb hub|docking station|phone stand|monitor arm|projector|security camera|ip camera)\b/.test(name))
    return 'גאדג׳טים ובית חכם';

  if (/\b(screwdriver|drill bit|wrench|plier|socket set|measuring tape|laser level|angle grinder|jigsaw|circular saw|hand saw|toolbox|soldering iron|multimeter|clamp|hex key|rotary hammer|impact driver|step drill|nail|screw|bolt|nut|hardware kit|air pump|grinding wheel|cordless drill|power tool)\b/.test(name))
    return 'כלי עבודה וציוד';

  if (/\b(organizer|storage box|shelf|drawer|magnetic hook|adhesive hook|silicone mat|cable clip|spice rack|cup holder|dish rack|vacuum sealer|cleaning brush|broom|mop|lazy susan|sink rack|shoe rack|air fryer|rice cooker|blender|kettle|toaster|microwave|coffee maker|robot vacuum|vacuum cleaner|ceiling fan|mattress|air purifier)\b/.test(name))
    return 'בית ומטבח';

  if (/\b(thermal bottle|vacuum flask|lunch box|bento|cooler bag|backpack|hiking|camping|sleeping bag|tent|picnic|folding chair|cycling glove|bike light|sports belt|waist pack|fitness tracker|yoga mat|resistance band|swim goggle|microfiber towel|sport watch|snorkel|running shoe|gym bag)\b/.test(name))
    return 'בריאות וספורט';

  if (/\b(car mount|car charger|dash cam|seat cover|steering wheel|car organizer|windshield|wiper|tyre|tire inflator|jump starter|car vacuum|parking sensor)\b/.test(name))
    return 'רכב ותחבורה';

  return null;
}

// ── Lazada API helpers (unchanged) ──────────────────────────────

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
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
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

// ── Category-based fetch ────────────────────────────────────────

interface RawProduct {
  productId: string | number
  productName: string
  discountPrice: number | null
  originalPrice: number | null
  pictures: string[]
  ratingScore: number | null
  reviewCount: number | null
  outOfStock: boolean
  currency: string
  sales7d: number | null
  totalCommissionRate: number | null
  categoryL1: number | null
  brandName: string | null
  _categoryNameHebrew?: string
}

async function fetchLazadaByCategory(
  categoryId: number,
  categoryName: string,
  maxPages: number = 5
): Promise<RawProduct[]> {
  const products: RawProduct[] = []

  for (let page = 1; page <= maxPages; page++) {
    const result = await callLazadaAPI('/marketing/product/feed', {
      offerType: '1',
      categoryL1: categoryId.toString(),
      page: page.toString(),
      limit: '50'
    })

    const batch = result?.result?.data || []
    if (batch.length === 0) break

    for (const p of batch) {
      p._categoryNameHebrew = categoryName
    }
    products.push(...batch)

    console.log(`  [${categoryName}] cat=${categoryId} page=${page} got=${batch.length}`)

    if (batch.length < 50) break // last page
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  return products
}

// ── Snapshot helper ─────────────────────────────────────────────

async function getSnapshot(supabase: any): Promise<{ total: number, byCategory: Record<string, number> }> {
  const { count: total } = await supabase
    .from('feed_products')
    .select('*', { count: 'exact', head: true })

  const { data: products } = await supabase
    .from('feed_products')
    .select('category_name_hebrew')

  const byCategory: Record<string, number> = {}
  for (const p of products || []) {
    const cat = p.category_name_hebrew || 'כללי'
    byCategory[cat] = (byCategory[cat] || 0) + 1
  }

  return { total: total || 0, byCategory }
}

// ── Main handler ────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth: cron bypass or admin check
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

    // Parse batch parameter from body
    let batchIndex: number | null = null
    const BATCH_SIZE = 2
    try {
      const body = await req.json()
      if (body.batch !== undefined && body.batch !== null) {
        batchIndex = parseInt(String(body.batch))
      }
    } catch { /* no body = run all (backward compat for cron) */ }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Determine which categories to process
    const allCategoryEntries = Object.entries(LAZADA_CATEGORY_MAP)
    const totalBatches = Math.ceil(allCategoryEntries.length / BATCH_SIZE)
    const isLastBatch = batchIndex !== null ? batchIndex >= totalBatches - 1 : true
    const isBatchMode = batchIndex !== null

    let categoryEntries: [string, number[]][]
    if (isBatchMode) {
      const start = batchIndex! * BATCH_SIZE
      categoryEntries = allCategoryEntries.slice(start, start + BATCH_SIZE)
      console.log(`🔄 Batch ${batchIndex}/${totalBatches - 1}: processing ${categoryEntries.map(e => e[0]).join(', ')}`)
    } else {
      categoryEntries = allCategoryEntries
      console.log(`Running all categories (no batch parameter)`)
    }

    // ── Step 0: "Before" snapshot (only for full run or last batch) ──
    let before: { total: number, byCategory: Record<string, number> } | null = null
    if (!isBatchMode || isLastBatch) {
      before = await getSnapshot(supabase)
      console.log(`📊 BEFORE: total=${before.total}`, JSON.stringify(before.byCategory))
    }

    // ── Step 1: Fetch products by category ──
    const allProducts: RawProduct[] = []
    const perCategoryFetched: Record<string, number> = {}
    const maxPagesForMode = isBatchMode ? 3 : 5

    for (const [categoryName, categoryIds] of categoryEntries) {
      let categoryTotal = 0
      for (const categoryId of categoryIds) {
        const products = await fetchLazadaByCategory(categoryId, categoryName, maxPagesForMode)
        allProducts.push(...products)
        categoryTotal += products.length
      }
      perCategoryFetched[categoryName] = categoryTotal
      console.log(`✅ ${categoryName}: ${categoryTotal} products`)
    }

    console.log(`Total fetched from API: ${allProducts.length}`)

    // ── Step 2: Filter ──
    const validProducts = allProducts.filter(p => {
      if (p.outOfStock) return false
      if (!p.discountPrice || p.discountPrice <= 0) return false
      if (!p.pictures?.length) return false
      // Rating: if exists AND < 4 → filter. If null → keep.
      if (p.ratingScore != null && p.ratingScore < 4) return false
      return true
    })

    console.log(`Valid after filter: ${validProducts.length} (from ${allProducts.length})`)

    // ── Step 3: AI Translation ──
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

    // ── Step 4: Tracking links ──
    const productIds = validProducts.map((p: any) => String(p.productId))
    const trackingLinks = await getTrackingLinks(productIds)

    // Build reverse map: categoryL1 → Hebrew category name (priority over regex)
    const categoryIdToHebrew = new Map<number, string>()
    for (const [hebrewName, ids] of Object.entries(LAZADA_CATEGORY_MAP)) {
      for (const id of ids) categoryIdToHebrew.set(id, hebrewName)
    }

    // ── Step 5: Upsert ──
    const GLOBAL_EXCLUDE = [
      // ביגוד והנעלה
      'sneaker', 'running shoe', 't-shirt', 'shorts', 'jacket', 'hoodie',
      'leggings', 'pants', 'jeans', 'dress', 'blouse', 'sweater', 'cardigan',
      'underwear', 'socks', 'bra', 'swimsuit', 'swimwear', 'bikini',
      'new balance', 'adidas', 'nike', 'converse', 'crocs', 'north face',
      // קוסמטיקה ושיער
      'shampoo', 'conditioner', 'hair mask', 'hair serum', 'tsubaki',
      'perfume', 'cologne', 'foundation', 'lipstick', 'mascara', 'eyeshadow',
      // אוכל ותינוקות
      'formula milk', 'baby formula', 'infant formula', 'meiji',
      'coffee bean', 'instant coffee', 'green tea', 'protein shake',
      // ציוד תפירה וסריגה
      'knitting needle', 'crochet hook', 'sewing thread', 'embroidery',
      // ציוד 3D printing
      'z-axis', 'heat insert', 'filament', '3d printer part',
    ]

    let upserted = 0
    let globalExcluded = 0
    for (const product of validProducts) {
      const productId = String(product.productId)

      // Global exclude check (before category detection)
      const productNameLower = (product.productName || '').toLowerCase()
      if (GLOBAL_EXCLUDE.some(word => productNameLower.includes(word))) {
        console.log(`Global exclude: ${product.productName}`)
        globalExcluded++
        continue
      }

      // Priority 1: use category_l1 if mapped
      let hebrewCategory: string | null = null
      if (product.categoryL1 != null && categoryIdToHebrew.has(product.categoryL1)) {
        hebrewCategory = categoryIdToHebrew.get(product.categoryL1)!
      } else {
        // Priority 2: fallback to name-based regex detection
        hebrewCategory = detectHebrewCategory(product.productName)
      }
      if (!hebrewCategory) {
        console.log(`Skipping unrecognized product: ${product.productName}`);
        continue;
      }

      let discountPercentage = null
      if (product.originalPrice && product.discountPrice) {
        const original = parseFloat(String(product.originalPrice))
        const sale = parseFloat(String(product.discountPrice))
        if (original > sale) {
          discountPercentage = Math.round(((original - sale) / original) * 100)
        }
      }

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
          out_of_stock: false,
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

    // ── Step 6: Mark stale products as out_of_stock (only full run or last batch) ──
    let markedOutOfStock = 0
    if (!isBatchMode || isLastBatch) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: staleProducts } = await supabase
        .from('feed_products')
        .update({ out_of_stock: true })
        .lt('updated_at', thirtyDaysAgo)
        .eq('out_of_stock', false)
        .select('id')

      markedOutOfStock = staleProducts?.length || 0
      console.log(`📦 Marked ${markedOutOfStock} stale products as out_of_stock`)
    }

    // ── Step 7: Auto-translate new products (only full run or last batch) ──
    let translatedCount = 0
    if (!isBatchMode || isLastBatch) {
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
    }

    // ── Step 8: "After" snapshot + unwanted product check (only full run or last batch) ──
    let after: { total: number, byCategory: Record<string, number> } | null = null
    let uniqueUnwanted: any[] = []

    if (!isBatchMode || isLastBatch) {
      after = await getSnapshot(supabase)
      console.log(`📊 AFTER: total=${after.total}`, JSON.stringify(after.byCategory))

      const allUnwanted: any[] = []
      for (const keyword of UNWANTED_PRODUCT_KEYWORDS) {
        const { data } = await supabase
          .from('feed_products')
          .select('id, product_name, category_name_hebrew')
          .eq('out_of_stock', false)
          .ilike('product_name', `%${keyword}%`)
          .limit(5)
        if (data?.length) allUnwanted.push(...data)
      }

      const seenIds = new Set<string>()
      uniqueUnwanted = allUnwanted.filter(p => {
        if (seenIds.has(p.id)) return false
        seenIds.add(p.id)
        return true
      })

      if (uniqueUnwanted.length > 0) {
        console.log(`⚠️ Found ${uniqueUnwanted.length} potentially unwanted products:`)
        for (const p of uniqueUnwanted) {
          console.log(`  - ${p.product_name} [${p.category_name_hebrew}]`)
        }
      } else {
        console.log('✅ No unwanted products (amulets/tea/etc.) found')
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Sync complete',
        batch: batchIndex,
        totalBatches,
        isLastBatch,
        before,
        after,
        perCategoryFetched,
        totalFetched: allProducts.length,
        validProducts: validProducts.length,
        upserted,
        markedOutOfStock,
        translated: translatedCount,
        unwantedProducts: uniqueUnwanted,
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
