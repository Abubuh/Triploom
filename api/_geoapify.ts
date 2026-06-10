// Helper compartido entre el dev-proxy de Vite (vite.config.ts) y la función
// de Vercel (api/geo.ts). Mantiene la construcción de URLs de Geoapify en un
// solo lugar. NO debe importar nada de "@vercel/node" para poder usarse en
// ambos entornos.

export type GeoapifyRequest =
  | { action: "geocode"; text?: string; limit?: number }
  | {
      action: "places";
      categories?: string;
      lat?: number;
      lon?: number;
      radius?: number; // metros
      limit?: number;
    };

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

  if (body.action === "places") {
    if (body.lat == null || body.lon == null) return null;
    const q = new URLSearchParams({
      categories: body.categories ?? "",
      filter: `circle:${body.lon},${body.lat},${body.radius ?? 2000}`,
      bias: `proximity:${body.lon},${body.lat}`,
      limit: String(body.limit ?? 20),
      apiKey,
    });
    return `https://api.geoapify.com/v2/places?${q.toString()}`;
  }

  return null;
}
