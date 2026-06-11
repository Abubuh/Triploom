import type { GeocodeResult, GeoProvider } from "./providers/GeoProvider";
import type {
  Anchor,
  AnchorInput,
  AnchorSource,
} from "./types/itinerary.types";
import { geoapifyProvider } from "./providers/geoapify";
import { centroid } from "./geo/geo";
import { activitiesToTypes } from "./categories";

const DAY_RADIUS_M = 2500; // radio alrededor del ancla para las actividades del día
const CITY_SCAN_RADIUS_M = 8000; // radio para escanear la ciudad buscando el cluster de intereses

/**
 * Resuelve el ancla geográfica de un destino con una cascada que nunca pide lo
 * que el usuario no tiene: zona → must-sees → intereses → centro de ciudad.
 * `provider` es inyectable para poder cambiar de fuente sin tocar esta lógica.
 */
export async function resolveAnchor(
  input: AnchorInput,
  provider: GeoProvider = geoapifyProvider,
): Promise<Anchor | null> {
  const q = (s: string) => `${s}, ${input.city}, ${input.country}`;
  const make = (
    lat: number,
    lng: number,
    label: string,
    source: AnchorSource,
  ): Anchor => ({ lat, lng, label, source, radiusMeters: DAY_RADIUS_M });

  // 1. Zona elegida por el usuario
  if (input.zone?.trim()) {
    const g = await provider.geocode(q(input.zone));
    if (g) return make(g.lat, g.lng, input.zone, "zone");
  }

  // 2. Centroide de los must-sees
  if (input.mustSees?.length) {
    const results = await Promise.all(
      input.mustSees.map((m) => provider.geocode(q(m))),
    );
    const points = results.filter((r): r is GeocodeResult => r !== null);
    const c = centroid(points);
    if (c) {
      return make(c.lat, c.lng, `Cerca de ${input.mustSees[0]}`, "must-sees");
    }
  }

  // Centro de ciudad: base para los niveles 3 y 4
  const cityCenter = await provider.geocode(`${input.city}, ${input.country}`);
  if (!cityCenter) return null;

  // 3. Cluster de POIs de los intereses
  const types = activitiesToTypes(input.interests ?? []);
  if (types.length) {
    const pois = await provider.placesNear({
      lat: cityCenter.lat,
      lng: cityCenter.lng,
      categories: types,
      radius: CITY_SCAN_RADIUS_M,
      limit: 50,
    });
    const c = centroid(pois);
    if (c) {
      return make(c.lat, c.lng, `Zona de interés en ${input.city}`, "interests");
    }
  }

  // 4. Centro de ciudad (último recurso)
  return make(
    cityCenter.lat,
    cityCenter.lng,
    `Centro de ${input.city}`,
    "city",
  );
}
