import { useI18n } from '../../stores/languageStore';

const languages = [
    { value: 'fr', shortLabel: 'FR', labelKey: 'common.french' },
    { value: 'en', shortLabel: 'EN', labelKey: 'common.english' }
];

const LanguageSwitch = ({ compact = false, className = '' }) => {
    const { language, setLanguage, t } = useI18n();

    return (
        <div
            className={`inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-dark-700 dark:bg-dark-800 ${className}`}
            aria-label={t('common.language')}
        >
            {languages.map((item) => (
                <button
                    key={item.value}
                    type="button"
                    onClick={() => setLanguage(item.value)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        language === item.value
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-dark-700 dark:hover:text-white'
                    }`}
                    title={t(item.labelKey)}
                    aria-pressed={language === item.value}
                >
                    {compact ? item.shortLabel : t(item.labelKey)}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitch;
