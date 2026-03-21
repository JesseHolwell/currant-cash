export class InvalidApiKeyError extends Error {
  readonly code = "INVALID_API_KEY";
  constructor() {
    super("Invalid OpenAI API key. Check your key in settings.");
  }
}

export class RateLimitError extends Error {
  readonly code = "RATE_LIMIT";
  constructor(retryAfter?: string) {
    super(
      retryAfter
        ? `OpenAI rate limit reached. Try again in ${retryAfter} seconds.`
        : "OpenAI rate limit reached. Wait a moment and try again."
    );
  }
}

export class NetworkError extends Error {
  readonly code = "NETWORK";
  constructor(message = "Could not reach OpenAI. Check your internet connection.") {
    super(message);
  }
}

export class ParseError extends Error {
  readonly code = "PARSE";
  constructor() {
    super("AI returned an unexpected response. Try again.");
  }
}

type TransactionInput = {
  id: string;
  merchant: string;
  narrative: string;
  amount: number;
};

type SuggestionResult = {
  transactionId: string;
  categoryGroup: string;
  category: string;
};

function buildTaxonomyPrompt(taxonomy: Map<string, string[]>): string {
  const lines: string[] = [];
  for (const [group, subcats] of taxonomy.entries()) {
    lines.push(`- ${group}: ${subcats.join(", ")}`);
  }
  return lines.join("\n");
}

async function callOpenAI(
  apiKey: string,
  transactions: TransactionInput[],
  taxonomyPrompt: string
): Promise<SuggestionResult[]> {
  const inputIds = new Set(transactions.map((t) => t.id));

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a personal finance transaction categorizer. The user's category taxonomy is:\n\n${taxonomyPrompt}\n\nFor each transaction, assign the best matching categoryGroup and category from the taxonomy above. If nothing fits well, use "Uncategorized" for both. Respond ONLY with valid JSON in this exact shape:\n{ "suggestions": [{ "transactionId": string, "categoryGroup": string, "category": string }] }`,
          },
          {
            role: "user",
            content: JSON.stringify(
              transactions.map((t) => ({
                id: t.id,
                merchant: t.merchant,
                narrative: t.narrative,
                amount: t.amount,
              }))
            ),
          },
        ],
      }),
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 401) throw new InvalidApiKeyError();
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After") ?? undefined;
    throw new RateLimitError(retryAfter);
  }
  if (response.status >= 500) throw new NetworkError("OpenAI server error. Try again shortly.");
  if (!response.ok) throw new NetworkError(`Unexpected error (${response.status}).`);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ParseError();
  }

  let content: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content = (data as any).choices[0].message.content as string;
  } catch {
    throw new ParseError();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ParseError();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suggestions = (parsed as any)?.suggestions;
  if (!Array.isArray(suggestions)) throw new ParseError();

  return suggestions
    .filter(
      (s): s is SuggestionResult =>
        s &&
        typeof s.transactionId === "string" &&
        typeof s.categoryGroup === "string" &&
        typeof s.category === "string" &&
        inputIds.has(s.transactionId)
    )
    .map((s) => ({
      transactionId: s.transactionId,
      categoryGroup: s.categoryGroup,
      category: s.category,
    }));
}

const BATCH_SIZE = 50;

export async function fetchAiCategorySuggestions(
  apiKey: string,
  transactions: TransactionInput[],
  taxonomy: Map<string, string[]>
): Promise<SuggestionResult[]> {
  const taxonomyPrompt = buildTaxonomyPrompt(taxonomy);
  const results: SuggestionResult[] = [];

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    const batchResults = await callOpenAI(apiKey, batch, taxonomyPrompt);
    results.push(...batchResults);
  }

  return results;
}
