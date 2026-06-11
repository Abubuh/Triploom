// Tipos de dominio del motor de itinerarios.

import type { Place } from "../providers/GeoProvider";

export type AnchorSource = "zone" | "must-sees" | "interests" | "city";

/** Entrada para resolver el ancla geográfica de un destino. */
export interface AnchorInput {
  city: string;
  country: string;
  zone?: string; // si el usuario eligió una zona
  mustSees?: string[]; // attractions_preferences (union de miembros)
  interests?: string[]; // activity_preferences (etiquetas tipo "Museos")
}

/** Punto base alrededor del cual se arma el día de un destino. */
export interface Anchor {
  lat: number;
  lng: number;
  label: string;
  source: AnchorSource;
  radiusMeters: number;
}

/** Destino enriquecido con ancla geográfica y POIs reales. */
export interface EnrichedDestination {
  city: string;
  country: string;
  anchor: Anchor | null;
  places: Place[];
}
