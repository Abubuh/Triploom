// Mapa de intereses (lo que elige el usuario en ACTIVITY_OPTIONS) → tipos de
// Google Places (New) API. Ref: https://developers.google.com/maps/documentation/places/web-service/place-types
// Si cambian las etiquetas en tripOptions.tsx, hay que actualizar estas llaves.

export const ACTIVITY_TYPES_MAP: Record<string, string[]> = {
  Gastronomía: ["restaurant", "cafe", "bakery"],
  Museos: ["museum"],
  "Atracciones turísticas": ["tourist_attraction", "historical_landmark", "monument"],
  Parques: ["park", "national_park"],
  Naturaleza: ["national_park", "campground", "hiking_area"],
  Playa: ["beach"],
  "Vida nocturna": ["bar", "night_club", "pub"],
  "Parques de diversiones": ["amusement_park", "amusement_center"],
  Deportes: ["sports_complex", "sports_club", "stadium"],
  Compras: ["shopping_mall", "market", "department_store"],
};

// Las cocinas (FOOD_OPTIONS) no tienen filtro fino en Google Places →
// todas se resuelven como restaurantes/cafés.
export const FOOD_TYPES = ["restaurant", "cafe"];

/** Traduce una lista de intereses del usuario a tipos de Google Places (sin duplicados). */
export function activitiesToTypes(activities: string[]): string[] {
  const types = activities.flatMap((a) => ACTIVITY_TYPES_MAP[a] ?? []);
  return [...new Set(types)];
}
