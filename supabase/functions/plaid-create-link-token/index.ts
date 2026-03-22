import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PLAID_ENV = Deno.env.get("PLAID_ENV") ?? "sandbox";
const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID") ?? "";
const PLAID_SECRET = Deno.env.get("PLAID_SECRET") ?? "";
const PLAID_BASE_URL = `https://${PLAID_ENV}.plaid.com`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const clientUserId: string = body.user_id ?? "anonymous-user";

    const plaidRes = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        client_name: "Currant",
        user: { client_user_id: clientUserId },
        products: ["transactions"],
        country_codes: ["US", "GB", "CA"],
        language: "en",
      }),
    });

    const plaidData = await plaidRes.json();

    if (!plaidRes.ok) {
      console.error("Plaid error:", plaidData);
      return new Response(
        JSON.stringify({ error: plaidData.error_message ?? "Plaid error", code: plaidData.error_code }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ link_token: plaidData.link_token }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
