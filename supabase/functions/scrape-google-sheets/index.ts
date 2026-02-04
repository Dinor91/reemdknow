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

// Follow a redirect to get the final URL (with retry and better headers)
async function followRedirect(url: string, depth = 0): Promise<string | null> {
  if (depth > 10) return null; // Prevent infinite loops
  
  // Decode URL-encoded URLs before processing
  let decodedUrl = url;
  try {
    // Keep decoding until the URL doesn't change (handles double-encoding)
    while (decodedUrl.includes('%3A') || decodedUrl.includes('%2F')) {
      const newDecoded = decodeURIComponent(decodedUrl);
      if (newDecoded === decodedUrl) break;
      decodedUrl = newDecoded;
    }
  } catch (e) {
    // If decoding fails, use original URL
    console.log('URL decode failed, using original:', url.substring(0, 60));
  }
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };
  
  try {
    // Use the decoded URL for fetching
    const fetchUrl = decodedUrl;
    // Try GET with manual redirect first (more reliable for affiliate links)
    const response = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'manual',
      headers,
    });
    
    let location = response.headers.get('location');
    
    // Some servers use lowercase
    if (!location) {
      location = response.headers.get('Location');
    }
    
    if (location) {
      // Handle relative URLs
      if (location.startsWith('/')) {
        const urlObj = new URL(url);
        location = `${urlObj.protocol}//${urlObj.host}${location}`;
      }
      
      console.log(`Redirect ${depth}: ${url.substring(0, 50)}... -> ${location.substring(0, 80)}...`);
      
      // If it's still a short link or redirect, follow it
      if (isShortLink(location) || location.includes('redirect') || location.includes('click')) {
        return await followRedirect(location, depth + 1);
      }
      return location;
    }
    
    // Check for meta refresh or JavaScript redirect in HTML
    if (response.headers.get('content-type')?.includes('text/html')) {
      const html = await response.text();
      
      // Look for meta refresh
      const metaMatch = html.match(/meta[^>]*http-equiv=["']?refresh["']?[^>]*url=["']?([^"'\s>]+)/i);
      if (metaMatch) {
        let redirectUrl = metaMatch[1];
        if (redirectUrl.startsWith('/')) {
          const urlObj = new URL(url);
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        console.log(`Meta refresh found: ${redirectUrl.substring(0, 80)}...`);
        return await followRedirect(redirectUrl, depth + 1);
      }
      
      // Look for lazada product URL in the HTML itself
      const lazadaMatch = html.match(/https?:\/\/(?:www\.)?lazada\.co\.th\/products\/[^\s"'<>]+/i);
      if (lazadaMatch) {
        console.log(`Found Lazada URL in HTML: ${lazadaMatch[0].substring(0, 80)}...`);
        return lazadaMatch[0];
      }
      
      // Look for window.location redirect
      const jsMatch = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
      if (jsMatch) {
        console.log(`JS redirect found: ${jsMatch[1].substring(0, 80)}...`);
        return await followRedirect(jsMatch[1], depth + 1);
      }
    }
    
    // If we got a 200 response, return the current URL (might be the final destination)
    if (response.status === 200 && decodedUrl.includes('lazada.co.th/products')) {
      return decodedUrl;
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

// Extract Lazada links from content - more aggressive patterns
function extractLazadaLinks(content: string): string[] {
  const patterns = [
    // Direct product links
    /https?:\/\/(?:www\.)?lazada\.co\.th\/products\/[^\s"'<>\]]+/gi,
    // Short links
    /https?:\/\/s\.lazada\.co\.th\/[^\s"'<>\]]+/gi,
    // Product ID patterns
    /https?:\/\/(?:www\.)?lazada\.co\.th\/[^\s"'<>\]]*i\d+[^\s"'<>\]]*/gi,
    // Affiliate short links
    /https?:\/\/c\.lazada\.co\.th\/[^\s"'<>\]]+/gi,
    // Generic lazada.co.th links (catch-all)
    /https?:\/\/[a-z]*\.?lazada\.co\.th[^\s"'<>\]]+/gi,
  ];
  
  const foundLinks = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean trailing punctuation and special chars
        let cleanUrl = match.replace(/[,.\s!?)'"<>\]\\]+$/, '');
        // Remove HTML entities that might be attached
        cleanUrl = cleanUrl.replace(/&amp;/g, '&').replace(/&quot;/g, '');
        if (cleanUrl.includes('lazada.co.th')) {
          foundLinks.add(cleanUrl);
        }
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

// Extract product ID from Lazada URL - more patterns
function extractLazadaProductId(url: string): string | null {
  const patterns = [
    /-i(\d+)-s/i,
    /-i(\d+)\.html/i,
    /itemId[=:](\d+)/i,
    /-i(\d+)(?:\?|$|\.)/i,
    /\/products\/[^/]*-i(\d+)/i,
    /item_id=(\d+)/i,
    /[\?&]id=(\d+)/i,
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

    // Try multiple URL formats for better coverage - including CSV which preserves hyperlinks
    const urlsToTry = [
      // CSV format often exposes hyperlink URLs directly
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
      // TSV format also good for extracting links
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv`,
      // Original URL
      url,
      // HTML export
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=html`,
      // Visualization HTML
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:html`,
    ];

    const allRawLinks = new Set<string>();

    // First, try direct fetch for CSV/TSV formats (no Firecrawl needed)
    for (const exportUrl of urlsToTry.slice(0, 2)) {
      try {
        console.log('Trying direct fetch for:', exportUrl);
        const directResponse = await fetch(exportUrl);
        if (directResponse.ok) {
          const textContent = await directResponse.text();
          console.log('Got text content, length:', textContent.length);
          
          // Extract links from the CSV/TSV content
          extractLinks(textContent).forEach(link => allRawLinks.add(link));
          
          // Also look for any URL-like patterns in the raw text
          const urlPattern = /https?:\/\/[^\s,"\t\n]+/gi;
          const rawMatches = textContent.match(urlPattern) || [];
          for (const match of rawMatches) {
            const cleanMatch = match.replace(/[,"\t]+$/, '');
            if (isThailand && cleanMatch.includes('lazada')) {
              allRawLinks.add(cleanMatch);
            } else if (!isThailand && (cleanMatch.includes('aliexpress') || cleanMatch.includes('s.click'))) {
              allRawLinks.add(cleanMatch);
            }
          }
          
          console.log(`Found ${allRawLinks.size} raw links from direct fetch of ${exportUrl}`);
        }
      } catch (e) {
        console.log('Direct fetch failed for:', exportUrl, e);
      }
    }

    // If we found links from direct fetch, skip Firecrawl
    if (allRawLinks.size === 0) {
      // Fall back to Firecrawl for HTML/JavaScript rendered content
      for (const scrapeUrl of urlsToTry.slice(2)) {
        try {
          console.log('Trying Firecrawl for:', scrapeUrl);
          
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: scrapeUrl,
              formats: ['html', 'markdown', 'links', 'rawHtml'],
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
          
          // Extract from raw HTML (might have more data)
          const rawHtml = scrapeData.data?.rawHtml || '';
          extractLinks(rawHtml).forEach(link => allRawLinks.add(link));
          
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
          
          console.log(`Found ${allRawLinks.size} raw links from Firecrawl for ${scrapeUrl}`);
          
          if (allRawLinks.size > 0) break;
        } catch (e) {
          console.log('Error scraping URL:', scrapeUrl, e);
          continue;
        }
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

    // Resolve short links in batches with better logging
    const resolvedLinks: string[] = [];
    const batchSize = 5;
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < shortLinks.length; i += batchSize) {
      const batch = shortLinks.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async (shortLink) => {
        const resolved = await followRedirect(shortLink);
        if (resolved) {
          const productId = extractProductId(resolved);
          if (productId) {
            console.log(`✓ Resolved: ${shortLink.substring(0, 40)}... -> ID: ${productId}`);
            successCount++;
            return resolved;
          } else {
            console.log(`✗ No product ID in resolved URL: ${resolved.substring(0, 80)}...`);
            failCount++;
          }
        } else {
          console.log(`✗ Failed to resolve: ${shortLink.substring(0, 50)}...`);
          failCount++;
        }
        return null;
      }));
      
      for (const result of results) {
        if (result) resolvedLinks.push(result);
      }
      
      // Small delay between batches
      if (i + batchSize < shortLinks.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`Resolution complete: ${successCount} success, ${failCount} failed`);

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
