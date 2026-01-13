import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LAZADA_APP_KEY = Deno.env.get('LAZADA_APP_KEY') || ''
const LAZADA_APP_SECRET = Deno.env.get('LAZADA_APP_SECRET') || ''
const LAZADA_USER_TOKEN = Deno.env.get('LAZADA_USER_TOKEN') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

async function generateSignatureAsync(apiPath: string, params: Record<string, string>): Promise<string> {
  const sortedKeys = Object.keys(params).sort()
  let signString = apiPath
  for (const key of sortedKeys) {
    signString += key + params[key]
  }
  const hmac = createHmac('sha256', LAZADA_APP_SECRET)
  hmac.update(signString)
  return hmac.digest('hex').toUpperCase()
}

async function getProductInfoFromUrl(url: string): Promise<{
  productId?: string;
  productName?: string;
  imageUrl?: string;
  priceTHB?: number;
} | null> {
  const timestamp = Date.now().toString()
  const apiPath = '/marketing/getlink'
  
  const params: Record<string, string> = {
    'app_key': LAZADA_APP_KEY,
    'timestamp': timestamp,
    'sign_method': 'sha256',
    'userToken': LAZADA_USER_TOKEN,
    'inputType': 'url',
    'inputValue': url.split('?')[0], // Remove query params
  }

  const signature = await generateSignatureAsync(apiPath, params)
  params['sign'] = signature

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')

  const apiUrl = `https://api.lazada.co.th/rest${apiPath}?${queryString}`

  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    const urlInfo = data?.result?.data?.urlBatchGetLinkInfoList?.[0]
    if (urlInfo) {
      return {
        productId: urlInfo.productId,
        productName: urlInfo.productName,
      }
    }
  } catch (error) {
    console.error('Error fetching product info:', error)
  }
  
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all products that need updating (no lazada_product_id yet)
    const { data: products, error } = await supabase
      .from('category_products')
      .select('*')
      .is('lazada_product_id', null)
      .limit(50)

    if (error) throw error

    console.log(`Found ${products?.length || 0} products to update`)

    let updated = 0
    let failed = 0

    for (const product of products || []) {
      try {
        const info = await getProductInfoFromUrl(product.affiliate_link)
        
        if (info?.productId) {
          const { error: updateError } = await supabase
            .from('category_products')
            .update({
              lazada_product_id: info.productId,
              name_english: info.productName,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id)

          if (updateError) {
            console.error(`Error updating product ${product.id}:`, updateError)
            failed++
          } else {
            updated++
          }
        } else {
          failed++
        }

        // Rate limiting - wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (e) {
        console.error(`Error processing product ${product.id}:`, e)
        failed++
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updated} products, ${failed} failed`,
        total: products?.length || 0
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