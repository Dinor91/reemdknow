import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get products without images
    const { data: products, error: fetchError } = await supabase
      .from('israel_editor_products')
      .select('id, tracking_link, product_name_hebrew')
      .is('image_url', null)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No products need images', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${products.length} products without images`);

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const product of products) {
      results.processed++;
      
      try {
        console.log(`Scraping: ${product.product_name_hebrew}`);
        
        // Use Firecrawl to scrape the AliExpress page
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: product.tracking_link,
            formats: ['html'],
            waitFor: 3000, // Wait for dynamic content
          }),
        });

        const scrapeData = await scrapeResponse.json();

        if (!scrapeResponse.ok || !scrapeData.success) {
          console.error(`Firecrawl error for ${product.id}:`, scrapeData);
          results.failed++;
          results.errors.push(`${product.product_name_hebrew}: ${scrapeData.error || 'Scrape failed'}`);
          continue;
        }

        const html = scrapeData.data?.html || scrapeData.html || '';
        
        // Extract product image from AliExpress HTML
        // AliExpress typically uses og:image meta tag or specific image patterns
        let imageUrl = '';

        // Try og:image first
        const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        if (ogImageMatch) {
          imageUrl = ogImageMatch[1];
        }

        // Try AliExpress specific image patterns
        if (!imageUrl) {
          const aliImageMatch = html.match(/https:\/\/[^"'\s]*alicdn\.com\/[^"'\s]*\.(jpg|jpeg|png|webp)/i);
          if (aliImageMatch) {
            imageUrl = aliImageMatch[0];
          }
        }

        // Try generic product image pattern
        if (!imageUrl) {
          const imgMatch = html.match(/<img[^>]*class=["'][^"']*product[^"']*["'][^>]*src=["']([^"']+)["']/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        if (!imageUrl) {
          console.log(`No image found for: ${product.product_name_hebrew}`);
          results.failed++;
          results.errors.push(`${product.product_name_hebrew}: No image found in page`);
          continue;
        }

        // Clean up image URL (remove size parameters to get larger image)
        imageUrl = imageUrl.replace(/_\d+x\d+\./g, '.');
        
        console.log(`Found image: ${imageUrl}`);

        // Download the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          results.failed++;
          results.errors.push(`${product.product_name_hebrew}: Failed to download image`);
          continue;
        }

        const imageBlob = await imageResponse.blob();
        const fileName = `israel/${product.id}.jpg`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageBlob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${product.id}:`, uploadError);
          results.failed++;
          results.errors.push(`${product.product_name_hebrew}: ${uploadError.message}`);
          continue;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        // Update the product with the new image URL
        const { error: updateError } = await supabase
          .from('israel_editor_products')
          .update({ image_url: urlData.publicUrl })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Update error for ${product.id}:`, updateError);
          results.failed++;
          results.errors.push(`${product.product_name_hebrew}: ${updateError.message}`);
          continue;
        }

        console.log(`Success: ${product.product_name_hebrew}`);
        results.success++;

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing ${product.id}:`, error);
        results.failed++;
        results.errors.push(`${product.product_name_hebrew}: ${errorMessage}`);
      }
    }

    console.log('Scraping completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.processed} products`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
