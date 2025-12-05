import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the current time
    const now = new Date()
    
    // Calculate 12 hours ago
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)
    
    console.log('Checking for incomplete trainings before:', twelveHoursAgo.toISOString())

    // Find all scheduled trainings that:
    // 1. Have a date older than 12 hours ago
    // 2. Are still in 'scheduled' status (not completed or canceled)
    const { data: incompleteSessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select(`
        id,
        client_id,
        date,
        user_id,
        clients (name)
      `)
      .eq('status', 'scheduled')
      .lt('date', twelveHoursAgo.toISOString())

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      throw sessionsError
    }

    console.log(`Found ${incompleteSessions?.length || 0} incomplete trainings`)

    if (!incompleteSessions || incompleteSessions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No incomplete trainings found',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For each incomplete session, check if a notification already exists
    const notificationsCreated: string[] = []
    
    for (const session of incompleteSessions) {
      // Check if notification already exists for this training
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'incomplete_training')
        .eq('client_id', session.client_id)
        .like('message', `%${session.id}%`)
        .maybeSingle()

      if (existingNotification) {
        console.log(`Notification already exists for session ${session.id}`)
        continue
      }

      // Create notification
      const clientName = (session.clients as any)?.name || 'Klient'
      const sessionDate = new Date(session.date)
      const formattedDate = sessionDate.toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: session.user_id,
          client_id: session.client_id,
          type: 'incomplete_training',
          title: 'Nedokončený trénink',
          message: `Trénink s klientem ${clientName} (${formattedDate}) nebyl dokončen. ID: ${session.id}`,
          is_read: false
        })

      if (notificationError) {
        console.error(`Error creating notification for session ${session.id}:`, notificationError)
      } else {
        notificationsCreated.push(session.id)
        console.log(`Created notification for session ${session.id}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${notificationsCreated.length} notifications`,
        count: notificationsCreated.length,
        sessionIds: notificationsCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in check-incomplete-trainings:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
