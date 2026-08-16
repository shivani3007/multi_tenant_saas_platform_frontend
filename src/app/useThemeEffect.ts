import { useEffect } from 'react';
import { useAppSelector } from './hooks';
import { selectTheme } from '../features/ui/uiSlice';

/**
 * Mirrors the theme preference onto <html data-theme>. 'system' removes the
 * attribute entirely so the stylesheet's prefers-color-scheme block takes over —
 * which is what makes the OS setting keep working after the user picks "System".
 */
export function useThemeEffect(): void {
  const theme = useAppSelector(selectTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}
