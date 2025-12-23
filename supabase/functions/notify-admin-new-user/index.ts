import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAdminRequest {
  userEmail: string;
  userName?: string;
  registeredAt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userEmail, userName, registeredAt }: NotifyAdminRequest = await req.json();

    console.log(`Notifying admin about new user registration: ${userEmail}`);

    // Get admin emails from user_roles
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails from profiles
    const adminIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", adminIds);

    if (profileError || !adminProfiles) {
      console.error("Error fetching admin profiles:", profileError);
      throw new Error("Failed to fetch admin emails");
    }

    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean);

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ success: true, message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";
    const approvalUrl = `${appUrl}/admin/user-approvals`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nová registrace uživatele</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #d4ff00, #b8e600); padding: 24px; text-align: center; }
    .header h1 { color: #1a1a1a; margin: 0; font-size: 20px; }
    .content { padding: 24px; }
    .info-box { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .info-row { margin-bottom: 8px; }
    .info-label { color: #64748b; font-size: 14px; }
    .info-value { font-weight: 600; color: #1e293b; font-size: 16px; }
    .button { display: inline-block; background: #1a1a1a; color: #d4ff00; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; padding: 16px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🆕 Nová registrace uživatele</h1>
    </div>
    <div class="content">
      <p>Do aplikace se zaregistroval nový uživatel a čeká na schválení.</p>
      
      <div class="info-box">
        <div class="info-row">
          <div class="info-label">E-mail:</div>
          <div class="info-value">${userEmail}</div>
        </div>
        ${userName ? `
        <div class="info-row">
          <div class="info-label">Jméno:</div>
          <div class="info-value">${userName}</div>
        </div>
        ` : ''}
        <div class="info-row">
          <div class="info-label">Datum registrace:</div>
          <div class="info-value">${new Date(registeredAt).toLocaleString('cs-CZ')}</div>
        </div>
      </div>
      
      <p style="text-align: center;">
        <a href="${approvalUrl}" class="button">Přejít ke schvalování</a>
      </p>
    </div>
    <div class="footer">
      <p>Just Move Asistent - Admin notifikace</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: "Just Move <onboarding@resend.dev>",
      to: adminEmails,
      subject: `Nová registrace: ${userEmail}`,
      html: emailHtml,
    });

    console.log("Admin notification sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-admin-new-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
