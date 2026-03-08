import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { campaign_id, step_number } = await req.json();
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

    const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
    if (recipients.length === 0) {
      throw new Error("No recipients in campaign");
    }

    // If step_number provided, fetch the specific step
    let stepData = null;
    if (step_number) {
      const { data: stepResult } = await supabase
        .from("campaign_steps")
        .select("*")
        .eq("campaign_id", campaign_id)
        .eq("step_number", step_number)
        .single();
      stepData = stepResult;
    }

    // Use step data if available, otherwise fall back to campaign data
    const subject = stepData?.subject || campaign.subject;
    const htmlBody = stepData?.html_body || campaign.html_body || "";

    // Update campaign status to "Enviando"
    await supabase
      .from("email_campaigns")
      .update({ status: "Enviando", sent_at: new Date().toISOString() })
      .eq("id", campaign_id);

    // Update step status if applicable
    if (stepData) {
      await supabase
        .from("campaign_steps")
        .update({ status: "Enviando", sent_at: new Date().toISOString() })
        .eq("id", stepData.id);
    }

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
      subject,
      from_name: campaign.from_name || "Musa Agency",
      reply_to: campaign.reply_to || null,
      html_body: htmlBody,
      recipients,
      callback_url: callbackUrl,
      service_role_key: SUPABASE_SERVICE_ROLE_KEY,
      step_number: step_number || 1,
    };

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      await supabase
        .from("email_campaigns")
        .update({ status: "Error", sent_at: null })
        .eq("id", campaign_id);

      if (stepData) {
        await supabase
          .from("campaign_steps")
          .update({ status: "Error" })
          .eq("id", stepData.id);
      }

      throw new Error(`n8n webhook failed [${n8nResponse.status}]: ${errorText}`);
    }

    // Mark step as sent
    if (stepData) {
      await supabase
        .from("campaign_steps")
        .update({ status: "Enviada" })
        .eq("id", stepData.id);
    }

    // Check if all steps are done
    const { data: allSteps } = await supabase
      .from("campaign_steps")
      .select("status")
      .eq("campaign_id", campaign_id);

    const allDone = allSteps && allSteps.length > 0 && allSteps.every((s: any) => s.status === "Enviada");
    if (allDone) {
      await supabase
        .from("email_campaigns")
        .update({ status: "Enviada" })
        .eq("id", campaign_id);
    } else if (!allSteps || allSteps.length === 0) {
      // No steps table usage, mark as sent directly
      await supabase
        .from("email_campaigns")
        .update({ status: "Enviada" })
        .eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Step ${step_number || 1} sent to ${recipients.length} recipients`,
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
