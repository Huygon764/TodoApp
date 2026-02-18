import { env } from "../config/index.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function generateAnalysis(prompt: string): Promise<string> {
  const apiKey = env.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini API error: ${res.status} ${errText}`) as Error & {
      status?: number;
      retryAfterSeconds?: number;
    };
    err.status = res.status;
    if (res.status === 429) {
      err.retryAfterSeconds = 15;
      try {
        const body = JSON.parse(errText) as { error?: { details?: Array<{ "@type"?: string; retryDelay?: string }> } };
        const retryInfo = body?.error?.details?.find((d) => d["@type"]?.includes("RetryInfo"));
        const delay = retryInfo && "retryDelay" in retryInfo ? parseFloat(String((retryInfo as { retryDelay?: string }).retryDelay).replace("s", "")) : undefined;
        if (delay && !Number.isNaN(delay)) err.retryAfterSeconds = Math.ceil(delay);
      } catch {
        // keep default 15
      }
    }
    throw err;
  }

  interface GeminiResponse {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  }
  const data = (await res.json()) as GeminiResponse;
  const firstPart = data.candidates?.[0]?.content?.parts?.[0];
  const text = (firstPart?.text ?? "").trim();
  return text;
}
