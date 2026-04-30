import {
  Activity,
  PACE_MAX_ACTIVITIES,
} from "../../types/itinerary.generated.types";
import { GenerateItineraryParams, ItineraryDay } from "../../types/trip.types";
import { dominantPace } from "./utils/pace";

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

const VALID_TYPES = ["activity", "food", "transport"];
const VALID_TIME = ["morning", "afternoon", "evening"];
const VALID_CATEGORY = [
  "breakfast",
  "lunch",
  "dinner",
  "attraction",
  "experience",
];
const MIN_FULL_DAY_MINUTES = 360;

function isValidTime(time?: string): boolean {
  if (!time) return false;

  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23) return false;
  if (minutes < 0 || minutes > 59) return false;

  return true;
}

function timeToMinutes(time?: string): number {
  if (!time || !isValidTime(time)) return Number.MAX_SAFE_INTEGER;

  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function normalizeActivity(a: Partial<Activity>): Activity {
  return {
    title: a.title ?? "",
    description: a.description ?? "",
    time_start: a.time_start ?? "",
    time_end: a.time_end ?? "",
    full_day: a.full_day ?? false,
    place: a.place ?? { name: "", address: "", search_query: "", lat: null, lng: null },

    type: a.type?.toLowerCase() ?? "",
    category: a.category?.toLowerCase() ?? "",
    time_of_day: a.time_of_day?.toLowerCase() ?? "",
  };
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

  const summary = parsed.summary ?? "";
  const budgetWarnings = parsed.budgetWarnings ?? [];
  const issues: ValidationIssue[] = [];

  // Determine maxActivities
  const paces = params.members
    .filter((m) => m.member_preferences?.travel_pace)
    .map((m) => m.member_preferences!.travel_pace);
  const pace = dominantPace(paces);
  const maxActivities = PACE_MAX_ACTIVITIES[pace];

  if (!Array.isArray(parsed.days)) {
    issues.push({
      type: "error",
      day: 0,
      message: "Phase2: la respuesta no contiene un array 'days' válido",
    });
    return { itinerary: [], issues, summary, budgetWarnings, maxActivities };
  }

  const days: ItineraryDay[] = parsed.days;

  // Collect all attraction preferences
  const allAttractions = params.members
    .filter((m) => m.member_preferences?.attractions_preferences?.length)
    .flatMap((m) => m.member_preferences!.attractions_preferences)
    .map((a) => a.toLowerCase());

  // 1. Check priority places are included
  for (const attraction of allAttractions) {
    const found = days.some((day) =>
      (Array.isArray(day.activities) ? day.activities : []).some(
        (a) =>
          (a.title ?? "").toLowerCase().includes(attraction) ||
          (a.description ?? "").toLowerCase().includes(attraction) ||
          (a.place?.name ?? "").toLowerCase().includes(attraction) ||
          (a.place?.search_query ?? "").toLowerCase().includes(attraction),
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
    if (typeof day.day_number !== "number" || day.day_number < 1) {
      issues.push({
        type: "error",
        day: 0,
        message: `Día con day_number inválido: ${JSON.stringify(day.day_number)}`,
      });
      continue;
    }
    const dayNum = day.day_number;
    const rawActivities = Array.isArray(day.activities) ? day.activities : [];
    const activities = rawActivities.map(normalizeActivity);
    const validActivities = activities.filter(
      (a) => a.time_start && a.time_end,
    );
    const sortedActivities = [...validActivities].sort(
      (a, b) => timeToMinutes(a.time_start) - timeToMinutes(b.time_start),
    );
    for (const a of activities) {
      const title = a.title ?? "Actividad sin nombre";
      if (!a.place?.search_query) {
        issues.push({
          type: "error",
          day: dayNum,
          message: `Actividad "${title}" sin place válido`,
        });
      }

      if (!VALID_TYPES.includes(a.type)) {
        issues.push({
          type: "error",
          day: dayNum,
          message: `Tipo inválido: ${a.type}`,
        });
      }

      if (!VALID_TIME.includes(a.time_of_day)) {
        issues.push({
          type: "warning",
          day: dayNum,
          message: `Actividad "${title}": time_of_day inválido ("${a.time_of_day}")`,
        });
      }
      if (!VALID_CATEGORY.includes(a.category)) {
        issues.push({
          type: "warning",
          day: dayNum,
          message: `Categoría inválida: ${a.category}`,
        });
      }
      if (!isValidTime(a.time_start) || !isValidTime(a.time_end)) {
        issues.push({
          type: "error",
          day: dayNum,
          message: `Actividad "${title}" tiene formato de hora inválido`,
        });
      }
      if (
        !a.estimated_cost ||
        typeof a.estimated_cost.min !== "number" ||
        typeof a.estimated_cost.max !== "number"
      ) {
        issues.push({
          type: "error",
          day: dayNum,
          message: `Actividad "${title}" sin estimated_cost válido`,
        });
      }
      if (a.type === "food") {
        const expectedTime =
          a.category === "breakfast"
            ? "morning"
            : a.category === "lunch"
              ? "afternoon"
              : a.category === "dinner"
                ? "evening"
                : null;

        if (expectedTime && a.time_of_day !== expectedTime) {
          issues.push({
            type: "warning",
            day: dayNum,
            message: `Inconsistencia en "${a.title}": ${a.category} debería ser en ${expectedTime}`,
          });
        }
      }
    }

    // 2. Activity count limit
    const realActivities = activities.filter(
      (a) => a.type === "activity" || a.type === "food",
    );
    if (realActivities.length > maxActivities) {
      issues.push({
        type: "error",
        day: dayNum,
        message: `Día ${dayNum}: ${realActivities.length} actividades exceden el máximo de ${maxActivities} para ritmo ${pace}`,
      });
    }

    // 3. Schedule overlaps
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const endMin = timeToMinutes(sortedActivities[i].time_end);
      const nextStartMin = timeToMinutes(sortedActivities[i + 1].time_start);

      if (endMin > nextStartMin) {
        issues.push({
          type: "error",
          day: dayNum,
          message: `Día ${dayNum}: solapamiento entre "${sortedActivities[i].title}" (termina ${sortedActivities[i].time_end}) y "${sortedActivities[i + 1].title}" (inicia ${sortedActivities[i + 1].time_start})`,
        });
      }
    }

    // 4. full_day rule — no intermediate activities between breakfast and dinner
    const fullDayActivities = activities.filter(
      (a) => a.full_day && a.type === "activity",
    );

    if (fullDayActivities.length > 1) {
      issues.push({
        type: "error",
        day: dayNum,
        message: `Día ${dayNum}: múltiples actividades full_day no permitidas`,
      });
    }

    const fullDayActivity = fullDayActivities[0] ?? null;
    const fullDayTitle = fullDayActivity?.title ?? "Actividad sin nombre";
    if (fullDayActivity) {
      const intermediates = activities.filter(
        (a) =>
          a !== fullDayActivity &&
          !(a.type === "food" && ["breakfast", "dinner"].includes(a.category)),
      );
      if (intermediates.length > 0) {
        issues.push({
          type: "error",
          day: dayNum,
          message: `Día ${dayNum}: actividad de día completo "${fullDayTitle}" tiene actividades intermedias no permitidas`,
        });
      }
      const duration =
        timeToMinutes(fullDayActivity.time_end) -
        timeToMinutes(fullDayActivity.time_start);

      if (duration < MIN_FULL_DAY_MINUTES) {
        issues.push({
          type: "warning",
          day: dayNum,
          message: `Actividad "${fullDayTitle}" marcada como full_day pero dura menos de 6h`,
        });
      }
    }

    // 5. End time after 22:00
    if (sortedActivities.length > 0) {
      const lastActivity = sortedActivities[sortedActivities.length - 1];
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
