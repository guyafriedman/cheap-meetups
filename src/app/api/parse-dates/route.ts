import { NextResponse } from 'next/server';
import { parseFreehandDates } from '@/lib/claude/parse-dates';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const ranges = await parseFreehandDates(text);

    return NextResponse.json({ ranges });
  } catch (err) {
    console.error('Date parsing error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
