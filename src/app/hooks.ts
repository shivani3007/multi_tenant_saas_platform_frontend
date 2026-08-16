import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

/**
 * Typed replacements for the raw react-redux hooks. Components import these so
 * every `useAppSelector` is inferred against `RootState` and every dispatch
 * understands thunks — which is what lets any component read the state it needs
 * directly instead of receiving it through props.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
