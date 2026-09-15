import i18next, { type i18n as I18n, type InitOptions, type ResourceKey, type TFunction } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import {
  type Accessor,
  type ParentProps,
  Show,
  createContext,
  createEffect,
  createResource,
  createSignal,
  on,
  onCleanup,
  useContext,
} from 'solid-js';

export type LoadResources = (language: string, namespace: string) => Promise<ResourceKey>;

export type I18nOptions = {
  /** Languages the app ships; the first is used as the fallback. */
  supportedLngs: readonly [string, ...string[]];
  /** Loads the resource bundle for a language/namespace, e.g. `import(\`./locales/${lng}.json\`)`. */
  loadResources: LoadResources;
  /** Force a language rather than detecting it (tests, Storybook). */
  lng?: string;
  /** Extra i18next options merged last. */
  init?: InitOptions;
};

/**
 * Creates and initializes an i18next instance. Resources are lazy-loaded per language.
 * Detection order: localStorage (`i18nextLng`), navigator; the choice is cached to localStorage.
 */
export const createI18n = async (options: I18nOptions): Promise<I18n> => {
  const instance = i18next.createInstance();
  instance.use(resourcesToBackend(options.loadResources));
  if (!options.lng) {
    instance.use(LanguageDetector);
  }
  await instance.init({
    lng: options.lng,
    supportedLngs: [...options.supportedLngs],
    fallbackLng: options.supportedLngs[0],
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
    ...options.init,
  });
  return instance;
};

export type I18nContextValue = {
  i18n: I18n;
  /** Reactive translate function: re-evaluates when the language changes. */
  t: TFunction;
  language: Accessor<string>;
  changeLanguage: (lng: string) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue>();

const createI18nContext = (instance: I18n): I18nContextValue => {
  const [language, setLanguage] = createSignal(instance.resolvedLanguage ?? instance.language);
  const onChanged = () => setLanguage(instance.resolvedLanguage ?? instance.language);
  instance.on('languageChanged', onChanged);
  onCleanup(() => instance.off('languageChanged', onChanged));

  createEffect(() => {
    document.documentElement.lang = language();
  });

  // Track `language` so callers re-render on change; i18next itself is not reactive.
  // The cast preserves the app's `CustomTypeOptions` augmentation on `t`.
  const t = new Proxy(instance.t, {
    apply: (target, _thisArg, args: Parameters<TFunction>) => {
      language();
      return Reflect.apply(target, instance, args);
    },
  });

  return {
    i18n: instance,
    t,
    language,
    changeLanguage: async (lng) => {
      await instance.changeLanguage(lng);
    },
  };
};

export type I18nProviderProps = ParentProps<{
  options: I18nOptions;
  /** Rendered while the initial language bundle loads. */
  fallback?: any;
}>;

export const I18nProvider = (props: I18nProviderProps) => {
  const [instance] = createResource(() => createI18n(props.options));

  return (
    <Show when={instance()} fallback={props.fallback}>
      {(ready) => <I18nContextInner instance={ready()} lng={props.options.lng} children={props.children} />}
    </Show>
  );
};

export type I18nInstanceProviderProps = ParentProps<{
  /** Already-initialized instance (e.g. created once with a top-level `await createI18n(...)`). */
  instance: I18n;
  lng?: string;
}>;

/**
 * Synchronous variant of {@link I18nProvider} for callers that already hold a resolved instance.
 * Storybook decorators need this: `Story` never renders if it is nested behind the async
 * `Show`/`createResource` that `I18nProvider` uses internally.
 */
export const I18nInstanceProvider = (props: I18nInstanceProviderProps) => (
  <I18nContextInner instance={props.instance} lng={props.lng} children={props.children} />
);

const I18nContextInner = (props: ParentProps<{ instance: I18n; lng?: string }>) => {
  const value = createI18nContext(props.instance);

  createEffect(
    on(
      () => props.lng,
      (lng) => {
        if (lng && lng !== value.language()) {
          void value.changeLanguage(lng);
        }
      },
      { defer: true },
    ),
  );

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
