import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a client with the user's token to verify identity
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await userSupabase.auth.getClaims(token)
    
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requesterId = claims.claims.sub

    const { action, target_user_id, target_email } = await req.json()

    console.log('Admin assignment request:', { action, target_user_id, target_email, requesterId })

    // Check if requester is already an admin (for subsequent admin assignments)
    const { data: requesterRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requesterId)
      .eq('role', 'admin')
      .single()

    // Check if any admin exists
    const { data: existingAdmins, error: adminsError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')

    const hasExistingAdmins = existingAdmins && existingAdmins.length > 0

    // First admin bootstrap - allow if no admins exist
    if (action === 'bootstrap_first_admin') {
      if (hasExistingAdmins) {
        return new Response(
          JSON.stringify({ error: 'Admin already exists. Use assign_admin action.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Assign admin role to the requester
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', requesterId)
        .select()
        .single()

      if (roleError) {
        console.error('Error assigning admin role:', roleError)
        throw roleError
      }

      console.log('First admin bootstrapped:', requesterId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'You are now the platform admin',
          user_id: requesterId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Assign admin to another user (requires existing admin)
    if (action === 'assign_admin') {
      if (!requesterRole) {
        return new Response(
          JSON.stringify({ error: 'Only admins can assign admin roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let targetUserId = target_user_id

      // If email provided, lookup user ID
      if (target_email && !target_user_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', target_email)
          .single()

        if (profileError || !profile) {
          return new Response(
            JSON.stringify({ error: 'User not found with that email' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        targetUserId = profile.user_id
      }

      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: 'target_user_id or target_email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update role to admin
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', targetUserId)
        .select()
        .single()

      if (roleError) {
        console.error('Error assigning admin role:', roleError)
        throw roleError
      }

      console.log('Admin role assigned to:', targetUserId)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admin role assigned successfully',
          user_id: targetUserId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove admin role
    if (action === 'remove_admin') {
      if (!requesterRole) {
        return new Response(
          JSON.stringify({ error: 'Only admins can remove admin roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (target_user_id === requesterId) {
        return new Response(
          JSON.stringify({ error: 'Cannot remove your own admin role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'subscriber' })
        .eq('user_id', target_user_id)

      if (roleError) throw roleError

      return new Response(
        JSON.stringify({ success: true, message: 'Admin role removed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin status
    if (action === 'check_admin_exists') {
      return new Response(
        JSON.stringify({ 
          admin_exists: hasExistingAdmins,
          admin_count: existingAdmins?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin assignment error:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
