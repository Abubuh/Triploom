// Utilidades geográficas puras (sin dependencias ni red). Base del anclaje
// y del geo-fence de pertenencia.

/** Coordenada geográfica. */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Caja delimitadora para verificar pertenencia a una zona. */
export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia en kilómetros entre dos coordenadas (fórmula de Haversine). */
export function haversine(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Centro de gravedad (promedio) de un conjunto de coordenadas. */
export function centroid(points: GeoPoint[]): GeoPoint | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** Caja delimitadora que contiene a todos los puntos. */
export function boundingBox(points: GeoPoint[]): BoundingBox | null {
  if (points.length === 0) return null;
  return points.reduce<BoundingBox>(
    (box, p) => ({
      minLat: Math.min(box.minLat, p.lat),
      minLng: Math.min(box.minLng, p.lng),
      maxLat: Math.max(box.maxLat, p.lat),
      maxLng: Math.max(box.maxLng, p.lng),
    }),
    {
      minLat: points[0].lat,
      minLng: points[0].lng,
      maxLat: points[0].lat,
      maxLng: points[0].lng,
    },
  );
}

/** ¿El punto cae dentro de la caja? (con margen opcional en grados). */
export function isWithinBox(
  point: GeoPoint,
  box: BoundingBox,
  marginDeg = 0,
): boolean {
  return (
    point.lat >= box.minLat - marginDeg &&
    point.lat <= box.maxLat + marginDeg &&
    point.lng >= box.minLng - marginDeg &&
    point.lng <= box.maxLng + marginDeg
  );
}
