'use client';

import { useState } from 'react';
import { WizardState, WizardAction, DateRange } from '@/lib/types';
import { formatDateRange } from '@/lib/utils';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export default function StepDates({ state, dispatch }: Props) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [freehand, setFreehand] = useState(state.freehandText);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const addManualRange = () => {
    if (!checkIn || !checkOut || checkIn >= checkOut) return;
    const range: DateRange = {
      check_in: checkIn,
      check_out: checkOut,
      label: formatDateRange(checkIn, checkOut),
      source: 'manual',
    };
    dispatch({ type: 'ADD_DATE_RANGE', range });
    setCheckIn('');
    setCheckOut('');
  };

  const parseFreehand = async () => {
    if (!freehand.trim()) return;
    setParsing(true);
    setParseError(null);
    dispatch({ type: 'SET_FREEHAND_TEXT', text: freehand });

    try {
      const res = await fetch('/api/parse-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: freehand }),
      });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error || 'Failed to parse dates');
        return;
      }

      const newRanges: DateRange[] = data.ranges.map((r: { check_in: string; check_out: string; label: string }) => ({
        check_in: r.check_in,
        check_out: r.check_out,
        label: r.label,
        source: 'freehand' as const,
      }));

      // Deduplicate with existing ranges
      const existing = new Set(
        state.dateRanges.map((d) => `${d.check_in}|${d.check_out}`)
      );
      const unique = newRanges.filter(
        (r) => !existing.has(`${r.check_in}|${r.check_out}`)
      );

      dispatch({
        type: 'SET_DATE_RANGES',
        ranges: [...state.dateRanges, ...unique],
      });
    } catch {
      setParseError('Failed to connect to date parser');
    } finally {
      setParsing(false);
    }
  };

  const estimatedScenarios = state.dateRanges.length *
    (state.selectedCities?.length || 0);

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          When Could You Meet?
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Add specific date ranges or describe your availability in plain English.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual dates */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            Add Specific Dates
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Check-in
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Check-out
              </label>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={addManualRange}
              disabled={!checkIn || !checkOut || checkIn >= checkOut}
              className="w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Add Date Range
            </button>
          </div>
        </div>

        {/* Freehand */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            Describe Your Availability
          </h3>
          <textarea
            value={freehand}
            onChange={(e) => setFreehand(e.target.value)}
            placeholder='e.g. "any 3 day weekday period between September 15 and December 15 2026" or "one weekend in March 2027"'
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none text-sm"
          />
          <button
            onClick={parseFreehand}
            disabled={parsing || !freehand.trim()}
            className="w-full py-2 mt-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {parsing ? 'Parsing with AI...' : 'Parse Dates'}
          </button>
          {parseError && (
            <p className="text-red-500 text-sm mt-2">{parseError}</p>
          )}
        </div>
      </div>

      {/* Date ranges list */}
      {state.dateRanges.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Selected Date Ranges ({state.dateRanges.length})
          </h3>
          <div className="space-y-2">
            {state.dateRanges.map((range, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3"
              >
                <div>
                  <span className="text-gray-900 dark:text-white">
                    {range.label || formatDateRange(range.check_in, range.check_out)}
                  </span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded ${
                      range.source === 'freehand'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}
                  >
                    {range.source}
                  </span>
                </div>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_DATE_RANGE', index: i })}
                  className="text-gray-400 hover:text-red-500 ml-4"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {estimatedScenarios > 0 && (
            <p className="text-sm text-gray-500">
              Will search {estimatedScenarios} scenario{estimatedScenarios !== 1 ? 's' : ''}{' '}
              ({state.dateRanges.length} date{state.dateRanges.length !== 1 ? 's' : ''} x{' '}
              {state.selectedCities.length} cit{state.selectedCities.length !== 1 ? 'ies' : 'y'})
            </p>
          )}
        </div>
      )}
    </div>
  );
}
