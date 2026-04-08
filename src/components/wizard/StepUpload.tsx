'use client';

import { useCallback, useState, useRef } from 'react';
import { WizardState, WizardAction, Traveler } from '@/lib/types';
import { parseSpreadsheet } from '@/lib/spreadsheet/parser';
import { isValidIATA } from '@/lib/utils';

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export default function StepUpload({ state, dispatch }: Props) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setWarnings([]);
      try {
        const result = await parseSpreadsheet(file);
        dispatch({ type: 'SET_TRAVELERS', travelers: result.travelers });
        setWarnings(result.warnings);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [dispatch]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const addEmptyTraveler = () => {
    dispatch({
      type: 'ADD_TRAVELER',
      traveler: { name: '', email: '', address: '', home_airport: '' },
    });
  };

  const updateField = (index: number, field: keyof Traveler, value: string) => {
    const updated = { ...state.travelers[index], [field]: value };
    dispatch({ type: 'UPDATE_TRAVELER', index, traveler: updated });
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Upload Travelers
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload a CSV or Excel file with columns: Name, Email, Address, Airport (IATA code).
          Or add travelers manually below.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="text-4xl mb-2">📄</div>
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          Drop your spreadsheet here or click to browse
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          CSV or Excel (.xlsx) accepted
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          {warnings.map((w, i) => (
            <p key={i} className="text-yellow-700 dark:text-yellow-400 text-sm">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Traveler Table */}
      {state.travelers.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 w-28">
                    Airport
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {state.travelers.map((t, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-800/50 last:border-0"
                  >
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) => updateField(i, 'name', e.target.value)}
                        placeholder="Name"
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="email"
                        value={t.email}
                        onChange={(e) => updateField(i, 'email', e.target.value)}
                        placeholder="email@example.com"
                        className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={t.home_airport}
                        onChange={(e) =>
                          updateField(i, 'home_airport', e.target.value.toUpperCase())
                        }
                        placeholder="LAX"
                        maxLength={3}
                        className={`w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 font-mono uppercase ${
                          t.home_airport && !isValidIATA(t.home_airport)
                            ? 'text-red-500'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => dispatch({ type: 'REMOVE_TRAVELER', index: i })}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        onClick={addEmptyTraveler}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium"
      >
        + Add Traveler Manually
      </button>

      {state.travelers.length > 0 && (
        <p className="text-sm text-gray-500">
          {state.travelers.length} traveler{state.travelers.length !== 1 ? 's' : ''} loaded
          {state.travelers.length < 2 && ' — need at least 2 to continue'}
        </p>
      )}
    </div>
  );
}
