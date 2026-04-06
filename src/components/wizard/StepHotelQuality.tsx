'use client';

import { WizardState, WizardAction } from '@/lib/types';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const LABELS: Record<number, string> = {
  1: 'Budget — basic, no frills',
  2: 'Economy — clean and functional',
  3: 'Mid-range — comfortable stay',
  4: 'Upscale — premium amenities',
  5: 'Luxury — top-tier experience',
};

export default function StepHotelQuality({ state, dispatch }: Props) {
  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Minimum Hotel Quality
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Set the minimum star rating for hotels. We&apos;ll find the cheapest hotel at or above this level in each city&apos;s downtown area.
        </p>
      </div>

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
          {LABELS[state.minStars]}
        </p>
      </div>
    </div>
  );
}
