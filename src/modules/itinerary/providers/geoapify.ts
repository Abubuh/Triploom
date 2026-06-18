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

async function postGeo(body: Record<string, unknown>, token?: string): Promise<GeoapifyGeoResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/api/geo", { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    throw new Error(`/api/geo respondió ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Places — Google Places API (New) (mejor cobertura de POIs reales)
// ---------------------------------------------------------------------------

interface OpeningHoursPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

interface GooglePlace {
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    periods?: OpeningHoursPeriod[];
    weekdayDescriptions?: string[];
  };
}

// day: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb (convención Google)
const DAY_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function compactHours(periods: OpeningHoursPeriod[]): string | null {
  if (periods.length === 0) return null;

  // Construir slot por día (índice 0-6)
  const slots: (string | null)[] = Array(7).fill(null);
  for (const p of periods) {
    const d = p.open.day;
    if (!p.close) {
      slots[d] = "24h";
    } else {
      slots[d] = `${p.open.hour}:${pad2(p.open.minute)}-${p.close.hour}:${pad2(p.close.minute)}`;
    }
  }

  // Recorrer en orden Lun-Dom (1-6, 0) y agrupar días consecutivos con mismo slot
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups: string[] = [];
  let i = 0;
  while (i < order.length) {
    const hours = slots[order[i]] ?? "cerrado";
    let j = i + 1;
    while (j < order.length && (slots[order[j]] ?? "cerrado") === hours) j++;
    const label =
      j - i === 1
        ? DAY_ES[order[i]]
        : `${DAY_ES[order[i]]}-${DAY_ES[order[j - 1]]}`;
    groups.push(`${label}: ${hours}`);
    i = j;
  }

  return groups.join(" | ");
}

interface GooglePlacesResponse {
  places?: GooglePlace[];
  error?: { message: string };
}

async function postPlaces(body: Record<string, unknown>, token?: string): Promise<GooglePlacesResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const ATTEMPTS = 2;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch("/api/places", { method: "POST", headers, body: JSON.stringify(body) });
    } catch (netErr) {
      // Error de red: transitorio, reintentar salvo en el último intento
      if (attempt === ATTEMPTS) throw netErr;
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }
    if (res.ok) return res.json();
    // 4xx = error de cliente (params): no tiene caso reintentar.
    // 5xx en el último intento: también desistimos.
    if (res.status < 500 || attempt === ATTEMPTS) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `/api/places respondió ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`,
      );
    }
    // 5xx transitorio: esperar y reintentar
    await new Promise((r) => setTimeout(r, 300));
  }
  // Inalcanzable: el bucle siempre retorna o lanza.
  throw new Error("/api/places: agotados los reintentos");
}

// ---------------------------------------------------------------------------
// Provider híbrido: geocode → Geoapify, placesNear → Google
// ---------------------------------------------------------------------------

export const geoapifyProvider: GeoProvider = {
  async geocode(text: string, token?: string): Promise<GeocodeResult | null> {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const data = await postGeo({ action: "geocode", text: trimmed, limit: 1 }, token);
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
  }: PlacesNearParams, token?: string): Promise<Place[]> {
    if (categories.length === 0) return [];

    const data = await postPlaces({
      action: "nearby",
      lat,
      lng,
      radius,
      types: categories,   // aquí ya son tipos de Google (restaurant, museum…)
      limit: Math.min(limit, 20),
    }, token);

    const places: Place[] = [];
    for (const p of data.places ?? []) {
      const name = p.displayName?.text;
      const loc = p.location;
      if (!name || !loc) continue;
      const oh = p.regularOpeningHours;
      const openingHours =
        oh?.periods && oh.periods.length > 0
          ? compactHours(oh.periods)
          : oh?.weekdayDescriptions && oh.weekdayDescriptions.length > 0
            ? oh.weekdayDescriptions.join(" | ")
            : null;
      places.push({
        name,
        lat: loc.latitude,
        lng: loc.longitude,
        category: p.types?.[0] ?? null,
        address: p.formattedAddress ?? null,
        openingHours,
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
      });
    }

    return places;
  },
};
