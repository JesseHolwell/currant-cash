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

type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  date: string;
  authorized_date: string | null;
  name: string;
  merchant_name: string | null;
  original_description: string | null;
  pending: boolean;
  personal_finance_category: { primary: string; detailed: string; confidence_level: string } | null;
};

type PlaidAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balances: { current: number | null; available: number | null; iso_currency_code: string | null };
};

async function fetchAllTransactions(
  accessToken: string
): Promise<{ accounts: PlaidAccount[]; transactions: PlaidTransaction[] }> {
  let cursor: string | undefined = undefined;
  let allTransactions: PlaidTransaction[] = [];
  let accounts: PlaidAccount[] = [];
  let hasMore = true;

  while (hasMore) {
    const body: Record<string, unknown> = {
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      access_token: accessToken,
      count: 500,
      options: {
        include_original_description: true,
        personal_finance_category_version: "v2",
      },
    };
    if (cursor) {
      body.cursor = cursor;
    }

    const res = await fetch(`${PLAID_BASE_URL}/transactions/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error_message ?? "Failed to fetch transactions");
    }

    accounts = data.accounts ?? accounts;
    allTransactions = [...allTransactions, ...(data.added ?? [])];
    cursor = data.next_cursor;
    hasMore = data.has_more === true;
  }

  return { accounts, transactions: allTransactions };
}

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
    const body = await req.json();
    const publicToken: string = body.public_token;
    const institutionName: string = body.institution_name ?? "Bank";

    if (!publicToken) {
      return new Response(JSON.stringify({ error: "public_token is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Exchange public_token for access_token
    const exchangeRes = await fetch(`${PLAID_BASE_URL}/item/public_token/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token: publicToken,
      }),
    });

    const exchangeData = await exchangeRes.json();

    if (!exchangeRes.ok) {
      console.error("Exchange error:", exchangeData);
      return new Response(
        JSON.stringify({ error: exchangeData.error_message ?? "Token exchange failed" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const accessToken: string = exchangeData.access_token;

    // Fetch all transactions (paginate through has_more)
    const { accounts, transactions } = await fetchAllTransactions(accessToken);

    return new Response(
      JSON.stringify({ institution_name: institutionName, accounts, transactions }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
