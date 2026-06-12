import type { Destination, Member } from "../../types/trip.types";
import type { Place } from "./providers/GeoProvider";
import type { EnrichedDestination } from "./types/itinerary.types";
import { resolveAnchor } from "./anchor";
import { geoapifyProvider } from "./providers/geoapify";
import { activitiesToTypes } from "./categories";

const ENRICH_RADIUS_M = 2500;
const ENRICH_LIMIT = 20;

function normalizeStr(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * Por cada destino, resuelve el ancla geográfica y busca POIs reales
 * alrededor de ella según los intereses del grupo.
 * Si cualquier llamada de red falla, devuelve el destino con places vacío
 * para que el flujo continúe sin enriquecimiento (degradación elegante).
 */
export async function enrichDestinations(
  destinations: Destination[],
  members: Member[],
  token?: string,
): Promise<EnrichedDestination[]> {
  const interests = [
    ...new Set(
      members
        .filter((m) => m.member_preferences?.activity_preferences?.length)
        .flatMap((m) => m.member_preferences!.activity_preferences),
    ),
  ];

  const mustSees = [
    ...new Set(
      members
        .filter((m) => m.member_preferences?.attractions_preferences?.length)
        .flatMap((m) => m.member_preferences!.attractions_preferences),
    ),
  ];

  const results = await Promise.allSettled(
    destinations.map((dest) => enrichOne(dest, interests, mustSees, token)),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    console.warn(`enrichDestinations: falló ${destinations[i].city}`, r.reason);
    return {
      city: destinations[i].city,
      country: destinations[i].country,
      anchor: null,
      places: [],
    };
  });
}

async function enrichOne(
  dest: Destination,
  interests: string[],
  mustSees: string[],
  token?: string,
): Promise<EnrichedDestination> {
  const anchor = await resolveAnchor(
    { city: dest.city, country: dest.country, mustSees, interests },
    {
      geocode: (text) => geoapifyProvider.geocode(text, token),
      placesNear: (params) => geoapifyProvider.placesNear(params, token),
    },
  );

  if (!anchor) {
    return { city: dest.city, country: dest.country, anchor: null, places: [] };
  }

  const types = [...new Set([...activitiesToTypes(interests), "restaurant", "cafe"])];

  const places: Place[] = await geoapifyProvider.placesNear({
    lat: anchor.lat,
    lng: anchor.lng,
    categories: types,
    radius: ENRICH_RADIUS_M,
    limit: ENRICH_LIMIT,
  }, token);

  const normalizedCountry = normalizeStr(dest.country);
  const filtered = places.filter(
    (p) => !p.address || normalizeStr(p.address).includes(normalizedCountry),
  );

  return { city: dest.city, country: dest.country, anchor, places: filtered };
}
