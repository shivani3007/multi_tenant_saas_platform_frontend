import { useEffect, useState } from 'react';

/**
 * Resolves the CSS colour tokens to concrete values for the chart.
 *
 * SVG presentation attributes don't resolve `var()`, and Recharts sets stroke
 * and fill as attributes — so the chart has to be handed real colours. Reading
 * them from the stylesheet (rather than hard-coding hex) keeps one source of
 * truth, and the observers below re-read them whenever the theme changes, in
 * either direction: the toggle stamps `data-theme`, the OS setting fires
 * `prefers-color-scheme`.
 */
const TOKEN_NAMES = ['--series-1', '--text-muted', '--grid', '--axis', '--surface-1'] as const;

type TokenName = (typeof TOKEN_NAMES)[number];

export interface ChartTokens {
  series1: string;
  muted: string;
  grid: string;
  axis: string;
  surface: string;
}

function readTokens(): ChartTokens {
  const styles = getComputedStyle(document.documentElement);
  const value = (name: TokenName) => styles.getPropertyValue(name).trim();
  return {
    series1: value('--series-1') || '#2a78d6',
    muted: value('--text-muted') || '#898781',
    grid: value('--grid') || '#e1e0d9',
    axis: value('--axis') || '#c3c2b7',
    surface: value('--surface-1') || '#fcfcfb',
  };
}

export function useChartTokens(): ChartTokens {
  const [tokens, setTokens] = useState<ChartTokens>(readTokens);

  useEffect(() => {
    const refresh = () => setTokens(readTokens());

    // The theme toggle writes/removes data-theme on <html>.
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // The OS setting matters whenever the preference is "system".
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', refresh);

    // Catch the first paint after mount, when the attribute may have just landed.
    refresh();

    return () => {
      observer.disconnect();
      media.removeEventListener('change', refresh);
    };
  }, []);

  return tokens;
}
