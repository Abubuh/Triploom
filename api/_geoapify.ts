// Helper compartido entre el dev-proxy de Vite (vite.config.ts) y la función
// de Vercel (api/geo.ts). Mantiene la construcción de URLs de Geoapify en un
// solo lugar. NO debe importar nada de "@vercel/node" para poder usarse en
// ambos entornos.

const MAX_RADIUS_M = 50000;     // 50 km
const MAX_PLACES_LIMIT = 20;
const MAX_GEOCODE_LIMIT = 5;
const MAX_TEXT_LEN = 200;
const MAX_CATEGORIES_LEN = 500;

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function isValidLat(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -90 && v <= 90;
}
function isValidLon(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= -180 && v <= 180;
}

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
      text: (body.text ?? "").slice(0, MAX_TEXT_LEN),
      limit: String(clampNum(body.limit, 1, MAX_GEOCODE_LIMIT, 1)),
      apiKey,
    });
    return `https://api.geoapify.com/v1/geocode/search?${q.toString()}`;
  }

  if (body.action === "places") {
    if (!isValidLat(body.lat) || !isValidLon(body.lon)) return null;
    const radius = clampNum(body.radius, 1, MAX_RADIUS_M, 2000);
    const q = new URLSearchParams({
      categories: (body.categories ?? "").slice(0, MAX_CATEGORIES_LEN),
      filter: `circle:${body.lon},${body.lat},${radius}`,
      bias: `proximity:${body.lon},${body.lat}`,
      limit: String(clampNum(body.limit, 1, MAX_PLACES_LIMIT, 20)),
      apiKey,
    });
    return `https://api.geoapify.com/v2/places?${q.toString()}`;
  }

  return null;
}
