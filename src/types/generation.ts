// src/types/generation.ts

export interface TripPreferences {
  region: string;
  budget: "budget" | "mid-range" | "luxury";
  holidayType: string;
  duration: number;
  travellers: number;
  origin: string;
  startDate: string;    // YYYY-MM-DD
  otherCriteria: string;
}

export interface TransportLeg {
  from: string;
  to: string;
  mode: "flight" | "train" | "bus" | "car" | "ferry";
  durationHrs: number;
  costEstimate: number;  // per person in SGD
}

export interface DayActivity {
  title: string;
  type: "activity" | "food" | "rest";
}

export interface CitySuggestion {
  name: string;
  country: string;
  nights: number;
  reason: string;
  activities: DayActivity[][];  // array per day — activities[0] = day 1 activities
  transportIn?: TransportLeg;   // how you get TO this city
  costEstimate: {
    accommodation: number;  // total for all nights, per person, SGD
    food: number;           // total, per person, SGD
    activities: number;     // total, per person, SGD
    transport: number;      // local transport, per person, SGD
  };
}

export interface GeneratedEvent {
  time: string;
  title: string;
  type: "transport" | "food" | "activity" | "accommodation" | "rest";
  highlight?: boolean;
}

export interface GeneratedDay {
  cityName: string;
  route: string;
  accommodation: string;
  events: GeneratedEvent[];
}

export interface ItinerarySuggestion {
  cities: CitySuggestion[];
  schedule?: GeneratedDay[];
}
