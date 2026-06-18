// Helper compartido entre el dev-proxy de Vite y la función Vercel (api/places.ts).
// Llama a Google Places API (New) — searchNearby v1.
// FieldMask mínimo: solo name, location, types, displayName → SKU Essentials (barato).
// NO importa nada de "@vercel/node" para poder usarse en ambos entornos.

export interface GooglePlacesRequest {
  action: "nearby";
  lat: number;
  lng: number;
  radius: number;       // metros
  types: string[];      // tipos de Google Places (restaurant, museum, etc.)
  limit?: number;       // max 20 (límite de Google para Nearby Search)
}

// Respuesta cruda de Google Places (New) — solo lo que usamos.
export interface GooglePlacesRawPlace {
  name?: string;        // resource name (places/xxx)
  displayName?: { text: string };
  location?: { latitude: number; longitude: number };
  types?: string[];
  formattedAddress?: string;
  rating?: number;            // 1.0 – 5.0
  userRatingCount?: number;   // número de reseñas
  regularOpeningHours?: {
    weekdayDescriptions?: string[];  // ["Monday: 9:00 AM – 6:00 PM", ...]
  };
}

export interface GooglePlacesResponse {
  places?: GooglePlacesRawPlace[];
  error?: { message: string; status: string };
}

export async function callGooglePlaces(
  body: GooglePlacesRequest,
  apiKey: string,
): Promise<Response> {
  return fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.location,places.types,places.formattedAddress,places.rating,places.userRatingCount,places.regularOpeningHours",
      },
      body: JSON.stringify({
        includedTypes: body.types,
        maxResultCount: Math.min(body.limit ?? 20, 20),
        locationRestriction: {
          circle: {
            center: { latitude: body.lat, longitude: body.lng },
            radius: body.radius,
          },
        },
      }),
    },
  );
}
