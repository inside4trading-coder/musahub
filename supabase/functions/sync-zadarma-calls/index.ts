import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "npm:blueimp-md5@2.19.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Zadarma expects: base64(hex(hmac_sha1(secret, message)))
async function hmacSha1Zadarma(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message))
  );

  const hexDigest = Array.from(signatureBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return btoa(hexDigest);
}

function md5Hex(input: string): string {
  return md5(input);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZADARMA_KEY = Deno.env.get("ZADARMA_KEY")?.trim();
    const ZADARMA_SECRET = Deno.env.get("ZADARMA_SECRET")?.trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ZADARMA_KEY) throw new Error("ZADARMA_KEY is not configured");
    if (!ZADARMA_SECRET) throw new Error("ZADARMA_SECRET is not configured");

    const { start, end } = await req.json();
    if (!start || !end) throw new Error("start and end are required (YYYY-MM-DD HH:MM:SS)");

    // Build Zadarma API request — signature per official docs:
    // ksort params, build query string (RFC1738), sign = base64(hmac_sha1(secret, method + paramsStr + md5hex(paramsStr)))
    const endpoint = "/v1/statistics/";
    const params: Record<string, string> = { start, end, type: "all" };
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys
      .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`)
      .join("&");

    const md5Hash = md5Hex(paramString);
    const signString = endpoint + paramString + md5Hash;
    const signature = await hmacSha1Zadarma(ZADARMA_SECRET, signString);

    const url = `https://api.zadarma.com${endpoint}?${paramString}`;
    console.log("Calling Zadarma:", url);

    const zadarmaRes = await fetch(url, {
      headers: {
        Authorization: `${ZADARMA_KEY}:${signature}`,
      },
    });

    if (!zadarmaRes.ok) {
      const body = await zadarmaRes.text();
      throw new Error(`Zadarma API error [${zadarmaRes.status}]: ${body}`);
    }

    const data = await zadarmaRes.json();
    console.log("Zadarma response status:", data.status);

    if (data.status !== "success") {
      throw new Error(`Zadarma returned status: ${data.status} — ${JSON.stringify(data)}`);
    }

    const stats = data.stats || [];
    if (stats.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Zadarma fields to our calls table
    const rows = stats.map((s: any) => {
      let status = s.disposition || "unknown";
      let direction = "unknown";
      if (s.type === "in" || s.type === "incoming") direction = "incoming";
      else if (s.type === "out" || s.type === "outgoing") direction = "outgoing";
      else if (s.type === "internal") direction = "internal";
      else direction = s.type || "unknown";

      return {
        call_id: String(s.callid || s.id),
        caller: s.caller_id || s.from || null,
        destination: s.destination || s.to || null,
        duration: Number(s.seconds) || 0,
        status,
        direction,
        started_at: s.callstart || null,
        cost: Number(s.cost) || 0,
        agent_name: s.pbx_call_id ? (s.internal || null) : (s.internal || null),
      };
    });

    // Upsert into calls table
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.from("calls").upsert(rows, { onConflict: "call_id" });

    if (error) throw new Error(`Supabase upsert error: ${error.message}`);

    return new Response(JSON.stringify({ synced: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-zadarma-calls error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "npm:blueimp-md5@2.19.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Zadarma expects: base64( hex(hmac_sha1(message, secret)) )
async function hmacSha1Zadarma(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message))
  );

  const hexDigest = Array.from(signatureBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return btoa(hexDigest);
}

function md5Hex(input: string): string {
  return md5(input);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZADARMA_KEY = Deno.env.get("ZADARMA_KEY")?.trim();
    const ZADARMA_SECRET = Deno.env.get("ZADARMA_SECRET")?.trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ZADARMA_KEY) throw new Error("ZADARMA_KEY is not configured");
    if (!ZADARMA_SECRET) throw new Error("ZADARMA_SECRET is not configured");

    const { start, end } = await req.json();
    if (!start || !end) throw new Error("start and end are required (YYYY-MM-DD HH:MM:SS)");


    // Build Zadarma API request — signature per official docs:
    // ksort params, build query string (RFC1738), sign = base64(hmac_sha1(secret, method + paramsStr + md5hex(paramsStr)))
    const endpoint = "/v1/statistics/";
    const params: Record<string, string> = { start, end, type: "all" };
    const sortedKeys = Object.keys(params).sort();
    // RFC1738: spaces as %20, values URL-encoded
    const paramString = sortedKeys.map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`).join("&");

    const md5Hash = md5Hex(paramString);
    const signString = endpoint + paramString + md5Hash;
    const signature = await hmacSha1(ZADARMA_SECRET, signString);

    const url = `https://api.zadarma.com${endpoint}?${paramString}`;
    console.log("Calling Zadarma:", url);

    const zadarmaRes = await fetch(url, {
      headers: {
        Authorization: `${ZADARMA_KEY}:${signature}`,
      },
    });

    if (!zadarmaRes.ok) {
      const body = await zadarmaRes.text();
      throw new Error(`Zadarma API error [${zadarmaRes.status}]: ${body}`);
    }

    const data = await zadarmaRes.json();
    console.log("Zadarma response status:", data.status);

    if (data.status !== "success") {
      throw new Error(`Zadarma returned status: ${data.status} — ${JSON.stringify(data)}`);
    }

    const stats = data.stats || [];
    if (stats.length === 0) {
      return new Response(JSON.stringify({ synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Zadarma fields to our calls table
    const rows = stats.map((s: any) => {
      // Map disposition to readable status
      let status = s.disposition || "unknown";
      // Map direction type
      let direction = "unknown";
      if (s.type === "in" || s.type === "incoming") direction = "incoming";
      else if (s.type === "out" || s.type === "outgoing") direction = "outgoing";
      else if (s.type === "internal") direction = "internal";
      else direction = s.type || "unknown";

      return {
        call_id: String(s.callid || s.id),
        caller: s.caller_id || s.from || null,
        destination: s.destination || s.to || null,
        duration: Number(s.seconds) || 0,
        status,
        direction,
        started_at: s.callstart || null,
        cost: Number(s.cost) || 0,
        agent_name: s.pbx_call_id ? (s.internal || null) : (s.internal || null),
      };
    });

    // Upsert into Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from("calls")
      .upsert(rows, { onConflict: "call_id" });

    if (error) throw new Error(`Supabase upsert error: ${error.message}`);

    return new Response(JSON.stringify({ synced: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-zadarma-calls error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
