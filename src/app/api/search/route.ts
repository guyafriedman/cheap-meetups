import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchFlightPrice, FlightSearchOptions } from '@/lib/serpapi/flights';
import { fetchHotelPrice } from '@/lib/serpapi/hotels';
import { nightsBetween } from '@/lib/utils';
import pMap from 'p-map';

export const maxDuration = 60; // Vercel Pro: up to 60s

interface TravelerRow {
  id: string;
  name: string;
  home_airport: string;
}

export async function POST(request: Request) {
  try {
    const { tripId, scenarioIndex, flightPreferences } = await request.json();
    const flightOptions: FlightSearchOptions = {
      directOnly: flightPreferences?.directOnly || false,
      arriveBy: flightPreferences?.arriveBy || '',
      leaveBy: flightPreferences?.leaveBy || '',
    };

    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Load trip data
    const { data: trip } = await supabase
      .from('trips')
      .select('min_stars, hotel_mode, hotel_brands, downtown_only, status')
      .eq('id', tripId)
      .single();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

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
      return NextResponse.json({ error: 'Missing trip data' }, { status: 400 });
    }

    // Build scenarios
    const scenarios: { city: typeof cities[0]; dateRange: typeof dateRanges[0] }[] = [];
    for (const city of cities) {
      for (const dr of dateRanges) {
        scenarios.push({ city, dateRange: dr });
      }
    }

    const idx = scenarioIndex ?? 0;

    // First call: initialize progress and set status
    if (idx === 0) {
      await supabase.from('search_progress').upsert({
        trip_id: tripId,
        total_tasks: scenarios.length,
        completed_tasks: 0,
        current_task: 'Starting search...',
      });
      await supabase.from('trips').update({ status: 'searching' }).eq('id', tripId);
    }

    // If we've processed all scenarios, mark complete
    if (idx >= scenarios.length) {
      await supabase.from('search_progress').update({
        completed_tasks: scenarios.length,
        current_task: 'Done!',
      }).eq('trip_id', tripId);
      await supabase.from('trips').update({ status: 'complete' }).eq('id', tripId);

      return NextResponse.json({ done: true, totalScenarios: scenarios.length });
    }

    // Process this single scenario
    const { city, dateRange } = scenarios[idx];
    const cityLabel = `${city.city_name}, ${city.city_state}`;

    await supabase.from('search_progress').update({
      current_task: `Checking ${cityLabel} — ${dateRange.label || dateRange.check_in}`,
      completed_tasks: idx,
    }).eq('trip_id', tripId);

    // 1. Fetch hotel price
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

    // 2. Fetch flight prices for all travelers
    const flightResults = await pMap(
      travelers as TravelerRow[],
      async (traveler) => {
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

        let bestFlight: { price: number; airline: string; airport: string; booking_url: string | null } | null = null;

        for (const destAirport of city.airports) {
          const result = await fetchFlightPrice(
            traveler.home_airport,
            destAirport,
            dateRange.check_in,
            dateRange.check_out,
            flightOptions
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
          booking_url: bestFlight?.booking_url ?? null,
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
        hotel_booking_url: hotel?.bookingUrl ?? null,
        hotel_total: hotelTotal,
        total_flight_cost: totalFlightCost,
        total_cost: totalCost,
      })
      .select('id')
      .single();

    if (searchResult) {
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
          booking_url: f.booking_url,
        }))
      );
    }

    // Update progress
    await supabase.from('search_progress').update({
      completed_tasks: idx + 1,
    }).eq('trip_id', tripId);

    return NextResponse.json({
      done: false,
      scenarioIndex: idx,
      nextIndex: idx + 1,
      totalScenarios: scenarios.length,
      scenarioResult: { cityLabel, totalCost },
    });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
