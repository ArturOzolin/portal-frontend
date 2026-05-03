import React, { useEffect, useState } from 'react';
import { apiGet } from '../../api';
import AccessDenied from '../AccessDenied';
import { useI18n } from '../../i18n/I18nProvider';
import './ModerationHistory.css';

function ModerationHistory() {
  const { t, language } = useI18n();
  const [history, setHistory] = useState([]);
  const [adminActions, setAdminActions] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userMap, setUserMap] = useState({});

  function formatDateTime(value) {
    if (!value) return '';
    return new Date(value).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([apiGet('/api/moderator/history'), apiGet('/api/users')])
      .then(([historyData, users]) => {
        const map = {};
        (users || []).forEach((user) => {
          map[user.id] = user.name || user.email || `User ${user.id}`;
        });
        setUserMap(map);
        setHistory(historyData.history || []);
        setAdminActions(historyData.adminActions || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err && (err.status === 401 || err.status === 403)) {
          setAccessDenied(true);
        } else {
          setMessage(t('moderator.historyLoadError'));
        }
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (accessDenied) {
    return (
      <AccessDenied
        title={t('moderator.historyAccessTitle')}
        message={t('moderator.historyAccessMsg')}
        actionLabel={t('moderator.goToDashboard')}
        actionHref="/dashboard"
      />
    );
  }

  if (loading) {
    return (
      <div className="history-page">
        <h1>{t('moderator.historyTitle')}</h1>
        <div className="history-message">{t('moderator.historyLoading')}</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <h1>{t('moderator.historyTitle')}</h1>

      <div className="history-nav">
        <a href="/moderator/dashboard">{t('moderator.historyBack')}</a>
        <a href="/admin/dashboard">{t('moderator.historyAdminLink')}</a>
        <a href="/logout">{t('moderator.historySignOut')}</a>
      </div>

      {message && <div className="history-message">{message}</div>}

      <h3>{t('moderator.listingHistoryTitle')}</h3>
      <table className="history-table" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('moderator.colListing')}</th>
            <th>{t('moderator.colFrom')}</th>
            <th>{t('moderator.colTo')}</th>
            <th>{t('moderator.colModerator')}</th>
            <th>{t('moderator.colTime')}</th>
            <th>{t('moderator.colReason')}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => (
            <tr key={`${item.id}-${index}`}>
              <td>{index + 1}</td>
              <td>{item.adId}</td>
              <td>{item.fromStatus || '-'}</td>
              <td>{item.toStatus}</td>
              <td>{item.moderatorId ? (userMap[item.moderatorId] || item.moderatorId) : '-'}</td>
              <td>{formatDateTime(item.createdAt)}</td>
              <td>{item.reason}</td>
            </tr>
          ))}
          {history.length === 0 && (
            <tr>
              <td colSpan="7">{t('moderator.noListingRecords')}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>{t('moderator.adminActionsTitle')}</h3>
      <table className="history-table" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>{t('moderator.colAction')}</th>
            <th>{t('moderator.colTarget')}</th>
            <th>{t('moderator.colDetails')}</th>
            <th>{t('moderator.colWho')}</th>
            <th>{t('moderator.colTime')}</th>
          </tr>
        </thead>
        <tbody>
          {adminActions.map((item, index) => (
            <tr key={`${item.id}-${index}`}>
              <td>{index + 1}</td>
              <td>{item.actionType}</td>
              <td>{item.targetType} {item.targetId}</td>
              <td>{item.details}</td>
              <td>{item.actorId ? (userMap[item.actorId] || item.actorId) : item.actorEmail}</td>
              <td>{formatDateTime(item.createdAt)}</td>
            </tr>
          ))}
          {adminActions.length === 0 && (
            <tr>
              <td colSpan="6">{t('moderator.noAdminRecords')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ModerationHistory;
