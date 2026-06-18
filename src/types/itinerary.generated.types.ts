import type { Place } from "./trip.types";

export const PACE_MAX_ACTIVITIES = {
  relaxed: 3,
  moderate: 4,
  intense: 6,
};

export type Activity = {
  id: string;
  type: string;
  category?: string;
  title: string;
  full_day: boolean;
  time_start: string;
  time_end: string;
  time_of_day?: string;
  place?: Place;
  estimated_cost: { min: number; max: number };
};

export type ActivityType = "activity" | "food" | "transport" | "buffer";

export type ActivityCategory =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "attraction"
  | "experience";

export type TimeOfDay = "morning" | "afternoon" | "evening";
