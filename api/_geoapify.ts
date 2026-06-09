// Helper compartido entre el dev-proxy de Vite (vite.config.ts) y la función
// de Vercel (api/geo.ts). Mantiene la construcción de URLs de Geoapify en un
// solo lugar. NO debe importar nada de "@vercel/node" para poder usarse en
// ambos entornos.

export interface GeoapifyRequest {
  action: "geocode";
  text?: string;
  limit?: number;
}

export function buildGeoapifyUrl(
  body: GeoapifyRequest,
  apiKey: string,
): string | null {
  if (body.action === "geocode") {
    const q = new URLSearchParams({
      text: body.text ?? "",
      limit: String(body.limit ?? 1),
      apiKey,
    });
    return `https://api.geoapify.com/v1/geocode/search?${q.toString()}`;
  }
  return null;
}
