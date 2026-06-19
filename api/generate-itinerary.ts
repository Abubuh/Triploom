import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAllowedOrigin } from "./_origin.js";
import { requireAuth, handleAuthError } from "./_auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    return res.status(200).end();
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: "Origen no permitido" });
  }

  try {
    await requireAuth(req);
  } catch (err) {
    if (handleAuthError(err, res)) return;
    throw err;
  }

  const { prompt, maxTokens } = req.body ?? {};
  if (
    typeof prompt !== "string" ||
    prompt.length === 0 ||
    prompt.length > 40000
  ) {
    return res.status(400).json({ error: "Prompt inválido" });
  }
  const safeMaxTokens = Math.min(
    Math.max(Number(maxTokens) || 4000, 2000),
    8192,
  );

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: safeMaxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return res.status(200).json(data);
}
