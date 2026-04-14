'use client';

import { WizardState, WizardAction } from '@/lib/types';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Budget — basic, no frills',
  2: 'Economy — clean and functional',
  3: 'Mid-range — comfortable stay',
  4: 'Upscale — premium amenities',
  5: 'Luxury — top-tier experience',
};

const HOTEL_BRANDS = [
  { id: 'marriott', name: 'Marriott', sub: 'Marriott Bonvoy family' },
  { id: 'hilton', name: 'Hilton', sub: 'Hilton Honors family' },
  { id: 'hyatt', name: 'Hyatt', sub: 'World of Hyatt family' },
  { id: 'ihg', name: 'IHG', sub: 'Holiday Inn, Crowne Plaza' },
  { id: 'wyndham', name: 'Wyndham', sub: 'La Quinta, Ramada' },
  { id: 'best-western', name: 'Best Western', sub: 'Best Western, SureStay' },
  { id: 'accor', name: 'Accor', sub: 'Sofitel, Novotel, ibis' },
  { id: 'choice', name: 'Choice Hotels', sub: 'Comfort Inn, Quality Inn' },
  { id: 'radisson', name: 'Radisson', sub: 'Radisson Blu, Park Inn' },
  { id: 'four-seasons', name: 'Four Seasons', sub: 'Luxury worldwide' },
] as const;

export default function StepHotelQuality({ state, dispatch }: Props) {
  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Hotel Preferences
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how to filter hotels — by brand or star rating.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => dispatch({ type: 'SET_HOTEL_MODE', mode: 'brand' })}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            state.hotelMode === 'brand'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          By Hotel Brand
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_HOTEL_MODE', mode: 'stars' })}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${
            state.hotelMode === 'stars'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          By Star Rating
        </button>
      </div>

      {/* Brand Selection */}
      {state.hotelMode === 'brand' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select one or more hotel brands.{' '}
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {state.hotelBrands.length} selected
            </span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {HOTEL_BRANDS.map((brand) => {
              const selected = state.hotelBrands.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  onClick={() => dispatch({ type: 'TOGGLE_HOTEL_BRAND', brand: brand.id })}
                  className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    selected
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 shadow-sm'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">{brand.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{brand.sub}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Star Rating Selection */}
      {state.hotelMode === 'stars' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => dispatch({ type: 'SET_MIN_STARS', stars: star })}
                className={`text-4xl transition-transform hover:scale-110 ${
                  star <= state.minStars ? 'drop-shadow-lg' : 'opacity-30'
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="text-center text-lg font-medium text-gray-900 dark:text-white">
            {state.minStars} Star{state.minStars !== 1 ? 's' : ''} Minimum
          </p>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-1">
            {STAR_LABELS[state.minStars]}
          </p>
        </div>
      )}

      {/* Downtown Toggle */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <button
          onClick={() => dispatch({ type: 'SET_DOWNTOWN_ONLY', downtownOnly: !state.downtownOnly })}
          className="flex items-start gap-3 w-full text-left"
        >
          <div className="pt-0.5">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                state.downtownOnly
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {state.downtownOnly && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Downtown / Central Area Only</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Limit results to hotels in the downtown core, entertainment district, or central fun areas.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
