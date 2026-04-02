import {
  GeneratedItinerary,
  GenerateItineraryParams,
  ItineraryDay,
} from "../types/trip.types";

export const generateItinerary = async ({
  trip,
  destinations,
  members,
}: GenerateItineraryParams): Promise<GeneratedItinerary> => {
  const destinationsText = destinations
    .map((d) => `${d.city}, ${d.country} (${d.days} días)`)
    .join(" → ");

  const membersText = members
    .map((m) => {
      const prefs = m.member_preferences;
      if (!prefs) return `- ${m.profiles.name}: sin preferencias registradas`;
      return `- ${m.profiles.name}: presupuesto $${prefs.budget} MXN, ritmo ${prefs.travel_pace}, comida: ${prefs.food_preferences.join(", ") || "sin preferencia"}, actividades: ${prefs.activity_preferences.join(", ") || "sin preferencia"}, lugares de interés: ${prefs.attractions_preferences?.join(", ") || "sin preferencia"}`;
    })
    .join("\n");

  const prompt = `Eres un experto organizador de viajes con amplio conocimiento de precios reales en México y el mundo. Conoces los costos promedio de transporte, restaurantes, actividades y alojamiento en cada destino.

VIAJE: ${trip.name}
FECHAS: ${trip.start_date} al ${trip.end_date}
ALOJAMIENTO: ${trip.accommodation_type === "together" ? "Todos juntos" : "Por separado"}
RUTA: ${destinationsText}

VIAJEROS Y PREFERENCIAS:
${membersText}

INSTRUCCIONES:
- Genera un itinerario día a día considerando las preferencias de todos los viajeros
- Usa precios REALES y actuales del destino — considera que los presupuestos están en MXN
- Sugiere restaurantes, actividades y lugares con buena reputación, que sean tradición local, muy recomendados por viajeros o reconocidos en el destino — no solo los más baratos sino los que valen la pena
- Prioriza lugares icónicos, con historia, bien valorados o que la gente suele recomendar en ese destino
- Para destinos mexicanos considera precios realistas en MXN
- Considera los lugares de interés mencionados por los viajeros e inclúyelos en el itinerario
- Para alojamiento sugiere la mejor zona según el grupo
- Los costos estimados deben ser precisos y coherentes con el destino
- Todo lo anterior tomando en cuenta las preferencias de comida, actividades y lugares de interés de cada viajero — no sugieras algo que claramente no encaja con lo que el grupo prefiere

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional, sin markdown, sin backticks:
{
  "summary": "resumen breve del viaje",
  "budgetWarnings": [],
  "days": [
    {
      "day": 1,
      "date": "2026-03-31",
      "destination": "Ciudad",
      "activities": [
        {
          "time": "09:00",
          "title": "Nombre actividad",
          "description": "Descripción breve",
          "type": "activity",
          "estimatedCost": "$200 MXN"
        }
      ],
      "accommodation": {
        "suggestion": "Nombre del tipo de lugar",
        "zone": "Colonia o zona recomendada",
        "estimatedCost": "$800 MXN por noche",
        "airbnbLink": "https://www.airbnb.com.mx/s/Zona--Ciudad",
        "bookingLink": "https://www.booking.com/search?ss=Zona+Ciudad"
      }
    }
  ]
}`;

  const response = await fetch("/api/generate-itinerary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  const text = data.content[0].text;
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed: GeneratedItinerary = JSON.parse(clean);

  // Generar links reales por zona y ciudad
  parsed.days = parsed.days.map((day) => {
    if (day.accommodation) {
      const query = encodeURIComponent(
        `${day.accommodation.zone} ${day.destination}`,
      );
      day.accommodation.airbnbLink = `https://www.airbnb.com.mx/s/${query}`;
      day.accommodation.bookingLink = `https://www.booking.com/search?ss=${query}`;
    }
    return day;
  });

  return parsed;
};
