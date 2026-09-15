import { For } from 'solid-js';

import { type Locale, locales, useI18n } from '../../i18n';

export const LocaleSelect = () => {
  const { t, locale, setLocale } = useI18n();

  return (
    <select
      class='rounded-md border border-border bg-background px-2 py-1 text-sm text-muted-foreground'
      aria-label={t('locale.label')}
      value={locale()}
      onChange={(event) => setLocale(event.currentTarget.value as Locale)}
    >
      <For each={locales}>{(code) => <option value={code}>{t(`locale.${code}`)}</option>}</For>
    </select>
  );
};
