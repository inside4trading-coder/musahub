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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const N8N_WEBHOOK_URL = Deno.env.get("N8N_EMAIL_CAMPAIGN_WEBHOOK");

    if (!N8N_WEBHOOK_URL) {
      throw new Error("N8N_EMAIL_CAMPAIGN_WEBHOOK is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find pending steps whose scheduled_for has passed
    const now = new Date().toISOString();
    const { data: dueSteps, error: stepsError } = await supabase
      .from("campaign_steps")
      .select("*, email_campaigns(*)")
      .eq("status", "Pendiente")
      .not("scheduled_for", "is", null)
      .lte("scheduled_for", now);

    if (stepsError) {
      throw new Error(`Error fetching due steps: ${stepsError.message}`);
    }

    if (!dueSteps || dueSteps.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No steps due for sending", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${dueSteps.length} steps due for sending`);

    const results: Array<{ step_id: string; campaign_id: string; status: string }> = [];

    for (const step of dueSteps) {
      const campaign = step.email_campaigns;
      if (!campaign) {
        console.error(`Campaign not found for step ${step.id}`);
        results.push({ step_id: step.id, campaign_id: step.campaign_id, status: "error: campaign not found" });
        continue;
      }

      const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
      if (recipients.length === 0) {
        console.error(`No recipients for campaign ${campaign.id}`);
        await supabase
          .from("campaign_steps")
          .update({ status: "Error" })
          .eq("id", step.id);
        results.push({ step_id: step.id, campaign_id: step.campaign_id, status: "error: no recipients" });
        continue;
      }

      // Mark step as sending
      await supabase
        .from("campaign_steps")
        .update({ status: "Enviando", sent_at: now })
        .eq("id", step.id);

      // Update campaign status
      await supabase
        .from("email_campaigns")
        .update({ status: "Enviando" })
        .eq("id", campaign.id);

      // Create email logs
      const logs = recipients.map((r: any) => ({
        campaign_id: campaign.id,
        recipient_email: r.email,
        business_name: r.business_name || null,
        status: "pending",
      }));
      await supabase.from("email_logs").insert(logs);

      const callbackUrl = `${SUPABASE_URL}/functions/v1/email-campaign-callback`;

      // Send to n8n
      const n8nPayload = {
        campaign_id: campaign.id,
        campaign_name: campaign.campaign_name,
        subject: step.subject,
        from_name: campaign.from_name || "Musa Agency",
        reply_to: campaign.reply_to || null,
        html_body: step.html_body || "",
        recipients,
        callback_url: callbackUrl,
        service_role_key: SUPABASE_SERVICE_ROLE_KEY,
        step_number: step.step_number,
      };

      try {
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(n8nPayload),
        });

        if (!n8nResponse.ok) {
          const errorText = await n8nResponse.text();
          console.error(`n8n failed for step ${step.id}: ${errorText}`);
          await supabase.from("campaign_steps").update({ status: "Error" }).eq("id", step.id);
          results.push({ step_id: step.id, campaign_id: step.campaign_id, status: "error: n8n failed" });
          continue;
        }

        await supabase.from("campaign_steps").update({ status: "Enviada" }).eq("id", step.id);
        results.push({ step_id: step.id, campaign_id: step.campaign_id, status: "sent" });
      } catch (fetchErr) {
        console.error(`Fetch error for step ${step.id}:`, fetchErr);
        await supabase.from("campaign_steps").update({ status: "Error" }).eq("id", step.id);
        results.push({ step_id: step.id, campaign_id: step.campaign_id, status: "error: fetch failed" });
      }

      // Check if all steps for this campaign are done
      const { data: allSteps } = await supabase
        .from("campaign_steps")
        .select("status")
        .eq("campaign_id", campaign.id);

      const allDone = allSteps && allSteps.length > 0 && allSteps.every((s: any) => s.status === "Enviada");
      if (allDone) {
        await supabase.from("email_campaigns").update({ status: "Enviada" }).eq("id", campaign.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in process-scheduled-steps:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
