import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Convert share URL to published HTML URL for better scraping
    // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit?usp=sharing
    // To: https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:html
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
      url, // Original URL
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:html`, // HTML export
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=html`, // Another HTML export format
    ];

    const allLinks = new Set<string>();
    const extractFunction = platform === 'thailand' ? extractLazadaLinks : extractAliExpressLinks;

    for (const scrapeUrl of urlsToTry) {
      try {
        console.log('Trying URL:', scrapeUrl);
        
        // Use Firecrawl to scrape the page
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
        const extractedFromHtml = extractFunction(html);
        extractedFromHtml.forEach(link => allLinks.add(link));
        
        // Extract from markdown
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
        const extractedFromMd = extractFunction(markdown);
        extractedFromMd.forEach(link => allLinks.add(link));
        
        // Extract from links array
        const linksArray = scrapeData.data?.links || scrapeData.links || [];
        for (const link of linksArray) {
          if (platform === 'thailand') {
            if (link.includes('lazada')) {
              allLinks.add(link);
            }
          } else {
            if (link.includes('aliexpress') || link.includes('s.click')) {
              allLinks.add(link);
            }
          }
        }
        
        console.log(`Found ${allLinks.size} links so far from ${scrapeUrl}`);
        
        // If we found links, we can stop
        if (allLinks.size > 0) {
          break;
        }
      } catch (e) {
        console.log('Error scraping URL:', scrapeUrl, e);
        continue;
      }
    }

    const platformName = platform === 'thailand' ? 'Lazada' : 'AliExpress';
    console.log(`Found ${allLinks.size} total ${platformName} links`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        linksFound: allLinks.size,
        links: Array.from(allLinks)
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
