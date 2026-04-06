'use client';

import { useReducer } from 'react';
import { WizardState, WizardAction, City } from '@/lib/types';

const initialState: WizardState = {
  step: 0,
  travelers: [],
  selectedCities: [],
  minStars: 3,
  dateRanges: [],
  freehandText: '',
  tripId: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_TRAVELERS':
      return { ...state, travelers: action.travelers };
    case 'ADD_TRAVELER':
      return { ...state, travelers: [...state.travelers, action.traveler] };
    case 'UPDATE_TRAVELER':
      return {
        ...state,
        travelers: state.travelers.map((t, i) =>
          i === action.index ? action.traveler : t
        ),
      };
    case 'REMOVE_TRAVELER':
      return {
        ...state,
        travelers: state.travelers.filter((_, i) => i !== action.index),
      };
    case 'TOGGLE_CITY': {
      const exists = state.selectedCities.some(
        (c) => c.name === action.city.name && c.state === action.city.state
      );
      return {
        ...state,
        selectedCities: exists
          ? state.selectedCities.filter(
              (c) => !(c.name === action.city.name && c.state === action.city.state)
            )
          : [...state.selectedCities, action.city],
      };
    }
    case 'SET_MIN_STARS':
      return { ...state, minStars: action.stars };
    case 'SET_DATE_RANGES':
      return { ...state, dateRanges: action.ranges };
    case 'ADD_DATE_RANGE':
      return { ...state, dateRanges: [...state.dateRanges, action.range] };
    case 'REMOVE_DATE_RANGE':
      return {
        ...state,
        dateRanges: state.dateRanges.filter((_, i) => i !== action.index),
      };
    case 'SET_FREEHAND_TEXT':
      return { ...state, freehandText: action.text };
    case 'SET_TRIP_ID':
      return { ...state, tripId: action.tripId };
    default:
      return state;
  }
}

export function useWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const canProceed = (): boolean => {
    switch (state.step) {
      case 0:
        return (
          state.travelers.length >= 2 &&
          state.travelers.every((t) => t.name && t.home_airport)
        );
      case 1:
        return state.selectedCities.length >= 1;
      case 2:
        return true;
      case 3:
        return state.dateRanges.length >= 1;
      default:
        return false;
    }
  };

  const next = () => {
    if (canProceed() && state.step < 4) {
      dispatch({ type: 'SET_STEP', step: state.step + 1 });
    }
  };

  const back = () => {
    if (state.step > 0) {
      dispatch({ type: 'SET_STEP', step: state.step - 1 });
    }
  };

  return { state, dispatch, canProceed, next, back };
}
