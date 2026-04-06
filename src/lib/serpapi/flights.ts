export interface FlightResult {
  price: number;
  airline: string;
}

export async function fetchFlightPrice(
  departureId: string,
  arrivalId: string,
  outboundDate: string,
  returnDate: string
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

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) {
    console.error(`SerpAPI flights error: ${res.status} for ${departureId}->${arrivalId}`);
    return null;
  }

  const data = await res.json();

  // Try best_flights first, then other_flights
  const flights = data.best_flights || data.other_flights || [];
  if (flights.length === 0) return null;

  const best = flights[0];
  const price = best.price;
  const airline = best.flights?.[0]?.airline || best.airline || 'Unknown';

  if (typeof price !== 'number') return null;

  return { price, airline };
}
