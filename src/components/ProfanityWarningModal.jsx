import React from 'react';
import './ProfanityWarningModal.css';
import { useI18n } from '../i18n/I18nProvider';

const ProfanityWarningModal = ({ open, onClose }) => {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="profanityOverlay" onClick={onClose}>
      <div className="profanityModal" onClick={(e) => e.stopPropagation()}>
        <div className="profanityIcon">⚠️</div>
        <h3>{t('profanity.title')}</h3>
        <p>{t('profanity.description')}</p>
        <button onClick={onClose}>{t('profanity.ok')}</button>
      </div>
    </div>
  );
};

export default ProfanityWarningModal;
