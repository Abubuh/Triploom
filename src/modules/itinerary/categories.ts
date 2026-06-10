// Mapa de intereses (lo que elige el usuario en ACTIVITY_OPTIONS) → categorías
// de Geoapify Places. Ref: https://apidocs.geoapify.com/docs/places/#categories
// Si cambian las etiquetas en tripOptions.tsx, hay que actualizar estas llaves.

export const ACTIVITY_CATEGORY_MAP: Record<string, string[]> = {
  Gastronomía: ["catering.restaurant", "catering.cafe"],
  Museos: ["entertainment.museum"],
  "Atracciones turísticas": ["tourism.attraction", "tourism.sights"],
  Parques: ["leisure.park", "national_park"],
  Naturaleza: ["natural", "natural.water"],
  Playa: ["beach"],
  "Vida nocturna": ["catering.bar", "catering.pub", "adult.nightclub"],
  "Parques de diversiones": ["entertainment.theme_park"],
  Deportes: ["sport"],
  Compras: ["commercial.shopping_mall", "commercial.marketplace"],
};

// Las cocinas (FOOD_OPTIONS) no tienen filtro fino en Geoapify/OSM →
// todas se resuelven como restaurantes/cafés.
export const FOOD_CATEGORIES = ["catering.restaurant", "catering.cafe"];

/** Traduce una lista de intereses del usuario a categorías Geoapify (sin duplicados). */
export function activitiesToCategories(activities: string[]): string[] {
  const cats = activities.flatMap((a) => ACTIVITY_CATEGORY_MAP[a] ?? []);
  return [...new Set(cats)];
}
