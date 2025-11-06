import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GA4_MEASUREMENT_ID = Deno.env.get('GA4_MEASUREMENT_ID');
const GA4_API_SECRET = Deno.env.get('GA4_API_SECRET');

async function sendToGoogleAnalytics(conversionData: any) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    console.warn('GA4 credentials not configured, skipping analytics');
    return;
  }

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: conversionData.tracking_id || 'unknown',
          events: [
            {
              name: 'purchase',
              params: {
                transaction_id: conversionData.order_id,
                value: conversionData.order_amount,
                currency: 'THB',
                items: [
                  {
                    item_id: conversionData.product_id,
                    item_name: conversionData.product_name,
                    price: conversionData.commission_amount,
                  },
                ],
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error('Failed to send to GA4:', await response.text());
    } else {
      console.log('Successfully sent conversion to GA4');
    }
  } catch (error) {
    console.error('Error sending to GA4:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received webhook from Lazada');
    
    // Parse the incoming webhook data
    const webhookData = await req.json();
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract relevant fields from webhook
    // Lazada typically sends: order_id, transaction_id, sale_amount, commission, etc.
    const conversionData = {
      conversion_type: webhookData.event_type || 'order',
      order_id: webhookData.order_id || webhookData.transaction_id,
      product_id: webhookData.product_id,
      product_name: webhookData.product_name,
      commission_amount: webhookData.commission ? parseFloat(webhookData.commission) : null,
      order_amount: webhookData.sale_amount ? parseFloat(webhookData.sale_amount) : null,
      conversion_time: webhookData.conversion_time || new Date().toISOString(),
      tracking_id: webhookData.tracking_id || webhookData.aff_sub,
      raw_data: webhookData,
    };

    // Insert into database
    const { data, error } = await supabase
      .from('lazada_conversions')
      .insert(conversionData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store conversion', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Conversion stored successfully:', data.id);

    // Send to Google Analytics
    await sendToGoogleAnalytics(conversionData);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conversion tracked successfully',
        id: data.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});