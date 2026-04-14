import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { travelers, cities, minStars, hotelMode, hotelBrands, downtownOnly, dateRanges } = body;

    if (!travelers?.length || !cities?.length || !dateRanges?.length) {
      return NextResponse.json(
        { error: 'Missing required data: travelers, cities, and dateRanges' },
        { status: 400 }
      );
    }

    // Create trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        name: 'Untitled Trip',
        min_stars: minStars || 3,
        hotel_mode: hotelMode || 'stars',
        hotel_brands: hotelBrands || [],
        downtown_only: downtownOnly ?? true,
        status: 'draft',
      })
      .select('id')
      .single();

    if (tripError) throw tripError;

    const tripId = trip.id;

    // Insert travelers
    const { error: tError } = await supabase.from('travelers').insert(
      travelers.map((t: { name: string; email: string; address: string; home_airport: string }) => ({
        trip_id: tripId,
        name: t.name,
        email: t.email || '',
        address: t.address || '',
        home_airport: t.home_airport,
      }))
    );
    if (tError) throw tError;

    // Insert candidate cities
    const { error: cError } = await supabase.from('candidate_cities').insert(
      cities.map((c: { name: string; state: string; airports: string[] }) => ({
        trip_id: tripId,
        city_name: c.name,
        city_state: c.state,
        airports: c.airports,
      }))
    );
    if (cError) throw cError;

    // Insert date ranges
    const { error: dError } = await supabase.from('date_ranges').insert(
      dateRanges.map((d: { check_in: string; check_out: string; label: string; source: string }) => ({
        trip_id: tripId,
        check_in: d.check_in,
        check_out: d.check_out,
        label: d.label || '',
        source: d.source || 'manual',
      }))
    );
    if (dError) throw dError;

    return NextResponse.json({ tripId });
  } catch (err) {
    console.error('Trip creation error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
