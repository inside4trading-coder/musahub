import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import md5 from "https://esm.sh/blueimp-md5@2.19.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    if (!ZADARMA_KEY) throw new Error("ZADARMA_KEY is not configured");
    if (!ZADARMA_SECRET) throw new Error("ZADARMA_SECRET is not configured");

    const { call_id, pbx_call_id } = await req.json();
    if (!call_id && !pbx_call_id) {
      throw new Error("call_id or pbx_call_id is required");
    }

    const endpoint = "/v1/pbx/record/request/";
    const params: Record<string, string> = {
      lifetime: "3600",
    };
    if (pbx_call_id) {
      params.pbx_call_id = pbx_call_id;
    } else {
      params.call_id = call_id;
    }

    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys
      .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`)
      .join("&");

    const signString = endpoint + paramString + md5Hex(paramString);
    const signature = await hmacSha1Zadarma(ZADARMA_SECRET, signString);

    const url = `https://api.zadarma.com${endpoint}?${paramString}`;
    console.log("Requesting recording:", url);

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
    console.log("Recording response:", JSON.stringify(data));

    if (data.status !== "success") {
      throw new Error(`Zadarma returned: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({
        link: data.link,
        lifetime_till: data.lifetime_till,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-call-recording error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
