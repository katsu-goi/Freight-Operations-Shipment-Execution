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

/** Extract the first JSON value from a model's text response. */
function extractJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("AI response was not valid JSON");
  }
}

async function callGroq(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(system: string, user: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function complete(system: string, user: string): Promise<string> {
  const provider = activeProvider();
  if (!provider) throw new Error("No AI provider configured");
  return provider === "groq" ? callGroq(system, user) : callGemini(system, user);
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
- Origin: ${req.origin}
- Destination: ${req.destination}
- Mode: ${req.mode}
- Weight: ${req.weightKg} kg
- Volume: ${req.volumeCbm} CBM
- Incoterms: ${req.incoterms}`;

  const raw = await complete(system, user);
  const parsed = extractJson<
    | { routes?: Array<RouteRecommendation & { estimatedCostUSD?: number }> }
    | Array<RouteRecommendation & { estimatedCostUSD?: number }>
  >(raw);
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

  const raw = await complete(system, `Bill of Lading text:\n"""\n${text}\n"""`);
  return extractJson<ParsedBillOfLading>(raw);
}
