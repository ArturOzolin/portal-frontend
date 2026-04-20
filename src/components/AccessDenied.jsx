import React from 'react';
import PropTypes from 'prop-types';
import './AccessDenied.css';
import { useI18n } from '../i18n/I18nProvider';

function AccessDenied({ title, message, actionLabel = '', actionHref = '/' }) {
  const { t } = useI18n();
  return (
    <div className="access-denied">
      <div className="access-denied-card">
        <h1>{title || t('accessDenied.title', 'Access denied')}</h1>
        <p>{message || t('accessDenied.message', 'You do not have permission to view this page.')}</p>
        <a className="access-denied-button" href={actionHref}>
          {actionLabel || t('accessDenied.actionHome', 'Go home')}
        </a>
      </div>
    </div>
  );
}

AccessDenied.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  actionLabel: PropTypes.string,
  actionHref: PropTypes.string
};

export default AccessDenied;
