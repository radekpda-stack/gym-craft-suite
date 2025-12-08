import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendFeedbackRequest {
  requestId: string;
  clientEmail: string;
  clientName: string;
  trainingDate: string;
  trainingType?: string;
  customMessage?: string;
  trainerSignature?: string;
  feedbackUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      requestId, 
      clientEmail, 
      clientName, 
      trainingDate, 
      trainingType,
      customMessage,
      trainerSignature,
      feedbackUrl,
      isTest = false,
    }: SendFeedbackRequest & { isTest?: boolean } = await req.json();

    console.log(`Sending ${isTest ? 'TEST ' : ''}feedback email to ${clientEmail} for request ${requestId}`);

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zpětná vazba po tréninku</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 32px; }
    .info-box { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-label { color: #64748b; }
    .info-value { font-weight: 600; color: #1e293b; }
    .message { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .button:hover { background: #4f46e5; }
    .footer { text-align: center; padding: 24px; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
    .signature { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-style: italic; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏋️ Zpětná vazba po tréninku</h1>
    </div>
    <div class="content">
      <p>Dobrý den, <strong>${clientName}</strong>!</p>
      
      <p>Prosíme o vyplnění krátkého dotazníku k vašemu nedávnému tréninku. Vaše zpětná vazba nám pomůže lépe přizpůsobit tréninkový plán vašim potřebám.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Datum tréninku:</span>
          <span class="info-value">${trainingDate}</span>
        </div>
        ${trainingType ? `
        <div class="info-row">
          <span class="info-label">Typ tréninku:</span>
          <span class="info-value">${trainingType}</span>
        </div>
        ` : ''}
      </div>
      
      ${customMessage ? `
      <div class="message">
        <p style="margin: 0;">${customMessage}</p>
      </div>
      ` : ''}
      
      <p style="text-align: center;">
        <a href="${feedbackUrl}" class="button">Vyplnit zpětnou vazbu</a>
      </p>
      
      <p style="text-align: center; color: #64748b; font-size: 14px;">
        Formulář trvá přibližně 1-2 minuty.
      </p>
      
      ${trainerSignature ? `
      <div class="signature">
        ${trainerSignature}
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>Tento e-mail byl odeslán automaticky. Pokud jste o něj nežádali, můžete ho ignorovat.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Trénink <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Zpětná vazba po tréninku - ${trainingDate}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update request status to 'sent' (skip for test emails)
    if (!isTest && requestId && !requestId.startsWith('test-')) {
      const { error: updateError } = await supabase
        .from("feedback_requests")
        .update({ 
          status: "sent", 
          sent_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating request status:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-feedback-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
