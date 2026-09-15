import {
  type Accessor,
  type ParentProps,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
} from 'solid-js';

export type Theme = 'light' | 'dark';
export type ThemeMode = Theme | 'system';

const STORAGE_KEY = 'theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

const readStoredMode = (): ThemeMode => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
};

const systemTheme = (): Theme => (window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light');

export type ThemeContextValue = {
  /** Resolved theme currently applied to the document. */
  theme: Accessor<Theme>;
  /** User preference; 'system' follows the OS setting. */
  mode: Accessor<ThemeMode>;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>();

export const createTheme = (): ThemeContextValue => {
  const [mode, setModeSignal] = createSignal<ThemeMode>(readStoredMode());
  const [system, setSystem] = createSignal<Theme>(systemTheme());

  const media = window.matchMedia(MEDIA_QUERY);
  const onChange = () => setSystem(systemTheme());
  media.addEventListener('change', onChange);
  onCleanup(() => media.removeEventListener('change', onChange));

  const theme = () => (mode() === 'system' ? system() : (mode() as Theme));

  createEffect(() => {
    document.documentElement.dataset.theme = theme();
  });

  const setMode = (next: ThemeMode) => {
    setModeSignal(next);
    try {
      if (next === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Storage unavailable (private mode, etc.); preference is session-only.
    }
  };

  const toggle = () => setMode(theme() === 'dark' ? 'light' : 'dark');

  return { theme, mode, setMode, toggle };
};

export const ThemeProvider = (props: ParentProps) => {
  const value = createTheme();
  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
