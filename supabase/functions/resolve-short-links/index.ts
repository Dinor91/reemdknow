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

// Follow a redirect to get the final URL (with retry and browser simulation)
async function followRedirect(url: string, depth = 0): Promise<string | null> {
  if (depth > 5) return null; // Prevent infinite loops
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };
  
  try {
    // Try GET request with browser-like headers (more reliable than HEAD for these sites)
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers,
    });
    
    // Check for redirect in headers
    let location = response.headers.get('location');
    
    // Some sites use meta refresh or JavaScript redirect - check body for these
    if (!location && response.status === 200) {
      const body = await response.text();
      
      // Look for meta refresh redirect
      const metaMatch = body.match(/content=["'][^"']*url=([^"'>\s]+)/i);
      if (metaMatch) {
        location = metaMatch[1];
      }
      
      // Look for JavaScript redirect
      const jsMatch = body.match(/window\.location\.href\s*=\s*["']([^"']+)/i) ||
                     body.match(/location\.replace\s*\(\s*["']([^"']+)/i) ||
                     body.match(/location\.href\s*=\s*["']([^"']+)/i);
      if (jsMatch) {
        location = jsMatch[1];
      }
      
      // Look for canonical link or og:url
      const canonicalMatch = body.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i) ||
                            body.match(/property=["']og:url["'][^>]*content=["']([^"']+)/i);
      if (canonicalMatch) {
        const canonicalUrl = canonicalMatch[1];
        // Only use canonical if it's a product URL (not the short link domain)
        if (!isShortLink(canonicalUrl) && (canonicalUrl.includes('/products/') || canonicalUrl.includes('/item/'))) {
          location = canonicalUrl;
        }
      }
    }
    
    if (location) {
      // Handle relative URLs
      if (location.startsWith('/')) {
        const urlObj = new URL(url);
        location = `${urlObj.protocol}//${urlObj.host}${location}`;
      }
      
      // If it's still a short link, follow it
      if (isShortLink(location)) {
        return await followRedirect(location, depth + 1);
      }
      
      console.log(`Resolved at depth ${depth}: ${url} -> ${location.substring(0, 100)}...`);
      return location;
    }
    
    // If we got here and status is a redirect (3xx), try to read from the body
    if (response.status >= 300 && response.status < 400) {
      console.log(`Got ${response.status} but no location header for: ${url}`);
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
