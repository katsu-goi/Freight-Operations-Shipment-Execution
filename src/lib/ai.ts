import type { RouteRecommendation, ParsedBillOfLading, RoutingRequest } from "@/types";

/**
 * Server-only AI helpers for routing recommendations and Bill of Lading
 * parsing. Prefers Groq (fast, OpenAI-compatible) and falls back to Gemini.
 * No API keys are ever exposed to the browser — these run in API routes.
 */

type Provider = "groq" | "gemini";

function activeProvider(): Provider | null {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function aiEnabled(): boolean {
  return activeProvider() !== null;
}

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_INPUT_CHARS = 20_000;

/** fetch with an AbortController timeout and a response-size guard. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error("AI response exceeded the allowed size");
    }
    return new Response(text, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Truncate and normalize unstructured input before it reaches a paid model. */
function sanitize(text: string): string {
  return text.slice(0, MAX_INPUT_CHARS);
}

/** Extract the first JSON value from a model's text response. */
function extractJson<T>(text: string, validate?: (v: T) => boolean): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  for (const candidate of [cleaned, cleaned.match(/[{][\s\S]*[}]/)?.[0], cleaned.match(/[[]{[\s\S]*[}\]]/)?.[0]]) {
    if (!candidate) continue;
    try {
      const value = JSON.parse(candidate) as T;
      if (!validate || validate(value)) return value;
    } catch {
      // try the next candidate
    }
  }
  throw new Error("AI response was not valid JSON");
}

async function callGroq(system: string, user: string): Promise<string> {
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(system: string, user: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function complete(
  system: string,
  user: string,
  validate?: (t: unknown) => boolean,
): Promise<unknown> {
  const provider = activeProvider();
  if (!provider) throw new Error("No AI provider configured");

  let raw: string;
  try {
    raw = provider === "groq" ? await callGroq(system, user) : await callGemini(system, user);
  } catch (e) {
    if (e instanceof Error && /abort/i.test(e.message)) {
      throw new Error("AI request timed out; try again");
    }
    throw e;
  }

  // Retry once on malformed JSON before failing to the user.
  try {
    return extractJson(raw, validate);
  } catch {
    raw = provider === "groq" ? await callGroq(system, user) : await callGemini(system, user);
    return extractJson(raw, validate);
  }
}

export async function recommendRoutes(
  req: RoutingRequest,
): Promise<RouteRecommendation[]> {
  const system =
    "You are an expert Philippine domestic freight-forwarding routing engine. " +
    "Plan ONLY local corridors inside the Philippines (Metro Manila, Luzon, Visayas, Mindanao, major ports like Manila, Batangas, Cebu, Davao, Subic). " +
    "Costs must be in Philippine pesos (₱). Return ONLY JSON of the shape " +
    '{"routes":[{routeName,carrierName,transitTimeDays,estimatedCostPHP,co2ReductionPercent,riskScore,keyAdvantage}]}. ' +
    "riskScore is one of Low, Medium, High. Provide exactly 3 diverse routes " +
    "(fastest, most economical, greenest). Do not suggest international routes.";

  const user = `Plan domestic Philippine freight routing for:
- Origin: ${sanitize(req.origin)}
- Destination: ${sanitize(req.destination)}
- Mode: ${req.mode}
- Weight: ${req.weightKg} kg
- Volume: ${req.volumeCbm} CBM
- Incoterms: ${sanitize(req.incoterms)}`;

  const isRouteShape = (v: unknown): boolean => {
    const routes = Array.isArray(v) ? v : (v as { routes?: unknown[] })?.routes;
    return Array.isArray(routes) && routes.length > 0;
  };

  // A wrong `estimatedCostUSD` default is silently ignored; PHP is authoritative.
  const parsed = (await complete(system, user, isRouteShape)) as
    | { routes?: Array<RouteRecommendation & { estimatedCostUSD?: number }> }
    | Array<RouteRecommendation & { estimatedCostUSD?: number }>;

  const routes = Array.isArray(parsed) ? parsed : (parsed.routes ?? []);
  if (!routes.length) throw new Error("AI returned no routes");
  return routes.map((r) => ({
    ...r,
    estimatedCostPHP:
      r.estimatedCostPHP ??
      (typeof r.estimatedCostUSD === "number" ? r.estimatedCostUSD : 0),
  }));
}

export async function parseBillOfLading(text: string): Promise<ParsedBillOfLading> {
  const system =
    "You extract structured data from unstructured Bill of Lading / shipping " +
    "advice text. Return ONLY a JSON object with keys: billOfLadingNumber, " +
    "shipperName, consigneeName, vesselName, voyageNo, portOfLoading, " +
    "portOfDischarge, containerNumber, totalWeightKg (number), " +
    "totalVolumeCbm (number), goodsDescription. Use empty string or 0 when a " +
    "field is absent.";

  const isParsed = (v: unknown): boolean =>
    typeof v === "object" && v !== null && "billOfLadingNumber" in (v as object);

  const user = `Bill of Lading text:\n"""\n${sanitize(text)}\n"""`;
  return (await complete(system, user, isParsed)) as ParsedBillOfLading;
}
