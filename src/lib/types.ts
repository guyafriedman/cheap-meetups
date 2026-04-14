export interface Traveler {
  id?: string;
  trip_id?: string;
  name: string;
  email: string;
  address: string;
  home_airport: string;
}

export interface City {
  name: string;
  state: string;
  airports: string[];
}

export interface CandidateCity {
  id?: string;
  trip_id?: string;
  city_name: string;
  city_state: string;
  airports: string[];
}

export interface DateRange {
  id?: string;
  trip_id?: string;
  check_in: string;
  check_out: string;
  label: string;
  source: 'manual' | 'freehand';
}

export type HotelMode = 'stars' | 'brand';

export interface Trip {
  id?: string;
  name: string;
  min_stars: number;
  hotel_mode: HotelMode;
  hotel_brands: string[];
  downtown_only: boolean;
  status: 'draft' | 'searching' | 'complete' | 'error';
  created_at?: string;
}

export interface SearchResult {
  id?: string;
  trip_id?: string;
  city_name: string;
  date_range_id?: string;
  check_in: string;
  check_out: string;
  hotel_cost_per_night: number | null;
  hotel_name?: string | null;
  hotel_booking_url?: string | null;
  hotel_total: number | null;
  total_flight_cost: number | null;
  total_cost: number | null;
  flight_quotes?: FlightQuote[];
}

export interface FlightQuote {
  id?: string;
  search_result_id?: string;
  traveler_id?: string;
  traveler_name?: string;
  traveler_email?: string;
  departure_airport: string;
  arrival_airport: string;
  outbound_date: string;
  return_date: string;
  price: number | null;
  airline: string | null;
  stops?: number | null;
  booking_url?: string | null;
}

export interface SearchProgress {
  trip_id: string;
  total_tasks: number;
  completed_tasks: number;
  current_task: string;
}

export interface FlightPreferences {
  arriveBy: string; // HH:MM or '' for no preference
  leaveBy: string;  // HH:MM or '' for no preference
  directOnly: boolean;
}

export interface WizardState {
  step: number;
  travelers: Traveler[];
  selectedCities: City[];
  minStars: number;
  hotelMode: HotelMode;
  hotelBrands: string[];
  downtownOnly: boolean;
  dateRanges: DateRange[];
  freehandText: string;
  tripId: string | null;
  flightPreferences: FlightPreferences;
}

export type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_TRAVELERS'; travelers: Traveler[] }
  | { type: 'ADD_TRAVELER'; traveler: Traveler }
  | { type: 'UPDATE_TRAVELER'; index: number; traveler: Traveler }
  | { type: 'REMOVE_TRAVELER'; index: number }
  | { type: 'TOGGLE_CITY'; city: City }
  | { type: 'SET_MIN_STARS'; stars: number }
  | { type: 'SET_HOTEL_MODE'; mode: HotelMode }
  | { type: 'TOGGLE_HOTEL_BRAND'; brand: string }
  | { type: 'SET_DOWNTOWN_ONLY'; downtownOnly: boolean }
  | { type: 'SET_DATE_RANGES'; ranges: DateRange[] }
  | { type: 'ADD_DATE_RANGE'; range: DateRange }
  | { type: 'REMOVE_DATE_RANGE'; index: number }
  | { type: 'SET_FREEHAND_TEXT'; text: string }
  | { type: 'SET_TRIP_ID'; tripId: string | null }
  | { type: 'SET_FLIGHT_PREFERENCES'; preferences: Partial<FlightPreferences> };
