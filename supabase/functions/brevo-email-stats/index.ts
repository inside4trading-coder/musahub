import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  if (!BREVO_API_KEY) {
    return new Response(JSON.stringify({ error: "BREVO_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, startDate, endDate, limit, offset, event } = await req.json();

    const brevoHeaders = {
      "api-key": BREVO_API_KEY,
      Accept: "application/json",
    };

    if (action === "reports") {
      // Aggregated stats
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(
        `https://api.brevo.com/v3/smtp/statistics/reports?${params}`,
        { headers: brevoHeaders }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Brevo reports API error [${res.status}]: ${text}`);
      }
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "events") {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (limit) params.set("limit", String(limit));
      if (offset) params.set("offset", String(offset));
      if (event) params.set("event", event);

      const res = await fetch(
        `https://api.brevo.com/v3/smtp/statistics/events?${params}`,
        { headers: brevoHeaders }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Brevo events API error [${res.status}]: ${text}`);
      }
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("brevo-email-stats error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
