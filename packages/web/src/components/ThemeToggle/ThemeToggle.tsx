import { useI18n } from '@richburdon/ui-core/i18n';
import { useTheme } from '@richburdon/ui-core/theme';

export const ThemeToggle = () => {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  const next = () => (theme() === 'dark' ? 'light' : 'dark');

  return (
    <button
      type='button'
      class='rounded-md border border-border px-3 py-1 text-sm text-muted-foreground hover:bg-muted'
      aria-label={t('theme.toggle', { theme: t(`theme.${next()}`) })}
      onClick={toggle}
    >
      {theme() === 'dark' ? '☾' : '☀'}
    </button>
  );
};
