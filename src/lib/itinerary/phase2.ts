import {
  GenerateItineraryParams,
  ItineraryDay,
  MemberPreferences,
} from "../../types/trip.types";

export interface ValidationIssue {
  type: "warning" | "error" | "hora_limite_excedida";
  day: number;
  message: string;
}

interface Phase2Result {
  itinerary: ItineraryDay[];
  issues: ValidationIssue[];
  summary: string;
  budgetWarnings: string[];
  maxActivities: number;
}

const PACE_MAX_ACTIVITIES: Record<MemberPreferences["travel_pace"], number> = {
  relaxed: 2,
  moderate: 3,
  intense: 4,
};

function dominantPace(
  paces: MemberPreferences["travel_pace"][],
): MemberPreferences["travel_pace"] {
  const counts: Record<string, number> = {};
  for (const p of paces) counts[p] = (counts[p] ?? 0) + 1;
  return (
    (["intense", "moderate", "relaxed"].find(
      (p) => counts[p],
    ) as MemberPreferences["travel_pace"]) ?? "moderate"
  );
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function validateItinerary(
  rawText: string,
  params: GenerateItineraryParams,
): Phase2Result {
  // Strip markdown fences and control characters
  const clean = rawText
    .replace(/```json|```/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .trim();

  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `Phase2: no se encontró JSON válido en la respuesta.\nRaw: ${rawText.slice(0, 300)}`,
    );
  }

  let parsed: {
    summary?: string;
    budgetWarnings?: string[];
    days?: ItineraryDay[];
  };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(
      `Phase2: JSON inválido — ${(e as Error).message}\nRaw: ${rawText.slice(0, 300)}`,
    );
  }

  const days: ItineraryDay[] = parsed.days ?? [];
  const summary = parsed.summary ?? "";
  const budgetWarnings = parsed.budgetWarnings ?? [];
  const issues: ValidationIssue[] = [];

  // Determine maxActivities
  const paces = params.members
    .filter((m) => m.member_preferences?.travel_pace)
    .map((m) => m.member_preferences!.travel_pace);
  const pace = dominantPace(paces);
  const maxActivities = PACE_MAX_ACTIVITIES[pace];

  // Collect all attraction preferences
  const allAttractions = params.members
    .filter((m) => m.member_preferences?.attractions_preferences?.length)
    .flatMap((m) => m.member_preferences!.attractions_preferences)
    .map((a) => a.toLowerCase());

  // 1. Check priority places are included
  for (const attraction of allAttractions) {
    const found = days.some((day) =>
      day.activities.some(
        (a) =>
          a.title.toLowerCase().includes(attraction) ||
          a.description.toLowerCase().includes(attraction) ||
          a.location.toLowerCase().includes(attraction),
      ),
    );
    if (!found) {
      issues.push({
        type: "warning",
        day: 0,
        message: `Lugar prioritario no encontrado en el itinerario: "${attraction}"`,
      });
    }
  }

  for (const day of days) {
    const dayNum = day.day_number;
    const activities = day.activities ?? [];

    // 2. Activity count limit
    const realActivities = activities.filter((a) => a.type === "actividad");
    if (realActivities.length > maxActivities) {
      issues.push({
        type: "error",
        day: dayNum,
        message: `Día ${dayNum}: ${realActivities.length} actividades exceden el máximo de ${maxActivities} para ritmo ${pace}`,
      });
    }

    // 3. Schedule overlaps
    for (let i = 0; i < activities.length - 1; i++) {
      const endMin = timeToMinutes(activities[i].time_end);
      const nextStartMin = timeToMinutes(activities[i + 1].time_start);
      if (endMin > nextStartMin) {
        issues.push({
          type: "error",
          day: dayNum,
          message: `Día ${dayNum}: solapamiento entre "${activities[i].title}" (termina ${activities[i].time_end}) y "${activities[i + 1].title}" (inicia ${activities[i + 1].time_start})`,
        });
      }
    }

    // 4. full_day rule — no intermediate activities between breakfast and dinner
    const fullDayActivity = activities.find(
      (a) => a.full_day && a.type === "actividad",
    );
    if (fullDayActivity) {
      const intermediates = activities.filter(
        (a) =>
          a !== fullDayActivity &&
          a.type === "actividad" &&
          !a.title.toLowerCase().includes("desayuno") &&
          !a.title.toLowerCase().includes("cena"),
      );
      if (intermediates.length > 0) {
        issues.push({
          type: "error",
          day: dayNum,
          message: `Día ${dayNum}: actividad de día completo "${fullDayActivity.title}" tiene actividades intermedias no permitidas`,
        });
      }
    }

    // 5. End time after 22:00
    if (activities.length > 0) {
      const lastActivity = activities[activities.length - 1];
      if (timeToMinutes(lastActivity.time_end) > timeToMinutes("22:00")) {
        issues.push({
          type: "hora_limite_excedida",
          day: dayNum,
          message: `Día ${dayNum}: la última actividad termina a las ${lastActivity.time_end}, después de las 22:00`,
        });
      }
    }
  }

  return { itinerary: days, issues, summary, budgetWarnings, maxActivities };
}
