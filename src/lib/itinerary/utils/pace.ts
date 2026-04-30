import type { MemberPreferences } from "../../../types/trip.types";

export function dominantPace(
  paces: MemberPreferences["travel_pace"][],
): MemberPreferences["travel_pace"] {
  if (paces.length === 0) return "moderate";

  const counts: Record<string, number> = {};
  for (const p of paces) counts[p] = (counts[p] ?? 0) + 1;

  return Object.entries(counts).sort(
    (a, b) => b[1] - a[1],
  )[0][0] as MemberPreferences["travel_pace"];
}
