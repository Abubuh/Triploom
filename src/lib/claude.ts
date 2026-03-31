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
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

  const destinationsText = destinations
    .map((d) => `${d.city}, ${d.country} (${d.days} días)`)
    .join(" → ");

  const membersText = members
    .map((m) => {
      const prefs = m.member_preferences;
      if (!prefs) return `- ${m.profiles.name}: sin preferencias registradas`;
      return `- ${m.profiles.name}: presupuesto $${prefs.budget} MXN, ritmo ${prefs.travel_pace}, comida: ${prefs.food_preferences.join(", ") || "sin preferencia"}, actividades: ${prefs.activity_preferences.join(", ") || "sin preferencia"}`;
    })
    .join("\n");

  const prompt = `Eres un experto organizador de viajes. Genera un itinerario detallado para el siguiente viaje:

VIAJE: ${trip.name}
FECHAS: ${trip.start_date} al ${trip.end_date}
ALOJAMIENTO: ${trip.accommodation_type === "together" ? "Todos juntos" : "Por separado"}
RUTA: ${destinationsText}

VIAJEROS Y PREFERENCIAS:
${membersText}

Genera un itinerario día a día considerando las preferencias de todos los viajeros. Para cada día incluye actividades con horarios, sugerencias de comida según sus preferencias, y opciones de transporte entre destinos.

Para el alojamiento, sugiere la mejor zona para hospedarse en cada destino.

Si el presupuesto de algún viajero parece insuficiente para el destino, indícalo en budgetWarnings.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional, sin markdown, sin backticks:
{
  "summary": "resumen breve del viaje",
  "budgetWarnings": ["advertencia si aplica"],
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
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
  return parsed;
};
