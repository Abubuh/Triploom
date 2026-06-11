import type {
  GeoProvider,
  GeocodeResult,
  Place,
  PlacesNearParams,
} from "./GeoProvider";

// ---------------------------------------------------------------------------
// Geocoding — Geoapify (gratis, sin tarjeta, sin límite ajustable por cuota)
// ---------------------------------------------------------------------------

interface GeoapifyProperties {
  lat?: number;
  lon?: number;
  formatted?: string;
  city?: string;
  country?: string;
}

interface GeoapifyGeoResponse {
  features?: { properties: GeoapifyProperties }[];
}

async function postGeo(body: Record<string, unknown>): Promise<GeoapifyGeoResponse> {
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

// ---------------------------------------------------------------------------
// Places — Google Places API (New) (mejor cobertura de POIs reales)
// ---------------------------------------------------------------------------

interface GooglePlace {
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
  formattedAddress?: string;
}

interface GooglePlacesResponse {
  places?: GooglePlace[];
  error?: { message: string };
}

async function postPlaces(body: Record<string, unknown>): Promise<GooglePlacesResponse> {
  const res = await fetch("/api/places", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`/api/places respondió ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Provider híbrido: geocode → Geoapify, placesNear → Google
// ---------------------------------------------------------------------------

export const geoapifyProvider: GeoProvider = {
  async geocode(text: string): Promise<GeocodeResult | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const data = await postGeo({ action: "geocode", text: trimmed, limit: 1 });
    const props = data.features?.[0]?.properties;
    if (
      !props ||
      typeof props.lat !== "number" ||
      typeof props.lon !== "number"
    ) {
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

  async placesNear({
    lat,
    lng,
    categories,
    radius = 2000,
    limit = 20,
  }: PlacesNearParams): Promise<Place[]> {
    if (categories.length === 0) return [];

    const data = await postPlaces({
      action: "nearby",
      lat,
      lng,
      radius,
      types: categories,   // aquí ya son tipos de Google (restaurant, museum…)
      limit: Math.min(limit, 20),
    });

    const places: Place[] = [];
    for (const p of data.places ?? []) {
      const name = p.displayName?.text;
      const loc = p.location;
      if (!name || !loc) continue;
      places.push({
        name,
        lat: loc.latitude,
        lng: loc.longitude,
        category: p.types?.[0] ?? null,
        address: p.formattedAddress ?? null,
      });
    }
    return places;
  },
};
