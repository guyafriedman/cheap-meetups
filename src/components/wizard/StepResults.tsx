'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WizardState, WizardAction, SearchResult } from '@/lib/types';
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
  const [searchStatus, setSearchStatus] = useState<'idle' | 'creating' | 'searching' | 'complete' | 'error'>('idle');
  const [tipIndex, setTipIndex] = useState(0);
  const [progressInfo, setProgressInfo] = useState({ completed: 0, total: 0, currentTask: '' });
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const isSearching = searchStatus === 'creating' || searchStatus === 'searching';
  const { formatted: elapsedTime } = useElapsedTime(isSearching);
  const searchStartedRef = useRef(false);

  const runSearch = useCallback(async () => {
    if (searchStartedRef.current) return;
    searchStartedRef.current = true;

    setSearchStatus('creating');
    setError(null);

    try {
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

      setSearchStatus('searching');
      let nextIndex = 0;
      let done = false;

      while (!done) {
        const searchRes = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId, scenarioIndex: nextIndex, flightPreferences: state.flightPreferences }),
        });

        if (!searchRes.ok) {
          const data = await searchRes.json();
          throw new Error(data.error || 'Search failed');
        }

        const data = await searchRes.json();
        done = data.done;

        if (!done) {
          nextIndex = data.nextIndex;
          setProgressInfo({
            completed: data.nextIndex,
            total: data.totalScenarios,
            currentTask: data.scenarioResult?.cityLabel || '',
          });
        } else {
          setProgressInfo((prev) => ({ ...prev, completed: data.totalScenarios, total: data.totalScenarios }));
        }
      }

      const resultsRes = await fetch(`/api/results?tripId=${tripId}`);
      const resultsData = await resultsRes.json();
      setResults(resultsData.results || []);
      setSearchStatus('complete');
    } catch (err) {
      setError((err as Error).message);
      setSearchStatus('error');
    }
  }, [state, dispatch]);

  useEffect(() => {
    runSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % SEARCH_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isSearching]);

  const sendItinerary = async (resultId: string) => {
    setSendingEmail(resultId);
    setEmailSent(null);
    try {
      const res = await fetch('/api/send-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Open mailto links for each traveler
      for (const email of data.emails) {
        const mailto = `mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
        window.open(mailto, '_blank');
      }

      setEmailSent(resultId);
    } catch (err) {
      alert(`Failed to prepare emails: ${(err as Error).message}`);
    } finally {
      setSendingEmail(null);
    }
  };

  const percentage = progressInfo.total > 0
    ? Math.round((progressInfo.completed / progressInfo.total) * 100)
    : 0;

  if (searchStatus === 'error') {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          <button
            onClick={() => {
              setError(null);
              searchStartedRef.current = false;
              dispatch({ type: 'SET_TRIP_ID', tripId: null });
              runSearch();
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (searchStatus !== 'complete') {
    const totalScenarios = state.selectedCities.length * state.dateRanges.length;
    const apiCallsPerScenario = 1 + state.travelers.length;
    const estSeconds = totalScenarios * apiCallsPerScenario * 2;
    const estMins = Math.ceil(estSeconds / 60);

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">{searchStatus === 'creating' ? '📋' : '✈️'}</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {searchStatus === 'creating' ? 'Setting up your search...' : 'Searching for the best deals...'}
          </h2>

          <div className="text-3xl font-mono font-bold text-blue-600 dark:text-blue-400 my-3">
            {elapsedTime}
          </div>

          {progressInfo.total > 0 && (
            <div className="w-full max-w-md mx-auto">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{progressInfo.completed} of {progressInfo.total} scenarios</span>
                <span>{percentage}%</span>
              </div>
            </div>
          )}

          {progressInfo.currentTask && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Just checked: {progressInfo.currentTask}
            </p>
          )}

          {searchStatus === 'searching' && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 italic">
              {SEARCH_TIPS[tipIndex]}
            </p>
          )}

          {progressInfo.total === 0 && searchStatus === 'searching' && (
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
        <p className="text-yellow-700 dark:text-yellow-400">No results found. Try different cities or dates.</p>
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
          Ranked by total cost (flights + hotel) for all {state.travelers.length} travelers. Click flights or hotels to book.
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
                  {/* Hotel with booking link */}
                  {result.hotel_name && (
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Hotel: </span>
                      {result.hotel_booking_url ? (
                        <a
                          href={result.hotel_booking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {result.hotel_name} — {formatCurrency(result.hotel_cost_per_night)}/night ↗
                        </a>
                      ) : (
                        <span className="text-gray-900 dark:text-white">
                          {result.hotel_name} — {formatCurrency(result.hotel_cost_per_night)}/night
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                    Flight Breakdown:
                  </div>

                  {result.flight_quotes.map((fq, j) => (
                    <div key={j} className="flex items-center justify-between text-sm">
                      <div className="text-gray-700 dark:text-gray-300">
                        <span>{fq.traveler_name || 'Traveler'}: </span>
                        {fq.booking_url && fq.price !== 0 ? (
                          <a
                            href={fq.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {fq.departure_airport} → {fq.arrival_airport} ↗
                          </a>
                        ) : (
                          <span>{fq.departure_airport} → {fq.arrival_airport}</span>
                        )}
                        {fq.airline && (
                          <span className="text-gray-400 ml-1">({fq.airline})</span>
                        )}
                      </div>
                      <span
                        className={`font-medium ${
                          fq.price === 0
                            ? 'text-green-600'
                            : fq.price === null
                            ? 'text-gray-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {fq.price === 0 ? 'Local' : formatCurrency(fq.price)}
                      </span>
                    </div>
                  ))}

                  {/* Send Itinerary button */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sendItinerary(result.id!);
                      }}
                      disabled={sendingEmail === result.id}
                      className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        emailSent === result.id
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                      }`}
                    >
                      {sendingEmail === result.id
                        ? 'Preparing emails...'
                        : emailSent === result.id
                        ? 'Email drafts opened!'
                        : '📧 Send Itinerary to All Participants'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      Opens email drafts with booking links for each traveler
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
