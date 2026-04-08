import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { resultId } = await request.json();

    if (!resultId) {
      return NextResponse.json({ error: 'Missing resultId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the search result
    const { data: result } = await supabase
      .from('search_results')
      .select('*')
      .eq('id', resultId)
      .single();

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    // Get flight quotes with traveler info
    const { data: quotes } = await supabase
      .from('flight_quotes')
      .select('*, travelers!inner(name, email)')
      .eq('search_result_id', resultId);

    if (!quotes?.length) {
      return NextResponse.json({ error: 'No flight quotes found' }, { status: 404 });
    }

    // Build mailto links for each traveler with an email
    const emails: { to: string; name: string; subject: string; body: string }[] = [];

    for (const quote of quotes) {
      const traveler = (quote as Record<string, unknown>).travelers as { name: string; email: string };
      if (!traveler?.email) continue;

      const flightUrl = quote.booking_url || `https://www.google.com/travel/flights?q=flights+from+${quote.departure_airport}+to+${quote.arrival_airport}`;
      const hotelUrl = result.hotel_booking_url || `https://www.google.com/travel/hotels/${encodeURIComponent(result.city_name)}`;

      const subject = `Trip to ${result.city_name} — ${result.check_in} to ${result.check_out}`;
      const body = [
        `Hi ${traveler.name},`,
        ``,
        `Here are your travel details for our group trip:`,
        ``,
        `DESTINATION: ${result.city_name}`,
        `DATES: ${result.check_in} to ${result.check_out}`,
        ``,
        `YOUR FLIGHT:`,
        `  ${quote.departure_airport} → ${quote.arrival_airport}`,
        `  Airline: ${quote.airline || 'See link'}`,
        `  Price: $${quote.price}`,
        `  Book here: ${flightUrl}`,
        ``,
        `HOTEL:`,
        `  ${result.hotel_name || 'Hotel'}`,
        `  $${result.hotel_cost_per_night}/night`,
        `  Book here: ${hotelUrl}`,
        ``,
        `Total group cost: $${result.total_cost}`,
        ``,
        `See you there!`,
      ].join('\n');

      emails.push({ to: traveler.email, name: traveler.name, subject, body });
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No travelers have email addresses' }, { status: 400 });
    }

    return NextResponse.json({ emails, cityName: result.city_name });
  } catch (err) {
    console.error('Send itinerary error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
