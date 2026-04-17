import { ItineraryActivity, ItineraryDay } from "../../types/trip.types";
import { ValidationIssue } from "./phase2";

const FOOD_KEYWORDS = [
  "desayuno",
  "almuerzo",
  "comida",
  "cena",
  "restaurante",
  "café",
  "cafetería",
  "brunch",
  "taco",
  "mercado",
  "fonda",
];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function activityDurationMinutes(activity: ItineraryActivity): number {
  return (
    timeToMinutes(activity.time_end) - timeToMinutes(activity.time_start)
  );
}

function hasLunchActivity(activities: ItineraryActivity[]): boolean {
  return activities.some((a) => {
    const startMin = timeToMinutes(a.time_start);
    const isMidDay = startMin >= timeToMinutes("12:00") && startMin <= timeToMinutes("15:00");
    const isFood = FOOD_KEYWORDS.some(
      (kw) =>
        a.title.toLowerCase().includes(kw) ||
        a.description.toLowerCase().includes(kw),
    );
    return isMidDay && isFood;
  });
}

function insertBuffers(activities: ItineraryActivity[]): ItineraryActivity[] {
  if (activities.length < 2) return activities;

  const result: ItineraryActivity[] = [];

  for (let i = 0; i < activities.length; i++) {
    result.push(activities[i]);

    if (i < activities.length - 1) {
      const currentEnd = timeToMinutes(activities[i].time_end);
      const nextStart = timeToMinutes(activities[i + 1].time_start);
      const gap = nextStart - currentEnd;

      // Only insert a buffer if there's meaningful gap (>= 5 min)
      if (gap >= 5) {
        const bufferId = `${activities[i].id}-buffer`;
        result.push({
          id: bufferId,
          time_start: activities[i].time_end,
          time_end: activities[i + 1].time_start,
          title: "Traslado",
          description: "Tiempo de desplazamiento entre actividades",
          estimated_cost: { min: 0, max: 0 },
          location: "",
          type: "buffer",
          full_day: false,
        });
      }
    }
  }

  return result;
}

function fixOverlaps(activities: ItineraryActivity[]): ItineraryActivity[] {
  const fixed = [...activities];
  for (let i = 1; i < fixed.length; i++) {
    const prevEndMin = timeToMinutes(fixed[i - 1].time_end);
    const currStartMin = timeToMinutes(fixed[i].time_start);

    if (currStartMin < prevEndMin) {
      // Push forward
      const duration = activityDurationMinutes(fixed[i]);
      const newStart = prevEndMin;
      const newEnd = newStart + duration;
      fixed[i] = {
        ...fixed[i],
        time_start: minutesToTime(newStart),
        time_end: minutesToTime(newEnd),
      };
    }
  }
  return fixed;
}

function clampLastActivityTo22(
  activities: ItineraryActivity[],
): ItineraryActivity[] {
  if (activities.length === 0) return activities;
  const fixed = [...activities];
  const last = fixed[fixed.length - 1];
  const endMin = timeToMinutes(last.time_end);
  const limit = timeToMinutes("22:00");

  if (endMin > limit) {
    // Recalculate start if clamping end would make duration negative
    const duration = activityDurationMinutes(last);
    const startMin = timeToMinutes(last.time_start);
    const newEnd = limit;
    const newStart = Math.min(startMin, newEnd - Math.min(duration, 60)); // Keep at least some duration

    fixed[fixed.length - 1] = {
      ...last,
      time_start: minutesToTime(newStart),
      time_end: minutesToTime(newEnd),
    };
  }
  return fixed;
}

function computeDaySummary(
  activities: ItineraryActivity[],
): ItineraryDay["day_summary"] {
  const realActivities = activities.filter((a) => a.type === "actividad");

  const allActivities = activities; // including buffers for time range
  const totalMinutes =
    allActivities.length >= 2
      ? timeToMinutes(allActivities[allActivities.length - 1].time_end) -
        timeToMinutes(allActivities[0].time_start)
      : realActivities.reduce(
          (sum, a) => sum + activityDurationMinutes(a),
          0,
        );

  const totalCostMin = realActivities.reduce(
    (sum, a) => sum + (a.estimated_cost?.min ?? 0),
    0,
  );
  const totalCostMax = realActivities.reduce(
    (sum, a) => sum + (a.estimated_cost?.max ?? 0),
    0,
  );

  return {
    total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    total_cost_min: totalCostMin,
    total_cost_max: totalCostMax,
    activity_count: realActivities.length,
  };
}

function computeFlags(
  activities: ItineraryActivity[],
  summary: ItineraryDay["day_summary"],
): string[] {
  const flags: string[] = [];

  if (summary.total_hours > 12) {
    flags.push("recomendado_dividir");
  } else if (summary.total_hours > 10) {
    flags.push("día_pesado");
  }

  if (!hasLunchActivity(activities)) {
    flags.push("sin_almuerzo");
  }

  return flags;
}

export function postProcess(
  days: ItineraryDay[],
  issues: ValidationIssue[],
): ItineraryDay[] {
  const daysWithHoraIssue = new Set(
    issues
      .filter((i) => i.type === "hora_limite_excedida")
      .map((i) => i.day),
  );

  return days.map((day) => {
    let activities = [...day.activities];

    // Fix overlaps first (before inserting buffers)
    activities = fixOverlaps(activities);

    // Clamp to 22:00 if needed
    if (daysWithHoraIssue.has(day.day_number)) {
      activities = clampLastActivityTo22(activities);
    }

    // Insert travel buffers between activities
    activities = insertBuffers(activities);

    // Compute summary (on activities without buffers for cost, with buffers for time)
    const summary = computeDaySummary(activities);

    // Compute flags
    const flags = computeFlags(activities, summary);

    return {
      ...day,
      activities,
      day_summary: summary,
      flags,
    };
  });
}
