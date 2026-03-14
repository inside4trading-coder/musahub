import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HMAC-SHA1 helper
async function hmacSha1(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// MD5 helper using SubtleCrypto (not available natively, use a simple implementation)
async function md5Hex(input: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(input);
  // Deno supports MD5 via crypto
  const hashBuffer = await crypto.subtle.digest("MD5", msgBuffer).catch(() => null);
  
  if (hashBuffer) {
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  
  // Fallback: use std library
  const { Md5 } = await import("https://deno.land/std@0.168.0/hash/md5.ts");
  return new Md5().update(input).toString("hex");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZADARMA_KEY = Deno.env.get("ZADARMA_KEY");
    const ZADARMA_SECRET = Deno.env.get("ZADARMA_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ZADARMA_KEY) throw new Error("ZADARMA_KEY is not configured");
    if (!ZADARMA_SECRET) throw new Error("ZADARMA_SECRET is not configured");

    const { start, end } = await req.json();
    if (!start || !end) throw new Error("start and end are required (YYYY-MM-DD HH:MM:SS)");

    // Build Zadarma API request
    const endpoint = "/v1/statistics/";
    const params: Record<string, string> = { start, end, type: "all" };
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");

    const md5Hash = await md5Hex(paramString);
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
