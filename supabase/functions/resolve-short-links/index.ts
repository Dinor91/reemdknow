import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Short link domains that need resolution
const SHORT_LINK_DOMAINS = [
  's.lazada.co.th',
  'c.lazada.co.th',
  's.click.aliexpress.com',
  'a.aliexpress.com',
];

// Check if URL is a short link that needs following
function isShortLink(url: string): boolean {
  return SHORT_LINK_DOMAINS.some(domain => url.includes(domain));
}

// Follow a redirect to get the final URL (with retry)
async function followRedirect(url: string, depth = 0): Promise<string | null> {
  if (depth > 5) return null; // Prevent infinite loops
  
  try {
    // Try HEAD request first (faster)
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
    });
    
    const location = response.headers.get('location');
    if (location) {
      // If it's still a short link, follow it
      if (isShortLink(location)) {
        return await followRedirect(location, depth + 1);
      }
      return location;
    }
    
    // Try GET if HEAD didn't work
    const getResponse = await fetch(url, { redirect: 'manual' });
    const getLocation = getResponse.headers.get('location');
    if (getLocation) {
      if (isShortLink(getLocation)) {
        return await followRedirect(getLocation, depth + 1);
      }
      return getLocation;
    }
    
    return null;
  } catch (e) {
    console.log('Error following redirect:', url, e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { urls } = await req.json()

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'URLs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Resolving ${urls.length} short links`)

    const resolved: Record<string, string> = {};
    const failed: string[] = [];
    
    // Process in batches of 5 to avoid timeout
    const batchSize = 5;
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const results = await Promise.all(batch.map(async (shortUrl: string) => {
        const resolvedUrl = await followRedirect(shortUrl);
        return { shortUrl, resolvedUrl };
      }));
      
      for (const { shortUrl, resolvedUrl } of results) {
        if (resolvedUrl) {
          resolved[shortUrl] = resolvedUrl;
          console.log(`Resolved: ${shortUrl} -> ${resolvedUrl.substring(0, 80)}...`);
        } else {
          failed.push(shortUrl);
          console.log(`Failed to resolve: ${shortUrl}`);
        }
      }
      
      // Small delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`Resolved ${Object.keys(resolved).length} links, failed ${failed.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        resolved,
        resolvedCount: Object.keys(resolved).length,
        failedCount: failed.length,
        failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in resolve-short-links:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
