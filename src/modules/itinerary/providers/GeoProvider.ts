import type { GeoPoint } from "../geo/geo";

/** Resultado normalizado de geocodificar un texto (lugar / zona / ciudad). */
export interface GeocodeResult extends GeoPoint {
  formatted: string;
  city: string | null;
  country: string | null;
}

/**
 * Fuente de datos geográficos. Hoy la implementa Geoapify; está detrás de esta
 * interfaz para poder cambiar de proveedor (Foursquare, Google, etc.) sin tocar
 * el resto del motor. Se irá ampliando con `placesNear` y `travelMatrix`.
 */
export interface GeoProvider {
  /** Geocodifica un texto a coordenadas. Devuelve null si no hay match. */
  geocode(text: string): Promise<GeocodeResult | null>;
}
