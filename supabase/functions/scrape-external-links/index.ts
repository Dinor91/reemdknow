import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Extract AliExpress product IDs from various URL formats
function extractProductId(url: string): string | null {
  // Pattern 1: /item/1234567890.html
  const pattern1 = /\/item\/(\d+)\.html/i;
  // Pattern 2: /i/1234567890.html
  const pattern2 = /\/i\/(\d+)\.html/i;
  // Pattern 3: productId=1234567890
  const pattern3 = /productId[=:](\d+)/i;
  // Pattern 4: /1234567890.html (just the ID)
  const pattern4 = /\/(\d{10,})\.html/i;
  // Pattern 5: item/1234567890 without .html
  const pattern5 = /item\/(\d+)/i;
  
  let match = url.match(pattern1) || 
              url.match(pattern2) || 
              url.match(pattern3) || 
              url.match(pattern4) ||
              url.match(pattern5);
  
  return match ? match[1] : null;
}

// Find all AliExpress links in text/html
function findAliExpressLinks(content: string): string[] {
  const urlPatterns = [
    // Direct AliExpress links
    /https?:\/\/(?:www\.|he\.|[\w]+\.)?aliexpress\.com\/item\/\d+\.html[^\s"'<>]*/gi,
    // Short links
    /https?:\/\/s\.click\.aliexpress\.com\/e\/[^\s"'<>]+/gi,
    // Alternative formats
    /https?:\/\/(?:www\.)?aliexpress\.(?:com|ru)\/[^\s"'<>]*item[^\s"'<>]*/gi,
  ];

  const links = new Set<string>();
  
  for (const pattern of urlPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Clean up the URL
        const cleanUrl = match.replace(/['">\]\)]+$/, '');
        links.add(cleanUrl);
      }
    }
  }

  return Array.from(links);
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
        formats: ['html', 'links'],
        waitFor: 5000, // Wait for JS to load
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

    // Collect all AliExpress links from various sources
    const allLinks = new Set<string>()

    // 1. From extracted links array
    const linksArray = scrapeData.data?.links || scrapeData.links || []
    for (const link of linksArray) {
      if (link.includes('aliexpress') || link.includes('s.click')) {
        allLinks.add(link)
      }
    }

    // 2. From HTML content
    const html = scrapeData.data?.html || scrapeData.html || ''
    const htmlLinks = findAliExpressLinks(html)
    for (const link of htmlLinks) {
      allLinks.add(link)
    }

    // 3. From markdown content if available
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || ''
    const markdownLinks = findAliExpressLinks(markdown)
    for (const link of markdownLinks) {
      allLinks.add(link)
    }

    // Convert to array and extract product IDs
    const uniqueLinks = Array.from(allLinks)
    const results = uniqueLinks.map(link => ({
      originalUrl: link,
      productId: extractProductId(link),
    }))

    // Filter to only those with valid product IDs
    const validResults = results.filter(r => r.productId !== null)

    console.log(`Found ${validResults.length} valid AliExpress product links`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalLinksFound: uniqueLinks.length,
        validProductLinks: validResults.length,
        links: validResults
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
