import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resend = new Resend(resendKey);
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

    const sent: string[] = [];
    const failed: string[] = [];

    for (const quote of quotes) {
      const traveler = (quote as Record<string, unknown>).travelers as { name: string; email: string };
      if (!traveler?.email) {
        failed.push(traveler?.name || 'Unknown (no email)');
        continue;
      }

      const flightUrl = quote.booking_url || `https://www.google.com/travel/flights?q=flights+from+${quote.departure_airport}+to+${quote.arrival_airport}`;
      const hotelUrl = result.hotel_booking_url || `https://www.google.com/travel/hotels/${encodeURIComponent(result.city_name)}`;

      const subject = `Trip to ${result.city_name} — ${result.check_in} to ${result.check_out}`;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 4px;">Hey ${traveler.name}!</h2>
          <p style="color: #666; font-size: 16px;">Here are your travel details for our group trip:</p>

          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1a1a1a; margin: 0 0 4px 0; font-size: 20px;">${result.city_name}</h3>
            <p style="color: #666; margin: 0; font-size: 14px;">${result.check_in} to ${result.check_out}</p>
          </div>

          <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">Your Flight</h3>
            <p style="color: #1a1a1a; margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">
              ${quote.departure_airport} → ${quote.arrival_airport}
            </p>
            <p style="color: #666; margin: 0 0 4px 0;">Airline: ${quote.airline || 'See booking link'}</p>
            <p style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 18px; font-weight: 700;">$${quote.price}</p>
            <a href="${flightUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500;">Book Flight</a>
          </div>

          <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 16px;">Hotel</h3>
            <p style="color: #1a1a1a; margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">
              ${result.hotel_name || 'Hotel'}
            </p>
            <p style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 18px; font-weight: 700;">$${result.hotel_cost_per_night}/night</p>
            <a href="${hotelUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 500;">Book Hotel</a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Total group cost: $${result.total_cost} | Sent via Cheap Meetups
            </p>
          </div>
        </div>
      `;

      try {
        await resend.emails.send({
          from: 'Cheap Meetups <onboarding@resend.dev>',
          to: [traveler.email],
          subject,
          html,
        });
        sent.push(traveler.name);
      } catch (err) {
        console.error(`Failed to send to ${traveler.email}:`, err);
        failed.push(traveler.name);
      }
    }

    return NextResponse.json({
      sent,
      failed,
      message: `Sent ${sent.length} email${sent.length !== 1 ? 's' : ''}${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
    });
  } catch (err) {
    console.error('Send itinerary error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
