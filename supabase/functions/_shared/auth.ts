import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

export interface AuthResult {
  isAdmin: boolean;
  userId: string | null;
  error: string | null;
}

export async function verifyAdminAuth(authHeader: string | null): Promise<AuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false, userId: null, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  // Verify the token and get claims
  const { data: claimsData, error: claimsError } = await supabaseClient.auth.getUser(token);
  
  if (claimsError || !claimsData?.user) {
    return { isAdmin: false, userId: null, error: 'Invalid auth token' };
  }

  const userId = claimsData.user.id;

  // Check if user has admin role
  const { data: roleData, error: roleError } = await supabaseClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !roleData) {
    return { isAdmin: false, userId, error: 'Admin access required' };
  }

  return { isAdmin: true, userId, error: null };
}

export function createUnauthorizedResponse(message: string, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

export function createForbiddenResponse(message: string, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
