import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAllowedOrigin } from "./_origin";
import { requireAuth, handleAuthError } from "./_auth";

const MAX_INSTRUCTIONS_LEN = 4000;
const MAX_ITINERARY_LEN = 80000;
const MAX_MESSAGES = 50;
const MAX_MSG_LEN = 8000;

// El content de un mensaje puede ser un string o un array de bloques
// { type: "text", text } (la forma con cache_control que usa ChatPanel).
function messageTextLength(content: unknown): number | null {
  if (typeof content === "string") return content.length;
  if (Array.isArray(content)) {
    let total = 0;
    for (const block of content) {
      if (
        typeof block !== "object" || block === null ||
        (block as { type?: unknown }).type !== "text" ||
        typeof (block as { text?: unknown }).text !== "string"
      ) {
        return null;
      }
      total += (block as { text: string }).text.length;
    }
    return total;
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

  const { instructions, itineraryText, messages } = req.body ?? {};

  const messagesValid =
    Array.isArray(messages) &&
    messages.length >= 1 &&
    messages.length <= MAX_MESSAGES &&
    messages.every((m: unknown) => {
      if (typeof m !== "object" || m === null) return false;
      const role = (m as { role?: unknown }).role;
      if (role !== "user" && role !== "assistant") return false;
      const len = messageTextLength((m as { content?: unknown }).content);
      return len !== null && len <= MAX_MSG_LEN;
    });

  if (
    typeof instructions !== "string" || instructions.length > MAX_INSTRUCTIONS_LEN ||
    typeof itineraryText !== "string" || itineraryText.length > MAX_ITINERARY_LEN ||
    !messagesValid
  ) {
    return res.status(400).json({ error: "Parámetros inválidos para /api/chat-itinerary" });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: [
        { type: "text", text: instructions },
        {
          type: "text",
          text: itineraryText,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    }),
  });

  const data = await response.json();
  return res.status(200).json(data);
}
