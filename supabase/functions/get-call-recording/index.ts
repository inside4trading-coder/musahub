import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "https://esm.sh/blueimp-md5@2.19.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CallRow = {
  call_id: string;
  caller: string | null;
  destination: string | null;
  started_at: string | null;
  duration: number | null;
  status: string | null;
};

type ZadarmaPbxStat = {
  call_id?: string;
  callstart?: string;
  destination?: string | number;
  disposition?: string;
  is_recorded?: string;
  seconds?: string | number;
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

function buildParamString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`)
    .join("&");
}

async function fetchZadarmaJson(
  endpoint: string,
  params: Record<string, string>,
  key: string,
  secret: string
) {
  const paramString = buildParamString(params);
  const signString = endpoint + paramString + md5Hex(paramString);
  const signature = await hmacSha1Zadarma(secret, signString);
  const url = `https://api.zadarma.com${endpoint}?${paramString}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `${key}:${signature}`,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Zadarma API error [${response.status}]: ${text}`);
  }

  const data = JSON.parse(text);
  if (data.status !== "success") {
    throw new Error(`Zadarma returned: ${JSON.stringify(data)}`);
  }

  return data;
}

function formatZadarmaDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function normalizePhone(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  return digits.slice(-9);
}

function parseZadarmaDate(value: string | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value.replace(" ", "T")}Z`);
}

function scoreCandidate(callRow: CallRow, stat: ZadarmaPbxStat): number {
  let score = 0;
  const callStartedAt = callRow.started_at ? new Date(callRow.started_at) : null;
  const statStartedAt = parseZadarmaDate(stat.callstart);
  const rowDuration = Number(callRow.duration ?? 0);
  const statDuration = Number(stat.seconds ?? 0);
  const targetNumbers = [normalizePhone(callRow.destination), normalizePhone(callRow.caller)].filter(Boolean);
  const statDestination = normalizePhone(stat.destination);

  if (callStartedAt && statStartedAt) {
    const diffSeconds = Math.abs(callStartedAt.getTime() - statStartedAt.getTime()) / 1000;
    score += Math.max(0, 120 - diffSeconds * 6);
  }

  if (rowDuration > 0) {
    score += Math.max(0, 80 - Math.abs(rowDuration - statDuration) * 4);
  }

  if (statDestination && targetNumbers.includes(statDestination)) {
    score += 150;
  }

  if (callRow.status && stat.disposition === callRow.status) {
    score += 30;
  }

  if (stat.is_recorded === "true") {
    score += 40;
  }

  return score;
}

async function resolveRecordingCallId(
  requestedCallId: string,
  zadarmaKey: string,
  zadarmaSecret: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<string> {
  if (/^\d+\.\d+$/.test(requestedCallId)) {
    return requestedCallId;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: callRow, error } = await supabase
    .from("calls")
    .select("call_id, caller, destination, started_at, duration, status")
    .eq("call_id", requestedCallId)
    .maybeSingle<CallRow>();

  if (error) {
    throw new Error(`Failed to load call details: ${error.message}`);
  }

  if (!callRow?.started_at) {
    throw new Error("No se pudieron cargar los detalles de la llamada.");
  }

  const callDate = new Date(callRow.started_at);
  const statsData = await fetchZadarmaJson(
    "/v1/statistics/pbx/",
    {
      start: formatZadarmaDate(new Date(callDate.getTime() - 5 * 60 * 1000)),
      end: formatZadarmaDate(new Date(callDate.getTime() + 5 * 60 * 1000)),
    },
    zadarmaKey,
    zadarmaSecret
  );

  const stats = (statsData.stats || []) as ZadarmaPbxStat[];
  const candidates = stats
    .filter((stat) => stat.call_id && stat.is_recorded === "true")
    .map((stat) => ({ stat, score: scoreCandidate(callRow, stat) }))
    .sort((a, b) => b.score - a.score);

  const bestMatch = candidates[0];
  if (!bestMatch || bestMatch.score < 120) {
    throw new Error("No se encontró una grabación coincidente para esta llamada.");
  }

  console.log(
    "Resolved recording call id:",
    JSON.stringify({
      requestedCallId,
      resolvedCallId: bestMatch.stat.call_id,
      score: bestMatch.score,
      callStartedAt: callRow.started_at,
      matchedCallStart: bestMatch.stat.callstart,
      matchedDestination: bestMatch.stat.destination,
      matchedDuration: bestMatch.stat.seconds,
    })
  );

  return bestMatch.stat.call_id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZADARMA_KEY = Deno.env.get("ZADARMA_KEY")?.trim();
    const ZADARMA_SECRET = Deno.env.get("ZADARMA_SECRET")?.trim();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim();
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

    if (!ZADARMA_KEY) throw new Error("ZADARMA_KEY is not configured");
    if (!ZADARMA_SECRET) throw new Error("ZADARMA_SECRET is not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL is not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const { call_id, pbx_call_id } = await req.json();
    if (!call_id && !pbx_call_id) {
      throw new Error("call_id or pbx_call_id is required");
    }

    const resolvedCallId = pbx_call_id || await resolveRecordingCallId(
      call_id,
      ZADARMA_KEY,
      ZADARMA_SECRET,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const data = await fetchZadarmaJson(
      "/v1/pbx/record/request/",
      {
        call_id: resolvedCallId,
        lifetime: "3600",
      },
      ZADARMA_KEY,
      ZADARMA_SECRET
    );

    return new Response(
      JSON.stringify({
        link: data.link,
        lifetime_till: data.lifetime_till,
        resolved_call_id: resolvedCallId,
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
