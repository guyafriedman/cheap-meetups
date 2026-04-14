import { createClient } from '@supabase/supabase-js';
import { fetchFlightPrice } from '../serpapi/flights';
import { fetchHotelPrice } from '../serpapi/hotels';
import { sleep, nightsBetween } from '../utils';
import pMap from 'p-map';

interface TravelerRow {
  id: string;
  name: string;
  home_airport: string;
}

interface CityRow {
  city_name: string;
  city_state: string;
  airports: string[];
}

interface DateRangeRow {
  id: string;
  check_in: string;
  check_out: string;
  label: string;
}

export async function orchestrateSearch(tripId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Load trip data
    const { data: trip } = await supabase
      .from('trips')
      .select('min_stars, hotel_mode, hotel_brands, downtown_only')
      .eq('id', tripId)
      .single();

    if (!trip) throw new Error('Trip not found');

    const { data: travelers } = await supabase
      .from('travelers')
      .select('id, name, home_airport')
      .eq('trip_id', tripId);

    const { data: cities } = await supabase
      .from('candidate_cities')
      .select('city_name, city_state, airports')
      .eq('trip_id', tripId);

    const { data: dateRanges } = await supabase
      .from('date_ranges')
      .select('id, check_in, check_out, label')
      .eq('trip_id', tripId);

    if (!travelers?.length || !cities?.length || !dateRanges?.length) {
      throw new Error('Missing trip data');
    }

    // Build scenarios: city x date_range
    const scenarios: { city: CityRow; dateRange: DateRangeRow }[] = [];
    for (const city of cities) {
      for (const dr of dateRanges) {
        scenarios.push({ city, dateRange: dr });
      }
    }

    // Init progress
    await supabase.from('search_progress').upsert({
      trip_id: tripId,
      total_tasks: scenarios.length,
      completed_tasks: 0,
      current_task: 'Starting search...',
    });

    // Update trip status
    await supabase
      .from('trips')
      .update({ status: 'searching' })
      .eq('id', tripId);

    // Process each scenario
    for (let i = 0; i < scenarios.length; i++) {
      const { city, dateRange } = scenarios[i];
      const cityLabel = `${city.city_name}, ${city.city_state}`;

      await supabase.from('search_progress').update({
        current_task: `Checking ${cityLabel} — ${dateRange.label || dateRange.check_in}`,
        completed_tasks: i,
      }).eq('trip_id', tripId);

      // 1. Fetch hotel price
      await sleep(200);
      const hotel = await fetchHotelPrice(
        city.city_name,
        dateRange.check_in,
        dateRange.check_out,
        trip.min_stars,
        trip.hotel_mode || 'stars',
        trip.hotel_brands || [],
        trip.downtown_only ?? true
      );

      const nights = nightsBetween(dateRange.check_in, dateRange.check_out);
      const hotelTotal = hotel ? hotel.pricePerNight * nights : null;

      // 2. Fetch flight prices for all travelers (parallel with concurrency limit)
      const flightResults = await pMap(
        travelers as TravelerRow[],
        async (traveler) => {
          // If traveler is at one of the destination airports, cost = $0
          if (city.airports.includes(traveler.home_airport)) {
            return {
              traveler_id: traveler.id,
              traveler_name: traveler.name,
              departure_airport: traveler.home_airport,
              arrival_airport: traveler.home_airport,
              price: 0,
              airline: 'Local',
            };
          }

          // Try each destination airport, keep cheapest
          let bestFlight: { price: number; airline: string; airport: string } | null = null;

          for (const destAirport of city.airports) {
            await sleep(200);
            const result = await fetchFlightPrice(
              traveler.home_airport,
              destAirport,
              dateRange.check_in,
              dateRange.check_out
            );

            if (result && (!bestFlight || result.price < bestFlight.price)) {
              bestFlight = { ...result, airport: destAirport };
            }
          }

          return {
            traveler_id: traveler.id,
            traveler_name: traveler.name,
            departure_airport: traveler.home_airport,
            arrival_airport: bestFlight?.airport || city.airports[0],
            price: bestFlight?.price ?? null,
            airline: bestFlight?.airline ?? null,
          };
        },
        { concurrency: 3 }
      );

      // Calculate totals
      const totalFlightCost = flightResults.every((f) => f.price !== null)
        ? flightResults.reduce((sum, f) => sum + (f.price || 0), 0)
        : null;

      const totalCost =
        hotelTotal !== null && totalFlightCost !== null
          ? hotelTotal + totalFlightCost
          : null;

      // 3. Persist search result
      const { data: searchResult } = await supabase
        .from('search_results')
        .insert({
          trip_id: tripId,
          city_name: cityLabel,
          date_range_id: dateRange.id,
          check_in: dateRange.check_in,
          check_out: dateRange.check_out,
          hotel_cost_per_night: hotel?.pricePerNight ?? null,
          hotel_name: hotel?.hotelName ?? null,
          hotel_total: hotelTotal,
          total_flight_cost: totalFlightCost,
          total_cost: totalCost,
        })
        .select('id')
        .single();

      if (searchResult) {
        // Insert flight quotes
        await supabase.from('flight_quotes').insert(
          flightResults.map((f) => ({
            search_result_id: searchResult.id,
            traveler_id: f.traveler_id,
            departure_airport: f.departure_airport,
            arrival_airport: f.arrival_airport,
            outbound_date: dateRange.check_in,
            return_date: dateRange.check_out,
            price: f.price,
            airline: f.airline,
          }))
        );
      }
    }

    // Complete
    await supabase.from('search_progress').update({
      completed_tasks: scenarios.length,
      current_task: 'Done!',
    }).eq('trip_id', tripId);

    await supabase
      .from('trips')
      .update({ status: 'complete' })
      .eq('id', tripId);

  } catch (err) {
    console.error('Search engine error:', err);
    await supabase
      .from('trips')
      .update({ status: 'error' })
      .eq('id', tripId);
  }
}
