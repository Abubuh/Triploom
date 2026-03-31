export interface Trip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  accommodation_type: "together" | "separate";
  status: string;
  owner_id: string;
  expected_members: number;
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

export interface ItineraryActivity {
  time: string;
  title: string;
  description: string;
  type: "food" | "activity" | "transport" | "accommodation";
  estimatedCost?: string;
}

export interface ItineraryAccommodation {
  suggestion: string;
  zone: string;
  estimatedCost: string;
  airbnbLink: string;
  bookingLink: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  destination: string;
  activities: ItineraryActivity[];
  accommodation?: ItineraryAccommodation;
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
