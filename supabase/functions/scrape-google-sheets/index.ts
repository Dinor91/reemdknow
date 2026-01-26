import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Check if URL is a short link that needs following
function isShortLink(url: string): boolean {
  const shortLinkDomains = [
    's.click.aliexpress.com',
    'a.aliexpress.com',
    's.lazada.co.th',
    'c.lazada.co.th',
  ];
  return shortLinkDomains.some(domain => url.includes(domain));
}

// Follow a redirect to get the final URL (with retry)
async function followRedirect(url: string, depth = 0): Promise<string | null> {
  if (depth > 5) return null; // Prevent infinite loops
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
    });
    
    const location = response.headers.get('location');
    if (location) {
      // If it's still a short link or redirect, follow it
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

// Extract AliExpress links from content
function extractAliExpressLinks(content: string): string[] {
  const patterns = [
    /https?:\/\/(?:www\.|he\.|m\.)?aliexpress\.com\/item\/\d+\.html[^\s"'<>]*/gi,
    /https?:\/\/(?:www\.|he\.|m\.)?aliexpress\.com\/i\/\d+\.html[^\s"'<>]*/gi,
    /https?:\/\/s\.click\.aliexpress\.com\/e\/[^\s"'<>]+/gi,
    /https?:\/\/a\.aliexpress\.com\/[^\s"'<>]+/gi,
    /https?:\/\/aliexpress\.com\/[^\s"'<>]*item[^\s"'<>]*/gi,
  ];
  
  const foundLinks = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanUrl = match.replace(/[,.\s!?)'"<>]+$/, '');
        foundLinks.add(cleanUrl);
      });
    }
  }
  
  return Array.from(foundLinks);
}

// Extract Lazada links from content
function extractLazadaLinks(content: string): string[] {
  const patterns = [
    /https?:\/\/(?:www\.)?lazada\.co\.th\/products\/[^\s"'<>]+/gi,
    /https?:\/\/s\.lazada\.co\.th\/[^\s"'<>]+/gi,
    /https?:\/\/(?:www\.)?lazada\.co\.th\/[^\s"'<>]*i\d+[^\s"'<>]*/gi,
    /https?:\/\/c\.lazada\.co\.th\/[^\s"'<>]+/gi,
  ];
  
  const foundLinks = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanUrl = match.replace(/[,.\s!?)'"<>]+$/, '');
        foundLinks.add(cleanUrl);
      });
    }
  }
  
  return Array.from(foundLinks);
}

// Extract product ID from AliExpress URL
function extractAliExpressProductId(url: string): string | null {
  const patterns = [
    /\/item\/(\d+)\.html/i,
    /\/i\/(\d+)\.html/i,
    /productId[=:](\d+)/i,
    /\/(\d{10,})\.html/i,
    /item\/(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract product ID from Lazada URL
function extractLazadaProductId(url: string): string | null {
  const patterns = [
    /-i(\d+)-s/i,
    /-i(\d+)\.html/i,
    /itemId[=:](\d+)/i,
    /-i(\d+)(?:\?|$|\.)/i,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
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

    const { url, platform } = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate it's a Google Sheets URL
    if (!url.includes('docs.google.com/spreadsheets')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Google Sheets URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Scraping Google Sheets URL:', url)
    console.log('Platform:', platform)

    const isThailand = platform === 'thailand';
    const extractLinks = isThailand ? extractLazadaLinks : extractAliExpressLinks;
    const extractProductId = isThailand ? extractLazadaProductId : extractAliExpressProductId;
    const platformName = isThailand ? 'Lazada' : 'AliExpress';

    // Convert share URL to published HTML URL for better scraping
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;
    
    if (!sheetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract Sheet ID from URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try multiple URLs for better coverage
    const urlsToTry = [
      url,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:html`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=html`,
    ];

    const allRawLinks = new Set<string>();

    for (const scrapeUrl of urlsToTry) {
      try {
        console.log('Trying URL:', scrapeUrl);
        
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: scrapeUrl,
            formats: ['html', 'markdown', 'links'],
            waitFor: 5000,
          }),
        });

        if (!scrapeResponse.ok) {
          console.log('Firecrawl response not ok for:', scrapeUrl);
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        
        // Extract from HTML
        const html = scrapeData.data?.html || scrapeData.html || '';
        extractLinks(html).forEach(link => allRawLinks.add(link));
        
        // Extract from markdown
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
        extractLinks(markdown).forEach(link => allRawLinks.add(link));
        
        // Extract from links array
        const linksArray = scrapeData.data?.links || scrapeData.links || [];
        for (const link of linksArray) {
          if (isThailand) {
            if (link.includes('lazada')) allRawLinks.add(link);
          } else {
            if (link.includes('aliexpress') || link.includes('s.click')) allRawLinks.add(link);
          }
        }
        
        console.log(`Found ${allRawLinks.size} raw links so far from ${scrapeUrl}`);
        
        if (allRawLinks.size > 0) break;
      } catch (e) {
        console.log('Error scraping URL:', scrapeUrl, e);
        continue;
      }
    }

    console.log(`Total raw links found: ${allRawLinks.size}`);

    // Separate direct links (with product ID) and short links (need resolution)
    const directLinks: string[] = [];
    const shortLinks: string[] = [];

    for (const link of allRawLinks) {
      if (extractProductId(link)) {
        directLinks.push(link);
      } else if (isShortLink(link)) {
        shortLinks.push(link);
      }
    }

    console.log(`Direct links: ${directLinks.length}, Short links to resolve: ${shortLinks.length}`);

    // Resolve short links in batches
    const resolvedLinks: string[] = [];
    const batchSize = 5;
    
    for (let i = 0; i < shortLinks.length; i += batchSize) {
      const batch = shortLinks.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (shortLink) => {
        const resolved = await followRedirect(shortLink);
        if (resolved && extractProductId(resolved)) {
          console.log(`Resolved: ${shortLink} -> ${resolved}`);
          return resolved;
        }
        return null;
      }));
      
      for (const result of results) {
        if (result) resolvedLinks.push(result);
      }
      
      // Small delay between batches
      if (i + batchSize < shortLinks.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Combine all valid links (deduplicated by product ID)
    const seenProductIds = new Set<string>();
    const finalLinks: string[] = [];
    
    for (const link of [...directLinks, ...resolvedLinks]) {
      const productId = extractProductId(link);
      if (productId && !seenProductIds.has(productId)) {
        seenProductIds.add(productId);
        finalLinks.push(link);
      }
    }

    console.log(`Found ${finalLinks.length} unique ${platformName} product links`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        linksFound: finalLinks.length,
        shortLinksResolved: resolvedLinks.length,
        links: finalLinks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scrape-google-sheets:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
