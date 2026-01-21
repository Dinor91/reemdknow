import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Database not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch products without images from category_products (Thailand/Lazada)
    const { data: products, error: fetchError } = await supabase
      .from('category_products')
      .select('id, name_hebrew, affiliate_link, image_url')
      .eq('is_active', true)
      .or('image_url.is.null,image_url.eq.')
      .neq('category', 'כללי') // Skip "General" category - already has images from feed
      .limit(50);

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No products need image scraping', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${products.length} products without images`);

    let successCount = 0;
    let failCount = 0;
    const results: { id: string; name: string; success: boolean; error?: string }[] = [];

    for (const product of products) {
      try {
        console.log(`Processing: ${product.name_hebrew}`);

        if (!product.affiliate_link) {
          console.log(`No affiliate link for ${product.name_hebrew}`);
          results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'No affiliate link' });
          failCount++;
          continue;
        }

        // Use Firecrawl to scrape the product page with screenshot for reliable image extraction
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: product.affiliate_link,
            formats: ['html', 'screenshot'],
            onlyMainContent: false,
            waitFor: 5000, // Wait longer for redirects to complete
          }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          console.error(`Firecrawl error for ${product.name_hebrew}:`, errorText);
          results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'Scrape failed' });
          failCount++;
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const html = scrapeData.data?.html || scrapeData.html || '';
        const screenshot = scrapeData.data?.screenshot || scrapeData.screenshot;

        if (!html && !screenshot) {
          console.log(`No content for ${product.name_hebrew}`);
          results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'No content' });
          failCount++;
          continue;
        }

        // Extract image URL from HTML - Lazada patterns
        let imageUrl: string | null = null;

        // Try og:image first (most reliable)
        const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        if (ogImageMatch) {
          imageUrl = ogImageMatch[1];
          console.log(`Found og:image for ${product.name_hebrew}`);
        }

        // Try Lazada-specific image patterns
        if (!imageUrl) {
          const lazadaPatterns = [
            /https?:\/\/[^"'\s]*\.lazada\.[^"'\s]*\/[^"'\s]*\.(?:jpg|jpeg|png|webp)/gi,
            /https?:\/\/lzd-img-global[^"'\s]*\.(?:jpg|jpeg|png|webp)/gi,
            /https?:\/\/my-live[^"'\s]*\.slatic\.net[^"'\s]*\.(?:jpg|jpeg|png|webp)/gi,
            /https?:\/\/[^"'\s]*slatic\.net[^"'\s]*\.(?:jpg|jpeg|png|webp)/gi,
          ];

          for (const pattern of lazadaPatterns) {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
              // Filter out small images (thumbnails)
              const validImage = matches.find((url: string) => 
                !url.includes('_80x80') && 
                !url.includes('_60x60') && 
                !url.includes('_40x40') &&
                !url.includes('thumbnail')
              );
              if (validImage) {
                imageUrl = validImage;
                console.log(`Found Lazada image for ${product.name_hebrew}`);
                break;
              }
            }
          }
        }

        // If no image URL found from HTML, use screenshot as fallback
        if (!imageUrl && screenshot) {
          try {
            console.log(`Using screenshot as image for ${product.name_hebrew}`);
            
            // Screenshot can be a URL or base64 - handle both cases
            let imageBlob: Blob;
            
            if (screenshot.startsWith('http')) {
              // It's a URL - download it
              const screenshotResponse = await fetch(screenshot);
              if (!screenshotResponse.ok) {
                throw new Error('Failed to download screenshot');
              }
              imageBlob = await screenshotResponse.blob();
            } else {
              // It's base64 - decode it
              const base64Data = screenshot.replace(/^data:image\/[^;]+;base64,/, '');
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              imageBlob = new Blob([bytes], { type: 'image/png' });
            }
            
            const fileName = `thailand/${product.id}.png`;
            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(fileName, imageBlob, {
                contentType: 'image/png',
                upsert: true,
              });

            if (uploadError) {
              console.error(`Screenshot upload error for ${product.name_hebrew}:`, uploadError);
              results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'Screenshot upload failed' });
              failCount++;
              continue;
            }

            const { data: publicUrlData } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);

            const { error: updateError } = await supabase
              .from('category_products')
              .update({ image_url: publicUrlData.publicUrl })
              .eq('id', product.id);

            if (updateError) {
              console.error(`Update error for ${product.name_hebrew}:`, updateError);
              results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'Database update failed' });
              failCount++;
              continue;
            }

            console.log(`✅ Used screenshot for: ${product.name_hebrew}`);
            results.push({ id: product.id, name: product.name_hebrew, success: true });
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } catch (screenshotError) {
            console.error(`Screenshot processing error for ${product.name_hebrew}:`, screenshotError);
            results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'Screenshot processing failed' });
            failCount++;
            continue;
          }
        }

        if (!imageUrl) {
          console.log(`No image found for ${product.name_hebrew}`);
          results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'No image found' });
          failCount++;
          continue;
        }

        // Clean up URL
        imageUrl = imageUrl.replace(/&amp;/g, '&');

        // Download the image
        console.log(`Downloading image for ${product.name_hebrew}: ${imageUrl.substring(0, 100)}...`);
        const imageResponse = await fetch(imageUrl);
        
        if (!imageResponse.ok) {
          console.error(`Failed to download image for ${product.name_hebrew}`);
          results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'Image download failed' });
          failCount++;
          continue;
        }

        const imageBlob = await imageResponse.blob();
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        
        // Upload to Supabase Storage
        const fileName = `thailand/${product.id}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageBlob, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${product.name_hebrew}:`, uploadError);
          results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'Upload failed' });
          failCount++;
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        // Update product with new image URL
        const { error: updateError } = await supabase
          .from('category_products')
          .update({ image_url: publicUrlData.publicUrl })
          .eq('id', product.id);

        if (updateError) {
          console.error(`Update error for ${product.name_hebrew}:`, updateError);
          results.push({ id: product.id, name: product.name_hebrew, success: false, error: 'Database update failed' });
          failCount++;
          continue;
        }

        console.log(`✅ Successfully processed: ${product.name_hebrew}`);
        results.push({ id: product.id, name: product.name_hebrew, success: true });
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (productError) {
        console.error(`Error processing ${product.name_hebrew}:`, productError);
        results.push({ 
          id: product.id, 
          name: product.name_hebrew, 
          success: false, 
          error: productError instanceof Error ? productError.message : 'Unknown error' 
        });
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${products.length} products`,
        successCount,
        failCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-lazada-images:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
