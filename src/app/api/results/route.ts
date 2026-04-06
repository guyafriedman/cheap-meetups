import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('tripId');

  if (!tripId) {
    return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get search results ordered by total cost
  const { data: results, error } = await supabase
    .from('search_results')
    .select('*')
    .eq('trip_id', tripId)
    .not('total_cost', 'is', null)
    .order('total_cost', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get flight quotes for each result
  const resultIds = (results || []).map((r) => r.id);

  const { data: flightQuotes } = await supabase
    .from('flight_quotes')
    .select('*, travelers!inner(name)')
    .in('search_result_id', resultIds.length > 0 ? resultIds : ['none']);

  // Attach flight quotes and traveler names to results
  const enriched = (results || []).map((r) => ({
    ...r,
    flight_quotes: (flightQuotes || [])
      .filter((fq) => fq.search_result_id === r.id)
      .map((fq) => ({
        ...fq,
        traveler_name: (fq as Record<string, unknown>).travelers
          ? ((fq as Record<string, unknown>).travelers as { name: string }).name
          : undefined,
      })),
  }));

  // Also include results with null total_cost at the end
  const { data: nullResults } = await supabase
    .from('search_results')
    .select('*')
    .eq('trip_id', tripId)
    .is('total_cost', null);

  const nullEnriched = (nullResults || []).map((r) => ({
    ...r,
    flight_quotes: (flightQuotes || [])
      .filter((fq) => fq.search_result_id === r.id)
      .map((fq) => ({
        ...fq,
        traveler_name: (fq as Record<string, unknown>).travelers
          ? ((fq as Record<string, unknown>).travelers as { name: string }).name
          : undefined,
      })),
  }));

  return NextResponse.json({ results: [...enriched, ...nullEnriched] });
}
