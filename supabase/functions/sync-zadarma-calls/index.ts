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

// MD5 hex helper — pure JS fallback since Deno edge runtime may not support MD5 via SubtleCrypto
function md5Hex(input: string): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(input);

  // Simple MD5 implementation (RFC 1321)
  function md5(buffer: Uint8Array): Uint8Array {
    const K = new Uint32Array([
      0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
      0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
      0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
      0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
      0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
      0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
      0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
      0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391
    ]);
    const S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
               5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
               4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
               6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];

    let len = buffer.length;
    let bitLen = len * 8;
    // Padding
    let padLen = (56 - (len + 1) % 64 + 64) % 64;
    let padded = new Uint8Array(len + 1 + padLen + 8);
    padded.set(buffer);
    padded[len] = 0x80;
    // Length in bits as 64-bit LE
    for (let i = 0; i < 8; i++) padded[len + 1 + padLen + i] = (bitLen >>> (i * 8)) & 0xff;

    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    const view = new DataView(padded.buffer);

    for (let offset = 0; offset < padded.length; offset += 64) {
      let M = new Uint32Array(16);
      for (let j = 0; j < 16; j++) M[j] = view.getUint32(offset + j * 4, true);

      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F: number, g: number;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) >>> 0;
        A = D; D = C; C = B;
        B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }

    const result = new Uint8Array(16);
    const rv = new DataView(result.buffer);
    rv.setUint32(0, a0, true); rv.setUint32(4, b0, true);
    rv.setUint32(8, c0, true); rv.setUint32(12, d0, true);
    return result;
  }

  const hash = md5(bytes);
  return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
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
