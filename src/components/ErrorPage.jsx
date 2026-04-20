import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import './ErrorPage.css';

const ErrorPage = ({ defaultCode = '500', defaultMessage }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useI18n();

  const fallbackMessage = defaultMessage || t('errorPage.defaultMessage');
  const code = params.get('code') || defaultCode;
  const message = params.get('message') || fallbackMessage;

  return (
    <div className="errorPage">
      <div className="errorCard">
        <div className="errorCode">{code}</div>
        <h1>{t('errorPage.title')}</h1>
        <p>{message}</p>
        <div className="errorActions">
          <button onClick={() => navigate('/')}>{t('errorPage.home')}</button>
          <button className="secondary" onClick={() => navigate(-1)}>{t('errorPage.back')}</button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
