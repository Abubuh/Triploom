import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildGeoapifyUrl } from "./_geoapify";
import { isAllowedOrigin } from "./_origin";
import { requireAuth, handleAuthError } from "./_auth";

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

  const apiKey = process.env.GEOAPIFY_API_KEY ?? "";
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GEOAPIFY_API_KEY no está configurada en el servidor" });
  }

  const url = buildGeoapifyUrl(req.body ?? {}, apiKey);

  if (!url) {
    return res
      .status(400)
      .json({ error: `Acción no soportada: ${req.body?.action}` });
  }

  const upstream = await fetch(url);
  const data = await upstream.json();
  return res.status(upstream.status).json(data);
}
