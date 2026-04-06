'use client';

import { useWizard } from '@/hooks/useWizard';
import StepUpload from './StepUpload';
import StepCities from './StepCities';
import StepHotelQuality from './StepHotelQuality';
import StepDates from './StepDates';
import StepResults from './StepResults';

const STEPS = ['Travelers', 'Cities', 'Hotels', 'Dates', 'Results'];

export default function WizardShell() {
  const { state, dispatch, canProceed, next, back } = useWizard();

  const stepContent = () => {
    switch (state.step) {
      case 0:
        return <StepUpload state={state} dispatch={dispatch} />;
      case 1:
        return <StepCities state={state} dispatch={dispatch} />;
      case 2:
        return <StepHotelQuality state={state} dispatch={dispatch} />;
      case 3:
        return <StepDates state={state} dispatch={dispatch} />;
      case 4:
        return <StepResults state={state} dispatch={dispatch} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Cheap Meetups
          </h1>

          {/* Step Indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                      i < state.step
                        ? 'bg-green-500 text-white'
                        : i === state.step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {i < state.step ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-sm hidden sm:inline ${
                      i === state.step
                        ? 'font-medium text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px flex-1 mx-2 ${
                      i < state.step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">{stepContent()}</div>

      {/* Bottom Navigation */}
      {state.step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between">
            <button
              onClick={back}
              disabled={state.step === 0}
              className="px-6 py-2 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button
              onClick={next}
              disabled={!canProceed()}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state.step === 3 ? 'Find Deals' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
