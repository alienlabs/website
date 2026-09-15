import { For } from 'solid-js';

import { useI18n } from '@richburdon/ui-core/i18n';

import { languages } from '../../i18n';

// Dynamic keys, declared for `i18next-cli extract`:
// t('locale.en')
// t('locale.ja')
export const LocaleSelect = () => {
  const { t, language, changeLanguage } = useI18n();

  return (
    <select
      class='rounded-md border border-border bg-background px-2 py-1 text-sm text-muted-foreground'
      aria-label={t('locale.label')}
      value={language()}
      onChange={(event) => void changeLanguage(event.currentTarget.value)}
    >
      <For each={languages}>{(code) => <option value={code}>{t(`locale.${code}`)}</option>}</For>
    </select>
  );
};
