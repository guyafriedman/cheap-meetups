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

  const { data: trip } = await supabase
    .from('trips')
    .select('status')
    .eq('id', tripId)
    .single();

  const { data: progress } = await supabase
    .from('search_progress')
    .select('*')
    .eq('trip_id', tripId)
    .single();

  return NextResponse.json({
    status: trip?.status || 'unknown',
    progress: progress || null,
  });
}
