import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("N8N_BACKSTAGE_WEBHOOK_URL");
    const token = Deno.env.get("N8N_BACKSTAGE_TOKEN");

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "N8N_BACKSTAGE_WEBHOOK_URL is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ source: "musa-hub", requested_at: new Date().toISOString() }),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error("n8n upstream error", upstream.status, text);
      return new Response(
        JSON.stringify({ error: `n8n upstream HTTP ${upstream.status}`, detail: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON from n8n", detail: text.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("backstage-sync error", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
