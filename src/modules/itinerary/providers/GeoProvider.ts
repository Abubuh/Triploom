import type { GeoPoint } from "../geo/geo";

/** Resultado normalizado de geocodificar un texto (lugar / zona / ciudad). */
export interface GeocodeResult extends GeoPoint {
  formatted: string;
  city: string | null;
  country: string | null;
}

/** POI real normalizado (resultado de Places). */
export interface Place extends GeoPoint {
  name: string;
  category: string | null;
  address: string | null;
}

export interface PlacesNearParams {
  lat: number;
  lng: number;
  categories: string[];
  radius?: number; // metros (default 2000)
  limit?: number; // default 20
}

/**
 * Fuente de datos geográficos. Hoy la implementa Geoapify; está detrás de esta
 * interfaz para poder cambiar de proveedor (Foursquare, Google, etc.) sin tocar
 * el resto del motor. Se irá ampliando con `travelMatrix`.
 */
export interface GeoProvider {
  /** Geocodifica un texto a coordenadas. Devuelve null si no hay match. */
  geocode(text: string, token?: string): Promise<GeocodeResult | null>;
  /** POIs reales cerca de un punto, filtrados por categorías Geoapify. */
  placesNear(params: PlacesNearParams, token?: string): Promise<Place[]>;
}
