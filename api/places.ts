import type { VercelRequest, VercelResponse } from "@vercel/node";
import { callGooglePlaces, type GooglePlacesRequest } from "./_google";
import { isAllowedOrigin } from "./_origin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: "Origen no permitido" });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GOOGLE_PLACES_API_KEY no está configurada en el servidor" });
  }

  const body = req.body as GooglePlacesRequest;
  if (
    body?.action !== "nearby" ||
    typeof body.lat !== "number" ||
    typeof body.lng !== "number" ||
    !Array.isArray(body.types) ||
    body.types.length === 0
  ) {
    return res.status(400).json({ error: "Parámetros inválidos para /api/places" });
  }

  const upstream = await callGooglePlaces(body, apiKey);
  const data = await upstream.json();
  return res.status(upstream.status).json(data);
}
