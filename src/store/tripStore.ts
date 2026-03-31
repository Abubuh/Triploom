import { create } from "zustand";

interface Destination {
  city: string;
  country: string;
  days: number;
}

interface TripState {
  // Step 1
  name: string;
  startDate: string;
  endDate: string;
  totalPeople: number;

  // Step 2
  destinations: Destination[];

  // Step 3
  accommodationType: "together" | "separate";
  accommodationBudget: number;

  // Step 4
  budget: number;
  foodPreferences: string[];
  activityPreferences: string[];
  travelPace: "relaxed" | "moderate" | "intense";

  // Actions
  setField: <K extends keyof TripState>(key: K, value: TripState[K]) => void;
  addDestination: (destination: Destination) => void;
  removeDestination: (index: number) => void;
  reset: () => void;
}

const initialState = {
  name: "",
  startDate: "",
  endDate: "",
  totalPeople: 1,
  destinations: [],
  accommodationType: "together" as const,
  accommodationBudget: 0,
  budget: 0,
  foodPreferences: [],
  activityPreferences: [],
  travelPace: "moderate" as const,
};

export const useTripStore = create<TripState>((set) => ({
  ...initialState,

  setField: (key, value) => set({ [key]: value }),

  addDestination: (destination) =>
    set((state) => ({
      destinations: [...state.destinations, destination],
    })),

  removeDestination: (index) =>
    set((state) => ({
      destinations: state.destinations.filter((_, i) => i !== index),
    })),

  reset: () => set(initialState),
}));
