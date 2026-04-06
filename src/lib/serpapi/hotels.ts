export interface HotelResult {
  pricePerNight: number;
  hotelName: string;
}

export async function fetchHotelPrice(
  cityName: string,
  checkIn: string,
  checkOut: string,
  minStars: number
): Promise<HotelResult | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY not configured');

  const params = new URLSearchParams({
    engine: 'google_hotels',
    q: `${cityName} downtown hotels`,
    check_in_date: checkIn,
    check_out_date: checkOut,
    currency: 'USD',
    hl: 'en',
    api_key: apiKey,
  });

  // Map star rating to SerpAPI's min_rating parameter
  if (minStars >= 2) {
    params.set('min_rating', String(minStars));
  }

  const res = await fetch(`https://serpapi.com/search.json?${params}`);
  if (!res.ok) {
    console.error(`SerpAPI hotels error: ${res.status} for ${cityName}`);
    return null;
  }

  const data = await res.json();
  const properties = data.properties || [];

  if (properties.length === 0) return null;

  // Find cheapest property with a price
  for (const prop of properties) {
    const rate = prop.rate_per_night?.lowest;
    if (rate) {
      const price = typeof rate === 'string'
        ? parseFloat(rate.replace(/[^0-9.]/g, ''))
        : rate;
      if (!isNaN(price) && price > 0) {
        return { pricePerNight: price, hotelName: prop.name || 'Hotel' };
      }
    }
    // Also check total_rate
    if (prop.total_rate?.lowest) {
      const totalStr = prop.total_rate.lowest;
      const total = typeof totalStr === 'string'
        ? parseFloat(totalStr.replace(/[^0-9.]/g, ''))
        : totalStr;
      if (!isNaN(total) && total > 0) {
        // Estimate per-night from total
        const nights = Math.max(1, Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
        ));
        return { pricePerNight: total / nights, hotelName: prop.name || 'Hotel' };
      }
    }
  }

  return null;
}
