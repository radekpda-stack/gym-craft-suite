import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  notificationId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  notificationType: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    birthday: '🎂',
    client_anniversary: '🎉',
    personal_record: '🏆',
    low_credit: '💰',
    package_expiring: '📦',
    feedback_submitted: '📝',
    nutrition_inactive: '🥗',
    measurement_added: '📊',
    red_flag: '🚨',
    reminder: '⏰',
  };
  return icons[type] || '🔔';
}

function getNotificationColor(type: string): string {
  const colors: Record<string, string> = {
    birthday: '#ec4899',
    client_anniversary: '#8b5cf6',
    personal_record: '#f59e0b',
    low_credit: '#ef4444',
    package_expiring: '#f97316',
    feedback_submitted: '#3b82f6',
    nutrition_inactive: '#10b981',
    measurement_added: '#06b6d4',
    red_flag: '#dc2626',
    reminder: '#6366f1',
  };
  return colors[type] || '#6366f1';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      notificationId,
      recipientEmail, 
      recipientName, 
      subject,
      notificationType,
      title,
      message,
      actionUrl,
      actionLabel = 'Zobrazit v aplikaci',
    }: NotificationEmailRequest = await req.json();

    console.log(`[send-notification-email] Sending ${notificationType} email to ${recipientEmail}`);

    const icon = getNotificationIcon(notificationType);
    const accentColor = getNotificationColor(notificationType);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; 
      padding: 20px; 
      background-color: #f5f5f5; 
    }
    .container { 
      max-width: 560px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 16px; 
      overflow: hidden; 
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd); 
      padding: 32px; 
      text-align: center; 
    }
    .header-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .header h1 { 
      color: white; 
      margin: 0; 
      font-size: 22px; 
      font-weight: 600;
    }
    .content { 
      padding: 32px; 
    }
    .greeting {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .notification-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 12px;
    }
    .notification-message {
      color: #475569;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .button { 
      display: inline-block; 
      background: ${accentColor}; 
      color: white !important; 
      padding: 14px 28px; 
      border-radius: 10px; 
      text-decoration: none; 
      font-weight: 600; 
      font-size: 14px;
    }
    .button:hover { 
      opacity: 0.9; 
    }
    .footer { 
      text-align: center; 
      padding: 24px; 
      color: #94a3b8; 
      font-size: 12px; 
      border-top: 1px solid #e2e8f0; 
    }
    .footer a {
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">${icon}</div>
      <h1>${title}</h1>
    </div>
    <div class="content">
      <p class="greeting">Dobrý den, ${recipientName}!</p>
      <p class="notification-message">${message}</p>
      ${actionUrl ? `
      <p style="text-align: center;">
        <a href="${actionUrl}" class="button">${actionLabel}</a>
      </p>
      ` : ''}
    </div>
    <div class="footer">
      <p>Tento email byl odeslán automaticky z aplikace JustMove Asistent.</p>
      <p>Nastavení notifikací můžete změnit v <a href="${actionUrl || '#'}">aplikaci</a>.</p>
    </div>
  </div>
</body>
</html>
`;

    const emailResponse = await resend.emails.send({
      from: "JustMove <notifications@justmove.cz>",
      to: [recipientEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("[send-notification-email] Email sent:", emailResponse);

    // Mark notification as email_sent if notificationId provided
    if (notificationId) {
      await supabase
        .from('notifications')
        .update({ metadata: { email_sent_at: new Date().toISOString() } })
        .eq('id', notificationId);
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-notification-email] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
