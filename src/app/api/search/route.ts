import { NextResponse } from 'next/server';
import { orchestrateSearch } from '@/lib/search/engine';

export async function POST(request: Request) {
  try {
    const { tripId } = await request.json();

    if (!tripId) {
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    // Fire-and-forget: start the search in the background
    orchestrateSearch(tripId).catch((err) => {
      console.error('Background search error:', err);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Search start error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
