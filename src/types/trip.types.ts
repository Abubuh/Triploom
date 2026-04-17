export interface Trip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  accommodation_type: "together" | "separate";
  status: string;
  owner_id: string;
  expected_members: number;
  currency?: string;
}

export interface Destination {
  id: string;
  city: string;
  country: string;
  days: number;
  order_index: number;
}

export interface MemberPreferences {
  budget: number;
  food_preferences: string[];
  activity_preferences: string[];
  attractions_preferences: string[];
  travel_pace: "relaxed" | "moderate" | "intense";
}

export interface Member {
  id: string;
  user_id: string;
  role: "owner" | "co-organizer" | "traveler";
  profiles: {
    name: string;
    email: string;
  };
  member_preferences: MemberPreferences | null;
}

export interface ActivityCost {
  min: number;
  max: number;
}

export interface ItineraryActivity {
  id: string;
  time_start: string;
  time_end: string;
  title: string;
  description: string;
  estimated_cost: ActivityCost;
  location: string;
  type: "actividad" | "buffer";
  full_day: boolean;
}

export interface ItineraryAccommodation {
  name: string;
  zone: string;
  amount: number;
  currency: string;
  airbnb_url: string | null;
  booking_url: string | null;
}

export interface DaySummary {
  total_hours: number;
  total_cost_min: number;
  total_cost_max: number;
  activity_count: number;
}

export interface ItineraryDay {
  day_number: number;
  date: string;
  destination: string;
  flags: string[];
  activities: ItineraryActivity[];
  accommodation: ItineraryAccommodation;
  day_summary: DaySummary;
}

export interface GeneratedItinerary {
  summary: string;
  budgetWarnings: string[];
  days: ItineraryDay[];
}

export interface GenerateItineraryParams {
  trip: Trip;
  destinations: Destination[];
  members: Member[];
}

export interface Expense {
  id: string;
  trip_id: string;
  user_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  trip_day: number | null;
  created_at: string;
}

export type ExpenseCategory =
  | "comida"
  | "transporte"
  | "alojamiento"
  | "actividades"
  | "compras"
  | "otro";

export interface Document {
  id: string;
  trip_id: string;
  user_id: string;
  name: string;
  type: "file" | "link";
  url: string;
  category: string;
  created_at: string;
}

export type DocumentCategory =
  | "vuelo"
  | "hotel"
  | "transporte"
  | "seguro"
  | "visa"
  | "otro";

export interface Profile {
  id: string;
  name: string;
  email: string;
  currency: string;
}
