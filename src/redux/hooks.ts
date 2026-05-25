/**
 * Pre-typed Redux hooks.
 * Use these throughout the app instead of the plain `useDispatch` / `useSelector`.
 */
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

import type { AppDispatch, RootState } from './store';

/** Dispatch hook typed for thunks and all registered action creators */
export const useAppDispatch: () => AppDispatch = useDispatch;

/** Selector hook typed to the full Redux state tree */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
