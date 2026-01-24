import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date()
    const todayMonth = today.getMonth() + 1 // 1-indexed
    const todayDay = today.getDate()
    const currentYear = today.getFullYear()
    const todayStr = today.toISOString().split('T')[0]

    console.log(`[check-birthdays-anniversaries] Running for ${todayStr}`)

    // Fetch all active clients with their trainers
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, birth_date, training_start_date, created_at, user_id')
      .eq('is_archived', false)
      .not('user_id', 'is', null)

    if (clientsError) {
      console.error('[check-birthdays-anniversaries] Error fetching clients:', clientsError)
      throw clientsError
    }

    console.log(`[check-birthdays-anniversaries] Found ${clients?.length || 0} active clients`)

    const notifications: Array<{
      user_id: string
      client_id: string
      type: string
      title: string
      message: string
    }> = []

    for (const client of clients || []) {
      // Check birthday
      if (client.birth_date) {
        const birthDate = new Date(client.birth_date)
        const birthMonth = birthDate.getMonth() + 1
        const birthDay = birthDate.getDate()

        if (birthMonth === todayMonth && birthDay === todayDay) {
          const age = currentYear - birthDate.getFullYear()
          
          // Check if notification already exists today
          const { data: existingBirthday } = await supabase
            .from('notifications')
            .select('id')
            .eq('client_id', client.id)
            .eq('type', 'birthday')
            .gte('created_at', `${todayStr}T00:00:00`)
            .maybeSingle()

          if (!existingBirthday) {
            notifications.push({
              user_id: client.user_id,
              client_id: client.id,
              type: 'birthday',
              title: `🎂 Narozeniny - ${client.name}`,
              message: `${client.name} dnes slaví ${age}. narozeniny!`,
            })
            console.log(`[check-birthdays-anniversaries] Birthday notification for ${client.name}`)
          }
        }
      }

      // Check anniversary (using training_start_date or created_at)
      const startDateStr = client.training_start_date || client.created_at
      if (startDateStr) {
        const startDate = new Date(startDateStr)
        const startMonth = startDate.getMonth() + 1
        const startDay = startDate.getDate()
        const years = currentYear - startDate.getFullYear()

        if (startMonth === todayMonth && startDay === todayDay && years >= 1) {
          // Check if notification already exists today
          const { data: existingAnniversary } = await supabase
            .from('notifications')
            .select('id')
            .eq('client_id', client.id)
            .eq('type', 'client_anniversary')
            .gte('created_at', `${todayStr}T00:00:00`)
            .maybeSingle()

          if (!existingAnniversary) {
            const yearWord = years === 1 ? 'rok' : years < 5 ? 'roky' : 'let'
            notifications.push({
              user_id: client.user_id,
              client_id: client.id,
              type: 'client_anniversary',
              title: `🎉 ${years}. výročí`,
              message: `Klient ${client.name} je s vámi již ${years} ${yearWord}!`,
            })
            console.log(`[check-birthdays-anniversaries] Anniversary notification for ${client.name} (${years} years)`)
          }
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (insertError) {
        console.error('[check-birthdays-anniversaries] Error inserting notifications:', insertError)
        throw insertError
      }

      console.log(`[check-birthdays-anniversaries] Created ${notifications.length} notifications`)
    } else {
      console.log('[check-birthdays-anniversaries] No notifications to create today')
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        notificationsCreated: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[check-birthdays-anniversaries] Error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
