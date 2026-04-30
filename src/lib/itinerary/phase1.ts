import {
  GenerateItineraryParams,
} from "../../types/trip.types";

import { PACE_MAX_ACTIVITIES } from "../../types/itinerary.generated.types";
import { dominantPace } from "./utils/pace";

export function buildPrompt({
  trip,
  destinations,
  members,
}: GenerateItineraryParams): string {
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
    .map((d) => `${d.city}, ${d.country} (${d.days} días)`)
    .join(" → ");

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

  return `Genera un itinerario día a día basado en estos datos:
VIAJE: ${trip.name}
FECHAS: ${trip.start_date} al ${trip.end_date}
ALOJAMIENTO: ${accommodationInstruction}
MONEDA: ${currency}
RUTA: ${destinationsText}
Si hay múltiples destinos, optimiza el orden geográfico para minimizar distancias de traslado.
${attractionsSection}
VIAJEROS:
${membersText}

REGLAS OBLIGATORIAS:
1. El día inicia a las 09:00. Encadena actividades desde ahí.
2. Máximo ${maxActivities} actividades por día (ritmo del grupo: ${pace}). No incluyas buffers en este conteo.
3. Mínimo 45 minutos entre inicio de actividades. Considera duración realista según el tipo:
   - Museo / galería: 2h
   - Parque / zona al aire libre: 1.5h
   - Restaurante / comida: 1h
   - Tour guiado: 3h
   - Playa / cenote: 2.5h
   - Parque temático o excursión de día: 6-8h (marcar full_day: true)
4. Agrupa actividades geográficamente cercanas para minimizar traslados.
5. Si una actividad es parque temático, excursión larga o tour de día completo: marcarla con full_day: true. En ese día SOLO puede haber un desayuno antes (≈09:00) y una cena después (≈20:00). Ninguna actividad intermedia.
6. Los costos deben ser rangos realistas en ${currency}: { "min": N, "max": N }. Para actividades gratuitas usa { "min": 0, "max": 0 }.
7. Prioriza los LUGARES PRIORITARIOS — inclúyelos antes de añadir otras actividades.
8. Usa precios reales del destino.
9. Cada actividad debe ser UNA sola cosa — no mezcles desayuno con traslado, 
ni visita con vida nocturna. Si son dos cosas distintas, son dos actividades separadas.
10. Cada día debe incluir:
   - 1 desayuno (morning)
   - 1 comida (afternoon)
   - 1 cena (evening)
   (Excepción: en días de excursión completa, solo desayuno y cena — sin comida intermedia)

11. Las actividades de tipo comida deben clasificarse como:
   - breakfast: cafeterías, panaderías, brunch
   - lunch: restaurantes casuales o locales
   - dinner: restaurantes formales o experiencias nocturnas

12. Las comidas deben ser lugares reales, específicos y reconocibles.

13. Coherencia obligatoria:
- Si category es "breakfast", entonces type debe ser "food" y time_of_day "morning"
- Si category es "lunch", entonces type debe ser "food" y time_of_day "afternoon"
- Si category es "dinner", entonces type debe ser "food" y time_of_day "evening"

14. El campo search_query debe ser específico y listo para búsqueda en mapas:
incluye nombre + ciudad + país.

Los campos deben cumplir:
- type: uno de ["activity", "food", "transport"]
- category: uno de ["breakfast", "lunch", "dinner", "attraction", "experience"]
- time_of_day: uno de ["morning", "afternoon", "evening"]

SCHEMA EXACTO — devuelve ÚNICAMENTE este JSON, sin markdown, sin texto adicional:
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
          "description": "Descripción breve y útil",
          "estimated_cost": { "min": 0, "max": 0 },
          "place": {
            "name": "Nombre del lugar",
            "address": "Dirección o zona",
            "search_query": "Nombre + ciudad + país",
            "lat": null,
            "lng": null
          },
          "type": "activity",
            "category": "attraction",
            "time_of_day": "morning",
            "full_day": false
          }
      ],
      "accommodation": {
        "name": "Nombre del alojamiento sugerido",
        "zone": "Zona recomendada",
        "amount": 0,
        "currency": "${currency}",
        "airbnb_url": null,
        "booking_url": null
      },
      "day_summary": {
        "total_hours": 0,
        "total_cost_min": 0,
        "total_cost_max": 0,
        "activity_count": 0
      }
    }
  ]
}`;
}
