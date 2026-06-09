import type { GeoProvider, GeocodeResult } from "./GeoProvider";

// Forma cruda (GeoJSON) que devuelve Geoapify vía /api/geo. Solo tomamos lo
// que necesitamos y lo normalizamos; el resto del motor nunca ve este shape.
interface GeoapifyFeature {
  properties: {
    lat: number;
    lon: number;
    formatted?: string;
    city?: string;
    country?: string;
  };
}

interface GeoapifyResponse {
  features?: GeoapifyFeature[];
  error?: string;
}

async function postGeo(
  body: Record<string, unknown>,
): Promise<GeoapifyResponse> {
  const res = await fetch("/api/geo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`/api/geo respondió ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const geoapifyProvider: GeoProvider = {
  async geocode(text: string): Promise<GeocodeResult | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const data = await postGeo({ action: "geocode", text: trimmed, limit: 1 });
    const props = data.features?.[0]?.properties;
    if (!props || typeof props.lat !== "number" || typeof props.lon !== "number") {
      return null;
    }

    return {
      lat: props.lat,
      lng: props.lon,
      formatted: props.formatted ?? trimmed,
      city: props.city ?? null,
      country: props.country ?? null,
    };
  },
};
