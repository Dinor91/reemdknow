import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get products that need translation (where name_hebrew contains non-Hebrew characters)
    // Using raw SQL filter to find names starting with non-Hebrew characters
    const { data: products, error: fetchError } = await supabase
      .from("category_products")
      .select("id, name_hebrew, name_english")
      .eq("category", "כללי")
      .or("name_hebrew.ilike.[%,name_hebrew.ilike.(%,name_hebrew.like.A%,name_hebrew.like.B%,name_hebrew.like.C%,name_hebrew.like.D%,name_hebrew.like.E%,name_hebrew.like.F%,name_hebrew.like.G%,name_hebrew.like.H%,name_hebrew.like.I%,name_hebrew.like.J%,name_hebrew.like.K%,name_hebrew.like.L%,name_hebrew.like.M%,name_hebrew.like.N%,name_hebrew.like.O%,name_hebrew.like.P%,name_hebrew.like.Q%,name_hebrew.like.R%,name_hebrew.like.S%,name_hebrew.like.T%,name_hebrew.like.U%,name_hebrew.like.V%,name_hebrew.like.W%,name_hebrew.like.X%,name_hebrew.like.Y%,name_hebrew.like.Z%")
      .limit(50); // Process 50 at a time to avoid timeout

    const productsNeedingTranslation = products || [];

    if (fetchError) throw fetchError;

    if (!productsNeedingTranslation || productsNeedingTranslation.length === 0) {
      return new Response(
        JSON.stringify({ message: "No products to translate", translated: 0, checked: products?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare batch translation request
    const productNames = productsNeedingTranslation.map(p => p.name_english || p.name_hebrew).join("\n---\n");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate product names from English/Thai to Hebrew.
Rules:
- Keep translations SHORT (2-3 words maximum)
- Focus on the main product type only
- No brand names, no technical specs
- Return ONLY the translations, one per line, in the same order as input
- Separate each translation with ---

Examples:
"ZADA Shimano 21NESSA XR Fishing Rod" → "חכת דיג"
"High Quality 100% Pure Silver Headphone Cable" → "כבל אוזניות"
"Cool Electric Car Two-wheeled" → "אופנוע חשמלי"
"Giffareen Bioline Air Purifier" → "מטהר אוויר"`
          },
          {
            role: "user",
            content: `Translate these product names to Hebrew (2-3 words each):\n\n${productNames}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const translatedText = aiData.choices[0]?.message?.content || "";
    const translations = translatedText.split("---").map((t: string) => t.trim()).filter((t: string) => t);

    // Update products with translations
    let updatedCount = 0;
    for (let i = 0; i < productsNeedingTranslation.length && i < translations.length; i++) {
      const translation = translations[i];
      if (translation && translation.length > 0) {
        const { error: updateError } = await supabase
          .from("category_products")
          .update({ 
            name_hebrew: translation,
            updated_at: new Date().toISOString()
          })
          .eq("id", productsNeedingTranslation[i].id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Translation complete", 
        translated: updatedCount,
        needingTranslation: productsNeedingTranslation.length,
        totalChecked: products?.length || 0,
        remaining: productsNeedingTranslation.length >= 50 ? "Run again to translate more" : "All done"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
