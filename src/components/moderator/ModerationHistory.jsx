import React, { useEffect, useState } from 'react';
import { apiGet } from '../../api';
import AccessDenied from '../AccessDenied';
import './ModerationHistory.css';

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function ModerationHistory() {
  const [history, setHistory] = useState([]);
  const [adminActions, setAdminActions] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userMap, setUserMap] = useState({});

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
          setMessage('Не удалось загрузить историю');
        }
        setLoading(false);
      });
  }, []);

  if (accessDenied) {
    return (
      <AccessDenied
        title="Доступ к истории запрещен"
        message="У вашей учетной записи нет прав модератора."
        actionLabel="В личный кабинет"
        actionHref="/dashboard"
      />
    );
  }

  if (loading) {
    return (
      <div className="history-page">
        <h1>История модерации</h1>
        <div className="history-message">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <h1>История модерации</h1>

      <div className="history-nav">
        <a href="/moderator/dashboard">Назад</a>
        <a href="/admin/dashboard">Админка</a>
        <a href="/logout">Выйти</a>
      </div>

      {message && <div className="history-message">{message}</div>}

      <h3>История объявлений</h3>
      <table className="history-table" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>Объявление</th>
            <th>Из</th>
            <th>В</th>
            <th>Модератор</th>
            <th>Время</th>
            <th>Причина</th>
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
              <td colSpan="7">Пока нет записей</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Админские действия</h3>
      <table className="history-table" border="1" cellPadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>Действие</th>
            <th>Цель</th>
            <th>Подробнее</th>
            <th>Кто</th>
            <th>Время</th>
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
              <td colSpan="6">Пока нет записей</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ModerationHistory;

