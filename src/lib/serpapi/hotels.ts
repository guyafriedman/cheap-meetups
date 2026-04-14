export interface HotelResult {
  pricePerNight: number;
  hotelName: string;
  bookingUrl: string | null;
}

export interface HotelSearchOptions {
  cityName: string;
  checkIn: string;
  checkOut: string;
  minStars: number;
  hotelMode?: 'stars' | 'brand';
  hotelBrands?: string[];
  downtownOnly?: boolean;
}

const BRAND_SEARCH_NAMES: Record<string, string> = {
  marriott: 'Marriott',
  hilton: 'Hilton',
  hyatt: 'Hyatt',
  ihg: 'IHG Holiday Inn',
  wyndham: 'Wyndham',
  'best-western': 'Best Western',
  accor: 'Accor Novotel',
  choice: 'Choice Hotels Comfort Inn',
  radisson: 'Radisson',
  'four-seasons': 'Four Seasons',
};

export async function fetchHotelPrice(
  cityName: string,
  checkIn: string,
  checkOut: string,
  minStars: number,
  hotelMode: string = 'stars',
  hotelBrands: string[] = [],
  downtownOnly: boolean = true
): Promise<HotelResult | null> {
  // If brand mode with brands selected, search each brand and return cheapest
  if (hotelMode === 'brand' && hotelBrands.length > 0) {
    const results: HotelResult[] = [];
    for (const brand of hotelBrands) {
      const result = await fetchSingleHotelSearch({
        cityName,
        checkIn,
        checkOut,
        minStars: 0, // don't filter by stars in brand mode
        brandQuery: BRAND_SEARCH_NAMES[brand] || brand,
        downtownOnly,
      });
      if (result) results.push(result);
    }
    if (results.length === 0) return null;
    return results.reduce((cheapest, r) =>
      r.pricePerNight < cheapest.pricePerNight ? r : cheapest
    );
  }

  // Star mode — original behavior
  return fetchSingleHotelSearch({ cityName, checkIn, checkOut, minStars, downtownOnly });
}

async function fetchSingleHotelSearch(opts: {
  cityName: string;
  checkIn: string;
  checkOut: string;
  minStars: number;
  brandQuery?: string;
  downtownOnly?: boolean;
}): Promise<HotelResult | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY not configured');

  const { cityName, checkIn, checkOut, minStars, brandQuery, downtownOnly = true } = opts;

  // Build search query
  let query: string;
  if (brandQuery) {
    query = downtownOnly
      ? `${brandQuery} hotel ${cityName} downtown`
      : `${brandQuery} hotel ${cityName}`;
  } else {
    query = downtownOnly
      ? `${cityName} downtown hotels`
      : `${cityName} hotels`;
  }

  const params = new URLSearchParams({
    engine: 'google_hotels',
    q: query,
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
        const bookingUrl = prop.link || `https://www.google.com/travel/hotels/${encodeURIComponent(cityName)}?q=${encodeURIComponent(prop.name || cityName + ' hotels')}&dates=${checkIn}_${checkOut}`;
        return { pricePerNight: price, hotelName: prop.name || 'Hotel', bookingUrl };
      }
    }
    // Also check total_rate
    if (prop.total_rate?.lowest) {
      const totalStr = prop.total_rate.lowest;
      const total = typeof totalStr === 'string'
        ? parseFloat(totalStr.replace(/[^0-9.]/g, ''))
        : totalStr;
      if (!isNaN(total) && total > 0) {
        const nights = Math.max(1, Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
        ));
        const bookingUrl = prop.link || `https://www.google.com/travel/hotels/${encodeURIComponent(cityName)}?q=${encodeURIComponent(prop.name || cityName + ' hotels')}&dates=${checkIn}_${checkOut}`;
        return { pricePerNight: total / nights, hotelName: prop.name || 'Hotel', bookingUrl };
      }
    }
  }

  return null;
}
