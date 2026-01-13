import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lazada API configuration
const LAZADA_APP_KEY = Deno.env.get('LAZADA_APP_KEY')
const LAZADA_APP_SECRET = Deno.env.get('LAZADA_APP_SECRET')
const LAZADA_ACCESS_TOKEN = Deno.env.get('LAZADA_ACCESS_TOKEN')
const LAZADA_API_URL = 'https://api.lazada.co.th/rest'

// Make async signature function using HMAC-SHA256
async function generateSignatureAsync(apiPath: string, params: Record<string, string>, appSecret: string): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('')
  
  const signStr = apiPath + sortedParams
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(appSecret)
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

// Call Lazada API
async function callLazadaAPI(apiPath: string, additionalParams: Record<string, string> = {}) {
  const timestamp = Date.now().toString()
  
  const params: Record<string, string> = {
    app_key: LAZADA_APP_KEY!,
    timestamp,
    sign_method: 'sha256',
    access_token: LAZADA_ACCESS_TOKEN!,
    ...additionalParams
  }
  
  const signature = await generateSignatureAsync(apiPath, params, LAZADA_APP_SECRET!)
  params.sign = signature
  
  const queryString = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  
  const url = `${LAZADA_API_URL}${apiPath}?${queryString}`
  
  console.log(`Calling Lazada API: ${url}`)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  
  const data = await response.json()
  console.log(`Lazada API response:`, JSON.stringify(data).substring(0, 1000))
  
  return data
}

// Get product feed - Get product information for affiliates
async function getProductFeed(offerId: string, page: number = 1, limit: number = 20) {
  console.log(`Getting product feed for offerId: ${offerId}`)
  
  const result = await callLazadaAPI('/marketing/product/feed/get', {
    offerId,
    page: page.toString(),
    limit: limit.toString()
  })
  
  return result
}

// Get tracking link by product ID
async function getTrackingLink(productId: string, offerId: string) {
  console.log(`Getting tracking link for productId: ${productId}`)
  
  const result = await callLazadaAPI('/marketing/link/get', {
    productId,
    offerId
  })
  
  return result
}

// Batch get links
async function batchGetLinks(urls: string) {
  console.log(`Batch getting links for: ${urls}`)
  
  const result = await callLazadaAPI('/marketing/link/batch/get', {
    urls
  })
  
  return result
}

// Get promo link by offer ID
async function getPromoLink(offerId: string) {
  console.log(`Getting promo link for offerId: ${offerId}`)
  
  const result = await callLazadaAPI('/marketing/promo/link/get', {
    offerId
  })
  
  return result
}

// Get conversion report
async function getConversionReport(dateStart: string, dateEnd: string, offerId: string, page: number = 1, limit: number = 100) {
  console.log(`Getting conversion report from ${dateStart} to ${dateEnd}`)
  
  const result = await callLazadaAPI('/marketing/conversion/report', {
    dateStart,
    dateEnd,
    offerId,
    page: page.toString(),
    limit: limit.toString()
  })
  
  return result
}

// Get performance report
async function getPerformanceReport(dateStart: string, dateEnd: string, offerId: string) {
  console.log(`Getting performance report from ${dateStart} to ${dateEnd}`)
  
  const result = await callLazadaAPI('/marketing/performance/report', {
    dateStart,
    dateEnd,
    offerId
  })
  
  return result
}

// Get product performance report
async function getProductPerformanceReport(dateStart: string, dateEnd: string, offerId: string, page: number = 1, limit: number = 100) {
  console.log(`Getting product performance report from ${dateStart} to ${dateEnd}`)
  
  const result = await callLazadaAPI('/marketing/product/performance/report', {
    dateStart,
    dateEnd,
    offerId,
    page: page.toString(),
    limit: limit.toString()
  })
  
  return result
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate API credentials
    if (!LAZADA_APP_KEY || !LAZADA_APP_SECRET || !LAZADA_ACCESS_TOKEN) {
      console.error('Missing Lazada API credentials')
      return new Response(
        JSON.stringify({ error: 'Lazada API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { action, offerId, productId, urls, dateStart, dateEnd, page, limit } = body
    console.log(`Received action: ${action}`, JSON.stringify(body))

    let result

    switch (action) {
      case 'product-feed':
        if (!offerId) {
          return new Response(
            JSON.stringify({ error: 'offerId is required for product feed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getProductFeed(offerId, page || 1, limit || 20)
        break

      case 'tracking-link':
        if (!productId || !offerId) {
          return new Response(
            JSON.stringify({ error: 'productId and offerId are required for tracking link' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getTrackingLink(productId, offerId)
        break

      case 'batch-links':
        if (!urls) {
          return new Response(
            JSON.stringify({ error: 'urls is required for batch links' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await batchGetLinks(urls)
        break

      case 'promo-link':
        if (!offerId) {
          return new Response(
            JSON.stringify({ error: 'offerId is required for promo link' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getPromoLink(offerId)
        break

      case 'conversion-report':
        if (!dateStart || !dateEnd || !offerId) {
          return new Response(
            JSON.stringify({ error: 'dateStart, dateEnd, and offerId are required for conversion report' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getConversionReport(dateStart, dateEnd, offerId, page || 1, limit || 100)
        break

      case 'performance-report':
        if (!dateStart || !dateEnd || !offerId) {
          return new Response(
            JSON.stringify({ error: 'dateStart, dateEnd, and offerId are required for performance report' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getPerformanceReport(dateStart, dateEnd, offerId)
        break

      case 'product-performance-report':
        if (!dateStart || !dateEnd || !offerId) {
          return new Response(
            JSON.stringify({ error: 'dateStart, dateEnd, and offerId are required for product performance report' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getProductPerformanceReport(dateStart, dateEnd, offerId, page || 1, limit || 100)
        break

      case 'test':
        // Test API connection
        result = {
          status: 'connected',
          message: 'Lazada API credentials are configured',
          appKey: LAZADA_APP_KEY,
          timestamp: new Date().toISOString()
        }
        break

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action',
            availableActions: [
              'product-feed',
              'tracking-link', 
              'batch-links',
              'promo-link',
              'conversion-report',
              'performance-report',
              'product-performance-report',
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
    console.error('Error in lazada-api function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})