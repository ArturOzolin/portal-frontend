import React from 'react';
import { useI18n } from '../i18n/I18nProvider';
import './LanguageToggle.css';

const LanguageToggle = () => {
  const { language, setLanguage, t } = useI18n();
  const isRussian = language === 'ru';

  return (
    <button
      type="button"
      className={`lang-toggle${isRussian ? ' ru' : ' en'}`}
      onClick={() => setLanguage(isRussian ? 'en' : 'ru')}
      title={isRussian ? t('languageToggle.switchToEnglish') : t('languageToggle.switchToRussian')}
      aria-label={isRussian ? t('languageToggle.switchToEnglish') : t('languageToggle.switchToRussian')}
    >
      <span className="lang-toggle-knob">
        <span className="lang-toggle-label">{isRussian ? 'RU' : 'EN'}</span>
      </span>
    </button>
  );
};

export default LanguageToggle;
