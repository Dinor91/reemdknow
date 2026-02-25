import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { button_type, source, country } = await req.json();

    // Validate required fields
    if (!button_type || !source) {
      console.error('Missing required fields:', { button_type, source });
      return new Response(
        JSON.stringify({ error: 'button_type and source are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate button_type is one of the allowed values
    if (!['whatsapp', 'telegram', 'instagram', 'facebook', 'tiktok'].includes(button_type)) {
      console.error('Invalid button_type:', button_type);
      return new Response(
        JSON.stringify({ error: 'Invalid button_type. Must be whatsapp or telegram' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('button_clicks').insert({
      button_type,
      source,
      country: country || null,
    });

    if (error) {
      console.error('Error inserting click:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to track click' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Click tracked successfully:', { button_type, source, country });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});