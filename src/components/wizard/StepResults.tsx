'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WizardState, WizardAction, SearchResult } from '@/lib/types';
import { useSearchProgress } from '@/hooks/useSearchProgress';
import { formatCurrency, formatDateRange } from '@/lib/utils';

function useElapsedTime(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      setElapsed(0);
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [running]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const formatted = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${secs}s`;

  return { elapsed, formatted };
}

const SEARCH_TIPS = [
  'Comparing flight prices across airlines...',
  'Checking hotel availability downtown...',
  'Finding the best round-trip fares...',
  'Scanning for deals on your dates...',
  'Crunching the numbers for your group...',
];

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export default function StepResults({ state, dispatch }: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const { progress, status, percentage, startPolling } = useSearchProgress(state.tripId);
  const isSearching = creating || (status === 'searching') || (status === 'idle' && !!state.tripId);
  const { formatted: elapsedTime } = useElapsedTime(isSearching);

  const startSearch = useCallback(async () => {
    setCreating(true);
    setError(null);

    try {
      // Create trip in DB
      const tripRes = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelers: state.travelers,
          cities: state.selectedCities,
          minStars: state.minStars,
          dateRanges: state.dateRanges,
        }),
      });

      if (!tripRes.ok) {
        const data = await tripRes.json();
        throw new Error(data.error || 'Failed to create trip');
      }

      const { tripId } = await tripRes.json();
      dispatch({ type: 'SET_TRIP_ID', tripId });

      // Start search
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      });

      if (!searchRes.ok) {
        const data = await searchRes.json();
        throw new Error(data.error || 'Failed to start search');
      }

      startPolling();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }, [state, dispatch, startPolling]);

  // Auto-start on mount
  useEffect(() => {
    if (!state.tripId && !creating) {
      startSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rotate tips every 5 seconds
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % SEARCH_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isSearching]);

  // Fetch results when complete
  useEffect(() => {
    if (status === 'complete' && state.tripId) {
      fetch(`/api/results?tripId=${state.tripId}`)
        .then((r) => r.json())
        .then((data) => setResults(data.results || []))
        .catch(() => setError('Failed to load results'));
    }
  }, [status, state.tripId]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          <button
            onClick={() => {
              setError(null);
              dispatch({ type: 'SET_TRIP_ID', tripId: null });
              startSearch();
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status !== 'complete') {
    const totalScenarios = state.selectedCities.length * state.dateRanges.length;
    const apiCallsPerScenario = 1 + state.travelers.length; // 1 hotel + N flights
    const estSeconds = totalScenarios * apiCallsPerScenario * 1.5; // ~1.5s per call
    const estMins = Math.ceil(estSeconds / 60);

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          {/* Animated spinner */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">{creating ? '📋' : '✈️'}</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {creating ? 'Setting up your search...' : 'Searching for the best deals...'}
          </h2>

          {/* Elapsed timer */}
          <div className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 my-3">
            {elapsedTime}
          </div>

          {/* Progress bar */}
          {progress && progress.total_tasks > 0 && (
            <div className="w-full max-w-md mx-auto">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {progress.completed_tasks} of {progress.total_tasks} scenarios
                </span>
                <span>{percentage}%</span>
              </div>
            </div>
          )}

          {/* Current task */}
          {progress?.current_task && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              {progress.current_task}
            </p>
          )}

          {/* Rotating tips */}
          {!creating && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 italic transition-opacity duration-500">
              {SEARCH_TIPS[tipIndex]}
            </p>
          )}

          {/* Estimate */}
          {!progress && !creating && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-4">
              Estimated time: ~{estMins} minute{estMins !== 1 ? 's' : ''} for {totalScenarios} scenario{totalScenarios !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
        <p className="text-yellow-700 dark:text-yellow-400">
          No results found. Try different cities or dates.
        </p>
      </div>
    );
  }

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Results — Cheapest Options
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Ranked by total cost (flights + hotel) for all {state.travelers.length} travelers.
        </p>
      </div>

      <div className="space-y-3">
        {results.map((result, i) => (
          <div
            key={result.id || i}
            className={`bg-white dark:bg-gray-900 rounded-xl border overflow-hidden transition-all ${
              i === 0
                ? 'border-green-500 ring-2 ring-green-500/20'
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            <button
              onClick={() => setExpandedRow(expandedRow === i ? null : i)}
              className="w-full text-left px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl w-8 text-center">
                  {i < 3 ? MEDALS[i] : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {result.city_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDateRange(result.check_in, result.check_out)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(result.total_cost)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Flights {formatCurrency(result.total_flight_cost)} + Hotel{' '}
                    {formatCurrency(result.hotel_total)}
                  </div>
                </div>
                <span className="text-gray-400 ml-2">
                  {expandedRow === i ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {expandedRow === i && result.flight_quotes && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="grid gap-3">
                  {result.hotel_name && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Hotel: {result.hotel_name} — {formatCurrency(result.hotel_cost_per_night)}/night
                    </div>
                  )}
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                    Flight Breakdown:
                  </div>
                  {result.flight_quotes.map((fq, j) => (
                    <div
                      key={j}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {fq.traveler_name || 'Traveler'}: {fq.departure_airport} → {fq.arrival_airport}
                        {fq.airline && (
                          <span className="text-gray-400 ml-1">({fq.airline})</span>
                        )}
                      </span>
                      <span
                        className={`font-medium ${
                          fq.price === 0
                            ? 'text-green-600'
                            : fq.price === null
                            ? 'text-gray-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {fq.price === 0
                          ? 'Local'
                          : formatCurrency(fq.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
