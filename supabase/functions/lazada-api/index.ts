import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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

// Generate signature for Lazada API
function generateSignature(apiPath: string, params: Record<string, string>, appSecret: string): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('')
  
  const signStr = apiPath + sortedParams
  
  // HMAC-SHA256 signature
  const encoder = new TextEncoder()
  const keyData = encoder.encode(appSecret)
  const messageData = encoder.encode(signStr)
  
  // Using Web Crypto API for HMAC
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(key => 
    crypto.subtle.sign('HMAC', key, messageData)
  ).then(signature => {
    const hashArray = Array.from(new Uint8Array(signature))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  }) as unknown as string
}

// Make async signature function
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
  
  console.log(`Calling Lazada API: ${apiPath}`)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  
  const data = await response.json()
  console.log(`Lazada API response:`, JSON.stringify(data).substring(0, 500))
  
  return data
}

// Search products on Lazada
async function searchProducts(keyword: string, limit: number = 10) {
  console.log(`Searching products with keyword: ${keyword}`)
  
  // Lazada Affiliate API endpoint for product search
  const result = await callLazadaAPI('/lazada/affiliate/product/search', {
    keyword,
    limit: limit.toString()
  })
  
  return result
}

// Get product details
async function getProductDetails(itemId: string) {
  console.log(`Getting product details for: ${itemId}`)
  
  const result = await callLazadaAPI('/lazada/affiliate/product/item/get', {
    item_id: itemId
  })
  
  return result
}

// Generate affiliate link
async function generateAffiliateLink(url: string) {
  console.log(`Generating affiliate link for: ${url}`)
  
  const result = await callLazadaAPI('/lazada/affiliate/link/generate', {
    urls: url
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

    const { action, keyword, itemId, url, limit } = await req.json()
    console.log(`Received action: ${action}`)

    let result

    switch (action) {
      case 'search':
        if (!keyword) {
          return new Response(
            JSON.stringify({ error: 'Keyword is required for search' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await searchProducts(keyword, limit || 10)
        break

      case 'details':
        if (!itemId) {
          return new Response(
            JSON.stringify({ error: 'Item ID is required for details' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getProductDetails(itemId)
        break

      case 'generate-link':
        if (!url) {
          return new Response(
            JSON.stringify({ error: 'URL is required for affiliate link generation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await generateAffiliateLink(url)
        break

      case 'test':
        // Test API connection
        result = {
          status: 'connected',
          message: 'Lazada API credentials are configured',
          timestamp: new Date().toISOString()
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: search, details, generate-link, or test' }),
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