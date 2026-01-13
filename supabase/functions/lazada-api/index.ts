import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lazada API configuration
const LAZADA_APP_KEY = Deno.env.get('LAZADA_APP_KEY')
const LAZADA_APP_SECRET = Deno.env.get('LAZADA_APP_SECRET')
const LAZADA_USER_TOKEN = Deno.env.get('LAZADA_ACCESS_TOKEN') // User Token for affiliate API
const LAZADA_API_URL = 'https://api.lazada.co.th/rest' // Thailand region

// Make async signature function using HMAC-SHA256
async function generateSignatureAsync(apiPath: string, params: Record<string, string>, appSecret: string): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('')
  
  const signStr = apiPath + sortedParams
  
  console.log('Sign string:', signStr)
  
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

// Call Lazada Affiliate API
async function callLazadaAPI(apiPath: string, additionalParams: Record<string, string> = {}) {
  const timestamp = Date.now().toString()
  
  // Build params with userToken (affiliate API uses userToken, not access_token)
  const params: Record<string, string> = {
    app_key: LAZADA_APP_KEY!,
    timestamp,
    sign_method: 'sha256',
    userToken: LAZADA_USER_TOKEN!,
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
  console.log(`Lazada API response:`, JSON.stringify(data).substring(0, 1500))
  
  return data
}

// Get product feed - IN USE
// Path: /marketing/product/feed
async function getProductFeed(offerType: number = 1, page: number = 1, limit: number = 20, categoryL1?: number, mmCampaignId?: number, dmInviteId?: number) {
  console.log(`Getting product feed, offerType: ${offerType}, page: ${page}`)
  
  const params: Record<string, string> = {
    offerType: offerType.toString(),
    page: page.toString(),
    limit: limit.toString()
  }
  
  if (categoryL1) params.categoryL1 = categoryL1.toString()
  if (mmCampaignId) params.mmCampaignId = mmCampaignId.toString()
  if (dmInviteId) params.dmInviteId = dmInviteId.toString()
  
  const result = await callLazadaAPI('/marketing/product/feed', params)
  return result
}

// Get tracking link for product - IN USE
// Path: /marketing/product/link
async function getTrackingLink(productId: string, mmCampaignId?: string, dmInviteId?: string) {
  console.log(`Getting tracking link for productId: ${productId}`)
  
  const params: Record<string, string> = {
    productId
  }
  
  if (mmCampaignId) params.mmCampaignId = mmCampaignId
  if (dmInviteId) params.dmInviteId = dmInviteId
  
  const result = await callLazadaAPI('/marketing/product/link', params)
  return result
}

// Batch get links - IN USE
// Path: /marketing/getlink
async function batchGetLinks(
  inputType: 'productId' | 'url' | 'offerId', 
  inputValue: string,
  mmCampaignId?: string,
  dmInviteId?: string,
  subId1?: string,
  subId2?: string,
  subId3?: string
) {
  console.log(`Batch getting links, inputType: ${inputType}, inputValue: ${inputValue}`)
  
  const params: Record<string, string> = {
    inputType,
    inputValue
  }
  
  if (mmCampaignId) params.mmCampaignId = mmCampaignId
  if (dmInviteId) params.dmInviteId = dmInviteId
  if (subId1) params.subId1 = subId1
  if (subId2) params.subId2 = subId2
  if (subId3) params.subId3 = subId3
  
  const result = await callLazadaAPI('/marketing/getlink', params)
  return result
}

// Get conversion report - IN USE
// Path: /marketing/conversion/report
async function getConversionReport(
  dateStart: string, 
  dateEnd: string, 
  page: number = 1, 
  limit: number = 100,
  offerId?: string,
  mmPartnerFlag?: boolean
) {
  console.log(`Getting conversion report from ${dateStart} to ${dateEnd}`)
  
  const params: Record<string, string> = {
    dateStart,
    dateEnd,
    page: page.toString(),
    limit: limit.toString()
  }
  
  if (offerId) params.offerId = offerId
  if (mmPartnerFlag !== undefined) params.mmPartnerFlag = mmPartnerFlag.toString()
  
  const result = await callLazadaAPI('/marketing/conversion/report', params)
  return result
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate API credentials
    if (!LAZADA_APP_KEY || !LAZADA_APP_SECRET || !LAZADA_USER_TOKEN) {
      console.error('Missing Lazada API credentials')
      return new Response(
        JSON.stringify({ error: 'Lazada API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { 
      action, 
      offerType, 
      productId,
      inputType,
      inputValue,
      dateStart, 
      dateEnd, 
      offerId,
      categoryL1,
      mmCampaignId,
      dmInviteId,
      mmPartnerFlag,
      subId1,
      subId2,
      subId3,
      page, 
      limit 
    } = body
    
    console.log(`Received action: ${action}`, JSON.stringify(body))

    let result

    switch (action) {
      // Get product feed - main API for getting products
      case 'product-feed':
        result = await getProductFeed(
          offerType || 1, 
          page || 1, 
          limit || 20, 
          categoryL1, 
          mmCampaignId, 
          dmInviteId
        )
        break

      // Get tracking link for a specific product
      case 'tracking-link':
        if (!productId) {
          return new Response(
            JSON.stringify({ error: 'productId is required for tracking link' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getTrackingLink(productId, mmCampaignId, dmInviteId)
        break

      // Batch get links - supports productId, url, or offerId
      case 'batch-links':
        if (!inputType || !inputValue) {
          return new Response(
            JSON.stringify({ 
              error: 'inputType and inputValue are required for batch links',
              validInputTypes: ['productId', 'url', 'offerId']
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await batchGetLinks(inputType, inputValue, mmCampaignId, dmInviteId, subId1, subId2, subId3)
        break

      // Get conversion report
      case 'conversion-report':
        if (!dateStart || !dateEnd) {
          return new Response(
            JSON.stringify({ error: 'dateStart and dateEnd are required (YYYY-MM-DD format)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        result = await getConversionReport(dateStart, dateEnd, page || 1, limit || 100, offerId, mmPartnerFlag)
        break

      // Test API connection
      case 'test':
        result = {
          status: 'connected',
          message: 'Lazada Affiliate API credentials are configured',
          appKey: LAZADA_APP_KEY,
          userToken: LAZADA_USER_TOKEN?.substring(0, 8) + '...',
          timestamp: new Date().toISOString(),
          availableActions: [
            'product-feed - Get product list (offerType: 1=Regular, 2=MM, 3=DM)',
            'tracking-link - Get tracking link for a product (productId required)',
            'batch-links - Batch get links (inputType: productId/url/offerId, inputValue required)',
            'conversion-report - Get conversion report (dateStart, dateEnd required)'
          ]
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
              'conversion-report',
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