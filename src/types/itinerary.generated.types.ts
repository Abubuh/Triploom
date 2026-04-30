import type { Place } from "./trip.types";

export type { Place };

export const PACE_MAX_ACTIVITIES = {
  relaxed: 3,
  moderate: 4,
  intense: 6,
};

export type Activity = {
  title: string;
  description: string;
  type: string;
  category: string;
  time_of_day: string;
  time_start: string;
  time_end: string;
  full_day?: boolean;
  place: Place;
};

export type ActivityType = "activity" | "food" | "transport";

export type ActivityCategory =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "attraction"
  | "experience";

export type TimeOfDay = "morning" | "afternoon" | "evening";
