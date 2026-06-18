import { GenerateItineraryParams } from "../../types/trip.types";

import { PACE_MAX_ACTIVITIES } from "../../types/itinerary.generated.types";
import { dominantPace } from "./utils/pace";
import type { EnrichedDestination } from "../../modules/itinerary/types/itinerary.types";

export function buildPrompt(
  { trip, destinations, members }: GenerateItineraryParams,
  enriched: EnrichedDestination[] = [],
): string {
  const currency = trip.currency ?? "MXN";

  const paces = members
    .filter((m) => m.member_preferences?.travel_pace)
    .map((m) => m.member_preferences!.travel_pace);
  const pace = dominantPace(paces);
  const maxActivities = `${PACE_MAX_ACTIVITIES[pace]}`;

  const allAttractions = members
    .filter((m) => m.member_preferences?.attractions_preferences?.length)
    .flatMap((m) => m.member_preferences!.attractions_preferences);
  const uniqueAttractions = [...new Set(allAttractions)];

  const destinationsText = destinations
    .map((d) => `${d.city}, ${d.country} (${d.days} días) — SOLO lugares dentro de ${d.country}`)
    .join(" → ");

  const uniqueCountries = [...new Set(destinations.map((d) => d.country))];
  const geoRestriction = `RESTRICCIÓN GEOGRÁFICA ABSOLUTA:
Cada actividad debe estar dentro del país del destino del día.
Países permitidos en este itinerario: ${uniqueCountries.join(", ")}.
Está PROHIBIDO sugerir lugares en cualquier otro país, aunque estén a minutos del destino (ej: si el destino es Matamoros, México, no incluyas nada en Brownsville, Texas, EUA — cruzar requiere visa y documentos).
No hay excepciones. Si no conoces un lugar real dentro del país correcto, usa una zona conocida de esa ciudad.`;

  const membersText = members
    .filter((m) => m.member_preferences)
    .map((m) => {
      const prefs = m.member_preferences!;
      const parts = [`- ${m.profiles.name}`];
      if (prefs.budget) parts.push(`presupuesto $${prefs.budget} ${currency}`);
      if (prefs.travel_pace) parts.push(`ritmo ${prefs.travel_pace}`);
      if (prefs.food_preferences?.length)
        parts.push(`comida: ${prefs.food_preferences.join(", ")}`);
      if (prefs.activity_preferences?.length)
        parts.push(`actividades: ${prefs.activity_preferences.join(", ")}`);
      if (prefs.attractions_preferences?.length)
        parts.push(`visitar: ${prefs.attractions_preferences.join(", ")}`);
      return parts.join(", ");
    })
    .join("\n");

  const accommodationInstruction =
    trip.accommodation_type === "together"
      ? `El grupo se aloja JUNTO — sugiere UN solo Airbnb o casa grande para todos. El costo del alojamiento es compartido entre ${members.length} personas.`
      : `Cada viajero se aloja POR SEPARADO — sugiere zonas económicas con buenas opciones de hoteles u hostales individuales. El costo es personal.`;

  const attractionsSection =
    uniqueAttractions.length > 0
      ? `\nLUGARES PRIORITARIOS (anclar primero, antes de rellenar con otras actividades):\n${uniqueAttractions.map((a) => `- ${a}`).join("\n")}\n`
      : "";

  const enrichedSection = enriched
    .filter((e) => e.places.length > 0)
    .map((e) => {
      const list = e.places
        .map((p) => {
          let line = `  - ${p.name}${p.address ? ` | ${p.address}` : ""} → search_query: "${p.name}, ${e.city}, ${e.country}"`;
          if (p.openingHours) line += ` | horarios: ${p.openingHours}`;
          return line;
        })
        .join("\n");
      return `### ${e.city}, ${e.country}\n${list}`;
    })
    .join("\n\n");

  const realPlacesSection = enrichedSection
    ? `\nLUGARES REALES VERIFICADOS (úsalos como actividades; prioriza estos sobre lugares que inventes):\nPara cada lugar de esta lista, usa EXACTAMENTE el search_query indicado — no lo modifiques.\nCuando se indican horarios, respétalos estrictamente — no programes una visita si el lugar está cerrado en ese horario o día:\n${enrichedSection}\n`
    : "";

  return `${geoRestriction}

Genera un itinerario día a día basado en estos datos:
VIAJE: ${trip.name}
FECHAS: ${trip.start_date} al ${trip.end_date}
ALOJAMIENTO: ${accommodationInstruction}
MONEDA: ${currency}
RUTA: ${destinationsText}
Si hay múltiples destinos, optimiza el orden geográfico para minimizar distancias de traslado.
${attractionsSection}${realPlacesSection}
VIAJEROS:
${membersText}

REGLAS:
1. El día inicia a las 09:00. Encadena actividades desde ahí.
2. Máximo ${maxActivities} actividades por día (ritmo: ${pace}). No cuentes traslados.
3. Duración mínima entre actividades: 45 min. Referencias de duración:
   - Museo/galería: 2h | Parque/exterior: 1.5h | Comida: 1h | Tour guiado: 3h | Playa/cenote: 2.5h | Excursión día completo: 6-8h (full_day: true)
4. Agrupa actividades cercanas. Máximo 15-20 min de traslado entre ellas.
5. Días full_day: solo desayuno (09:00) + actividad + cena (20:00). Sin intermedias.
6. Costos en ${currency}: { "min": N, "max": N }. Gratuito: { "min": 0, "max": 0 }.
7. Cada día incluye: 1 desayuno (morning) + 1 comida (afternoon) + 1 cena (evening).
8. Coherencia de campos:
   - breakfast → type: "food", time_of_day: "morning"
   - lunch → type: "food", time_of_day: "afternoon"
   - dinner → type: "food", time_of_day: "evening"
9. search_query: "<nombre>, <ciudad>, <país>". Si es zona: "restaurantes en el centro de <ciudad>, <país>".
10. Lugares: reales, verificables, dentro del país del destino del día. Si no conoces un lugar específico, usa una zona real — nunca inventes un negocio.
11. Horarios de apertura: si un lugar de la lista verificada tiene horarios indicados, NO lo programes fuera de ese horario ni en un día en que esté cerrado. Si no hay otro lugar disponible a esa hora, sustitúyelo por una actividad al aire libre o zona pública que no tenga restricción de horario.

Valores válidos: type: ["activity","food","transport"] | category: ["breakfast","lunch","dinner","attraction","experience"] | time_of_day: ["morning","afternoon","evening"]

SCHEMA EXACTO — devuelve ÚNICAMENTE este JSON, sin markdown ni texto adicional:
{
  "summary": "resumen breve del viaje en 1-2 oraciones",
  "budgetWarnings": [],
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "destination": "Ciudad",
      "flags": [],
      "activities": [
        {
          "id": "d1-a1",
          "time_start": "09:00",
          "time_end": "10:30",
          "title": "Nombre actividad",
          "estimated_cost": { "min": 0, "max": 0 },
          "place": { "name": "Nombre", "address": "Dirección o zona", "search_query": "Nombre, ciudad, país", "lat": null, "lng": null },
          "type": "activity",
          "category": "attraction",
          "time_of_day": "morning",
          "full_day": false
        }
      ],
      "accommodation": { "name": "...", "zone": "...", "amount": 0, "currency": "${currency}", "airbnb_url": null, "booking_url": null },
      "day_summary": { "total_hours": 0, "total_cost_min": 0, "total_cost_max": 0, "activity_count": 0 }
    }
  ]
}`;
}
