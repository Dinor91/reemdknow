import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Extract AliExpress product IDs from various URL formats
function extractAliExpressProductId(url: string): string | null {
  const pattern1 = /\/item\/(\d+)\.html/i;
  const pattern2 = /\/i\/(\d+)\.html/i;
  const pattern3 = /productId[=:](\d+)/i;
  const pattern4 = /\/(\d{10,})\.html/i;
  const pattern5 = /item\/(\d+)/i;
  
  let match = url.match(pattern1) || 
              url.match(pattern2) || 
              url.match(pattern3) || 
              url.match(pattern4) ||
              url.match(pattern5);
  
  return match ? match[1] : null;
}

// Extract Lazada product IDs from various URL formats
function extractLazadaProductId(url: string): string | null {
  const pattern1 = /-i(\d+)-s/i;
  const pattern2 = /-i(\d+)\.html/i;
  const pattern3 = /itemId[=:](\d+)/i;
  const pattern4 = /-i(\d+)(?:\?|$|\.)/i;
  
  let match = url.match(pattern1) || 
              url.match(pattern2) || 
              url.match(pattern3) ||
              url.match(pattern4);
  
  return match ? match[1] : null;
}

// Find all links (any links) in text/html
function findAllLinks(content: string): string[] {
  const urlPattern = /https?:\/\/[^\s"'<>\]]+/gi;
  const matches = content.match(urlPattern) || [];
  return [...new Set(matches.map(m => m.replace(/['">\]\)]+$/, '')))];
}

// Check if URL is a short link that needs following
function isShortLink(url: string): boolean {
  const shortLinkDomains = [
    'beacons.ai',
    's.click.aliexpress.com',
    'a.aliexpress.com',
    's.lazada.co.th',
    'c.lazada.co.th',
    'bit.ly',
    'tinyurl.com',
    'linktr.ee',
    'stan.store',
  ];
  return shortLinkDomains.some(domain => url.includes(domain));
}

// Follow a redirect to get the final URL
async function followRedirect(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
    });
    
    // Check for redirect
    const location = response.headers.get('location');
    if (location) {
      // If it's another short link, follow it
      if (isShortLink(location) || location.includes('aliexpress')) {
        if (location.includes('aliexpress')) {
          return location;
        }
        // Follow one more level
        return await followRedirect(location);
      }
      return location;
    }
    
    // Try GET if HEAD didn't work
    const getResponse = await fetch(url, {
      redirect: 'manual',
    });
    const getLocation = getResponse.headers.get('location');
    return getLocation || null;
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
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')
    
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { url } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Scraping URL for AliExpress links:', url)

    // Use Firecrawl to scrape the page (with JavaScript rendering)
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['html', 'links', 'markdown'],
        waitFor: 5000,
      }),
    })

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text()
      console.error('Firecrawl error:', errorText)
      return new Response(
        JSON.stringify({ success: false, error: `Firecrawl error: ${scrapeResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const scrapeData = await scrapeResponse.json()
    console.log('Firecrawl response received')

    // Collect ALL links from the page
    const allLinks = new Set<string>()

    // 1. From extracted links array
    const linksArray = scrapeData.data?.links || scrapeData.links || []
    for (const link of linksArray) {
      allLinks.add(link)
    }

    // 2. From HTML content
    const html = scrapeData.data?.html || scrapeData.html || ''
    for (const link of findAllLinks(html)) {
      allLinks.add(link)
    }

    // 3. From markdown content
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || ''
    for (const link of findAllLinks(markdown)) {
      allLinks.add(link)
    }

    console.log(`Found ${allLinks.size} total links on page`)

    // Categorize links
    const directAliExpressLinks: string[] = []
    const shortLinksToFollow: string[] = []

    for (const link of allLinks) {
      if (link.includes('aliexpress.com') && extractProductId(link)) {
        directAliExpressLinks.push(link)
      } else if (link.includes('s.click.aliexpress.com')) {
        shortLinksToFollow.push(link)
      } else if (link.includes('beacons.ai/link/')) {
        shortLinksToFollow.push(link)
      }
    }

    console.log(`Direct AliExpress: ${directAliExpressLinks.length}, Short links to follow: ${shortLinksToFollow.length}`)

    // Follow short links to get AliExpress URLs
    const resolvedLinks: string[] = []
    
    // Process short links in batches
    const batchSize = 5
    for (let i = 0; i < shortLinksToFollow.length; i += batchSize) {
      const batch = shortLinksToFollow.slice(i, i + batchSize)
      const results = await Promise.all(batch.map(async (shortLink) => {
        const resolved = await followRedirect(shortLink)
        if (resolved && resolved.includes('aliexpress')) {
          console.log(`Resolved: ${shortLink} -> ${resolved}`)
          return resolved
        }
        return null
      }))
      
      for (const result of results) {
        if (result) resolvedLinks.push(result)
      }
      
      // Small delay between batches
      if (i + batchSize < shortLinksToFollow.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    // Combine all found AliExpress links
    const allAliExpressLinks = [...new Set([...directAliExpressLinks, ...resolvedLinks])]
    
    // Extract product IDs
    const results = allAliExpressLinks.map(link => ({
      originalUrl: link,
      productId: extractProductId(link),
    })).filter(r => r.productId !== null)

    console.log(`Found ${results.length} valid AliExpress product links`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalLinksFound: allLinks.size,
        shortLinksFollowed: shortLinksToFollow.length,
        validProductLinks: results.length,
        links: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scrape-external-links:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
