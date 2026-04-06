'use client';

import { useState } from 'react';
import { WizardState, WizardAction } from '@/lib/types';
import { US_CITIES } from '@/lib/cities';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export default function StepCities({ state, dispatch }: Props) {
  const [search, setSearch] = useState('');

  const filtered = US_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase()) ||
      c.airports.some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );

  const isSelected = (cityName: string, cityState: string) =>
    state.selectedCities.some((c) => c.name === cityName && c.state === cityState);

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Choose Destination Cities
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select cities you&apos;d consider meeting in. We&apos;ll find the cheapest option.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cities or airport codes..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-sm text-gray-500 shrink-0">
          {state.selectedCities.length} selected
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((city) => {
          const selected = isSelected(city.name, city.state);
          return (
            <button
              key={`${city.name}-${city.state}`}
              onClick={() => dispatch({ type: 'TOGGLE_CITY', city })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {city.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {city.state}
                  </div>
                </div>
                <div className="flex gap-1">
                  {city.airports.map((code) => (
                    <span
                      key={code}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
