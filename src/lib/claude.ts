import {
  GeneratedItinerary,
  GenerateItineraryParams,
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
    .filter((m) => m.member_preferences)
    .map((m) => {
      const prefs = m.member_preferences!;
      const parts = [`- ${m.profiles.name}`];
      if (prefs.budget)
        parts.push(`presupuesto $${prefs.budget} ${trip.currency ?? "MXN"}`);
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
  const prompt = `
Genera un itinerario día a día basado en estos datos:
VIAJE: ${trip.name}
FECHAS: ${trip.start_date} al ${trip.end_date}
ALOJAMIENTO: ${accommodationInstruction}
MONEDA: ${trip.currency ?? "MXN"}
RUTA: ${destinationsText}

VIAJEROS:
${membersText}

- Usa precios reales en ${trip.currency ?? "MXN"}
- Prioriza lugares icónicos y bien valorados
- Respeta las preferencias de comida, actividades y lugares de interés

Responde ÚNICAMENTE con este JSON:
{
  "summary": "resumen breve del viaje",
  "budgetWarnings": [],
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "destination": "Ciudad",
      "activities": [
        {
          "time": "09:00",
          "title": "Nombre actividad",
          "description": "Descripción breve",
          "type": "activity",
          "estimatedCost": "200 ${trip.currency ?? "MXN"}"
        }
      ],
      "accommodation": {
        "suggestion": "Nombre del lugar",
        "zone": "Zona recomendada"
      }
    }
  ]
}`;

  const response = import.meta.env.DEV
    ? await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 8000,
          system: [
            {
              type: "text",
              text: "Eres un experto organizador de viajes. Respondes ÚNICAMENTE con JSON válido, sin texto adicional ni backticks.",
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: prompt }],
        }),
      })
    : await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

  const data = await response.json();
  const text = data.content[0].text;
  const clean = text
    .replace(/```json|```/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  const parsed: GeneratedItinerary = JSON.parse(jsonMatch[0]);

  return parsed;
};
