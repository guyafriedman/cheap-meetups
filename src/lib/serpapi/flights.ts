export interface FlightResult {
  price: number;
  airline: string;
  stops: number;
  booking_url: string | null;
}

export interface FlightSearchOptions {
  directOnly?: boolean;
  arriveBy?: string; // HH:MM
  leaveBy?: string;  // HH:MM
}

interface SerpFlightLeg {
  airline?: string;
  arrival?: { time?: string };
  departure?: { time?: string };
}

interface SerpFlight {
  price?: number;
  flights?: SerpFlightLeg[];
  layovers?: unknown[];
  airline?: string;
  total_duration?: number;
  booking_token?: string;
  departure_token?: string;
}

function getStopCount(flight: SerpFlight): number {
  return flight.layovers?.length ?? Math.max(0, (flight.flights?.length ?? 1) - 1);
}

function getArrivalTime(flight: SerpFlight): string | null {
  const legs = flight.flights;
  if (!legs?.length) return null;
  return legs[legs.length - 1]?.arrival?.time || null;
}

function getDepartureTime(flight: SerpFlight): string | null {
  const legs = flight.flights;
  if (!legs?.length) return null;
  return legs[0]?.departure?.time || null;
}

function timeToMinutes(time: string): number {
  // Handle formats like "10:30 AM", "2:45 PM", or "14:30"
  const clean = time.trim();
  const ampmMatch = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const mins = parseInt(ampmMatch[2]);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }
  const parts = clean.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function matchesTimeConstraints(
  flight: SerpFlight,
  options: FlightSearchOptions,
  isReturn: boolean
): boolean {
  if (!isReturn && options.arriveBy) {
    const arrival = getArrivalTime(flight);
    if (arrival) {
      try {
        const arriveMinutes = timeToMinutes(arrival);
        const constraintMinutes = timeToMinutes(options.arriveBy);
        if (arriveMinutes > constraintMinutes) return false;
      } catch { /* skip constraint if parsing fails */ }
    }
  }
  if (isReturn && options.leaveBy) {
    const departure = getDepartureTime(flight);
    if (departure) {
      try {
        const departMinutes = timeToMinutes(departure);
        const constraintMinutes = timeToMinutes(options.leaveBy);
        if (departMinutes < constraintMinutes) return false;
      } catch { /* skip constraint if parsing fails */ }
    }
  }
  return true;
}

export async function fetchFlightPrice(
  departureId: string,
  arrivalId: string,
  outboundDate: string,
  returnDate: string,
  options: FlightSearchOptions = {}
): Promise<FlightResult | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY not configured');

  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: departureId,
    arrival_id: arrivalId,
    outbound_date: outboundDate,
    return_date: returnDate,
    currency: 'USD',
    type: '1', // round trip
    hl: 'en',
    api_key: apiKey,
  });

  // If direct only, add stops filter
  if (options.directOnly) {
    params.set('stops', '1'); // SerpAPI: 1 = nonstop only
  }

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) {
    console.error(`SerpAPI flights error: ${res.status} for ${departureId}->${arrivalId}`);
    return null;
  }

  const data = await res.json();

  // Collect all flights
  const allFlights: SerpFlight[] = [
    ...(data.best_flights || []),
    ...(data.other_flights || []),
  ];

  if (allFlights.length === 0) {
    // If direct only returned nothing, retry without stops filter (fewest connections)
    if (options.directOnly) {
      return fetchFlightPrice(departureId, arrivalId, outboundDate, returnDate, {
        ...options,
        directOnly: false,
      });
    }
    return null;
  }

  // Filter by time constraints and find best option
  let candidates = allFlights.filter((f) => typeof f.price === 'number');

  // Apply time constraints (only on outbound for arriveBy)
  if (options.arriveBy || options.leaveBy) {
    const timeFiltered = candidates.filter((f) =>
      matchesTimeConstraints(f, options, false)
    );
    // If time filtering removes everything, relax it
    if (timeFiltered.length > 0) {
      candidates = timeFiltered;
    }
  }

  if (options.directOnly) {
    // Sort by stops (fewest first), then price
    candidates.sort((a, b) => {
      const stopsA = getStopCount(a);
      const stopsB = getStopCount(b);
      if (stopsA !== stopsB) return stopsA - stopsB;
      return (a.price || Infinity) - (b.price || Infinity);
    });
  } else {
    // Sort by price
    candidates.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
  }

  const best = candidates[0];
  if (!best || typeof best.price !== 'number') return null;

  const airline = best.flights?.[0]?.airline || best.airline || 'Unknown';
  const stops = getStopCount(best);

  // Build Google Flights booking URL
  const booking_url = `https://www.google.com/travel/flights?q=flights+from+${departureId}+to+${arrivalId}+on+${outboundDate}+return+${returnDate}`;

  return { price: best.price, airline, stops, booking_url };
}
