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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();

    // Validate required auth from n8n (service role key passed in payload)
    if (body.service_role_key !== SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Unauthorized callback");
    }

    const { campaign_id, recipient_email, status, error_message } = body;

    if (!campaign_id || !recipient_email || !status) {
      throw new Error("campaign_id, recipient_email, and status are required");
    }

    // Update the specific email log
    const updateData: Record<string, any> = {
      status, // 'sent', 'failed', 'bounced'
      sent_at: new Date().toISOString(),
    };
    if (error_message) updateData.error_message = error_message;

    const { error: logError } = await supabase
      .from("email_logs")
      .update(updateData)
      .eq("campaign_id", campaign_id)
      .eq("recipient_email", recipient_email);

    if (logError) {
      console.error("Error updating log:", logError);
      throw new Error(`Failed to update log: ${logError.message}`);
    }

    // Check if all emails for this campaign have been processed
    const { data: pendingLogs } = await supabase
      .from("email_logs")
      .select("id")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");

    if (!pendingLogs || pendingLogs.length === 0) {
      // All processed — check for failures
      const { data: failedLogs } = await supabase
        .from("email_logs")
        .select("id")
        .eq("campaign_id", campaign_id)
        .eq("status", "failed");

      const finalStatus = failedLogs && failedLogs.length > 0 ? "Enviada (con errores)" : "Enviada";

      await supabase
        .from("email_campaigns")
        .update({ status: finalStatus })
        .eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in email-campaign-callback:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
