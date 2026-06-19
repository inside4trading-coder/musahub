import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const toProductionWebhookUrl = (url: string) => url.trim().replace("/webhook-test/", "/webhook/");

const toAuthorizationHeader = (token?: string) => {
  const value = token?.trim();
  if (!value) return undefined;
  return /^Bearer\s+/i.test(value) ? value : `Bearer ${value}`;
};

const upstreamFailureResponse = (status: number, detail: string) => new Response(
  JSON.stringify({
    generated_at: new Date().toISOString(),
    total_workflows: 0,
    workflows: [],
    upstream_error: {
      status,
      message: `n8n upstream HTTP ${status}`,
      detail: detail.slice(0, 1000),
      hint: status === 403
        ? "Revisa que el Header Auth de n8n use Authorization y el mismo Bearer token que N8N_BACKSTAGE_TOKEN."
        : status === 404
          ? "Usa la Production URL /webhook/backstage-sync y activa el workflow en n8n."
          : "Revisa la ejecución del workflow en n8n.",
    },
  }),
  { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
);

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
    const authorization = toAuthorizationHeader(token);
    if (authorization) headers.Authorization = authorization;

    const upstream = await fetch(toProductionWebhookUrl(webhookUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({ source: "musa-hub", requested_at: new Date().toISOString() }),
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error("n8n upstream error", upstream.status, text);
      return upstreamFailureResponse(upstream.status, text);
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
