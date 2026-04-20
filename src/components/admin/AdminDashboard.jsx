import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../api';
import AccessDenied from '../AccessDenied';
import './AdminDashboard.css';

const ROLE_LABELS = {
  ADMIN: 'Администратор',
  MODERATOR: 'Модератор',
  USER: 'Пользователь'
};

function getRoleLabel(role) {
  if (!role) return '';
  if (typeof role === 'string') return ROLE_LABELS[role] || role;
  if (role.displayName) return role.displayName;
  return String(role.name || role);
}

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const refreshDashboard = async () => {
    const data = await apiGet('/api/admin/dashboard');
    const orderedUsers = (data.users || []).slice().sort((a, b) => (a.id || 0) - (b.id || 0));
    setUsers(orderedUsers);
    setStats(data.stats || null);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet('/api/admin/dashboard')
      .then((data) => {
        if (!active) return;
        const orderedUsers = (data.users || []).slice().sort((a, b) => (a.id || 0) - (b.id || 0));
        setUsers(orderedUsers);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        if (err && (err.status === 401 || err.status === 403)) {
          setAccessDenied(true);
        } else if (!err?.status) {
          setAccessDenied(true);
        } else {
          setMessage('Не удалось загрузить панель администратора');
          setMessageType('error');
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const showNotification = (text, type) => {
    setMessage(text);
    setMessageType(type || 'success');
    setTimeout(() => { setMessage(''); setMessageType(''); }, 3000);
  };

  const submitRole = async (userId, role, action) => {
    try {
      const res = await apiPost('/api/admin/role', { targetUserId: userId, role, action });
      showNotification(res.message || 'Готово', res.success ? 'success' : 'error');
      await refreshDashboard();
    } catch (err) {
      showNotification('Не удалось обновить роль', 'error');
    }
  };

  const submitCoins = async (userId, action, amount) => {
    try {
      const res = await apiPost('/api/admin/coins', {
        targetUserId: userId,
        action,
        amount: Number(amount || 0)
      });
      showNotification(res.message || 'Готово', res.success ? 'success' : 'error');
      await refreshDashboard();
    } catch (err) {
      showNotification('Не удалось обновить монеты', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8080/api/users/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    window.location.href = '/login';
  };

  if (accessDenied) {
    return (
      <AccessDenied
        title="Доступ к админке запрещен"
        message="У вашей учетной записи нет прав администратора."
        actionLabel="В личный кабинет"
        actionHref="/dashboard"
      />
    );
  }

  if (loading) {
    return (
      <div className="adm-wrap">
        <div className="adm-shell">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Загрузка…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-wrap">
      <div className="adm-shell">

        {/* Topbar */}
        <header className="adm-topbar">
          <a href="/" className="adm-brand">
            <div className="adm-brand-mark"></div>
            <span>PORTAL</span>
          </a>
          <span className="adm-topbar-title">Панель администратора</span>
          <div className="adm-topbar-nav">
            <a href="/dashboard" className="adm-btn">Личный кабинет</a>
            <a href="/moderator/dashboard" className="adm-btn">История модерации</a>
            <button className="adm-btn" type="button" onClick={handleLogout}>Выйти</button>
          </div>
        </header>

        {/* Toast */}
        {message && (
          <div className={`adm-toast adm-toast-${messageType}`}>{message}</div>
        )}

        {/* Stats */}
        <div className="adm-stats">
          <div className="adm-stat">
            <div className="adm-stat-num">{stats?.totalUsers ?? 0}</div>
            <div className="adm-stat-label">Всего пользователей</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat-num">{stats?.adminCount ?? 0}</div>
            <div className="adm-stat-label">Администраторов</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat-num">{stats?.moderatorCount ?? 0}</div>
            <div className="adm-stat-label">Модераторов</div>
          </div>
        </div>

        {/* Users table */}
        <div className="adm-card">
          <h2 className="adm-card-title">Пользователи</h2>
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th>Email</th>
                <th>Имя</th>
                <th style={{ width: 140 }}>Роли</th>
                <th style={{ width: 80 }}>Монеты</th>
                <th style={{ width: 320 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    Пользователи не найдены
                  </td>
                </tr>
              )}
              {users.map((user) => {
                const userRoles = new Set((user.roles || []).map(String));
                const isModerator = userRoles.has('MODERATOR') || userRoles.has('ADMIN');
                const isAdmin = userRoles.has('ADMIN');

                return (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                    <td>{user.name}</td>
                    <td>
                      {(user.roles || []).map((role, i) => (
                        <span key={i} className="adm-role-badge">{getRoleLabel(role)}</span>
                      ))}
                    </td>
                    <td>🪙 {user.coins}</td>
                    <td>
                      <div className="adm-actions">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="adm-btn"
                            type="button"
                            onClick={() => submitRole(user.id, 'MODERATOR', isModerator ? 'revoke' : 'assign')}
                          >
                            {isModerator ? 'Снять модератора' : 'Модератор'}
                          </button>
                          <button
                            className={`adm-btn ${isAdmin ? 'adm-btn-danger' : 'adm-btn-primary'}`}
                            type="button"
                            onClick={() => submitRole(user.id, 'ADMIN', isAdmin ? 'revoke' : 'assign')}
                          >
                            {isAdmin ? 'Снять админа' : 'Сделать админом'}
                          </button>
                        </div>
                        <div className="adm-inline-form">
                          <input
                            type="number"
                            min="1"
                            defaultValue="50"
                            id={`coins-add-${user.id}`}
                          />
                          <button
                            className="adm-btn adm-btn-primary"
                            type="button"
                            onClick={() => submitCoins(user.id, 'add', document.getElementById(`coins-add-${user.id}`).value)}
                          >
                            + Монеты
                          </button>
                        </div>
                        <div className="adm-inline-form">
                          <input
                            type="number"
                            min="1"
                            defaultValue="20"
                            id={`coins-deduct-${user.id}`}
                          />
                          <button
                            className="adm-btn adm-btn-danger"
                            type="button"
                            onClick={() => submitCoins(user.id, 'deduct', document.getElementById(`coins-deduct-${user.id}`).value)}
                          >
                            − Монеты
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;
