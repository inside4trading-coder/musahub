import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const N8N_WEBHOOK_URL = Deno.env.get("N8N_EMAIL_CAMPAIGN_WEBHOOK");
    if (!N8N_WEBHOOK_URL) {
      throw new Error("N8N_EMAIL_CAMPAIGN_WEBHOOK is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Service role client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id is required");

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    if (campaign.status === "Enviada") {
      throw new Error("Campaign already sent");
    }

    const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
    if (recipients.length === 0) {
      throw new Error("No recipients in campaign");
    }

    // Update campaign status to "Enviando"
    await supabase
      .from("email_campaigns")
      .update({ status: "Enviando", sent_at: new Date().toISOString() })
      .eq("id", campaign_id);

    // Create email_logs for each recipient
    const logs = recipients.map((r: any) => ({
      campaign_id,
      recipient_email: r.email,
      business_name: r.business_name || null,
      status: "pending",
    }));

    await supabase.from("email_logs").insert(logs);

    // Build callback URL for n8n to report back
    const callbackUrl = `${SUPABASE_URL}/functions/v1/email-campaign-callback`;

    // Send to n8n webhook
    const n8nPayload = {
      campaign_id: campaign.id,
      campaign_name: campaign.campaign_name,
      subject: campaign.subject,
      from_name: campaign.from_name || "Musa Agency",
      reply_to: campaign.reply_to || null,
      html_body: campaign.html_body || "",
      recipients,
      callback_url: callbackUrl,
      service_role_key: SUPABASE_SERVICE_ROLE_KEY,
    };

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      // Revert status on failure
      await supabase
        .from("email_campaigns")
        .update({ status: "Error", sent_at: null })
        .eq("id", campaign_id);

      throw new Error(`n8n webhook failed [${n8nResponse.status}]: ${errorText}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Campaign sent to ${recipients.length} recipients`,
        campaign_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-email-campaign:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
