import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../api';
import AccessDenied from '../AccessDenied';
import { useI18n } from '../../i18n/I18nProvider';
import './AdminDashboard.css';

function AdminDashboard() {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const ROLE_LABELS = {
    ADMIN: t('admin.roleAdmin'),
    MODERATOR: t('admin.roleModerator'),
    USER: t('admin.roleUser'),
  };

  function getRoleLabel(role) {
    if (!role) return '';
    if (typeof role === 'string') return ROLE_LABELS[role] || role;
    if (role.displayName) return role.displayName;
    return String(role.name || role);
  }

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
          setMessage(t('admin.loadError'));
          setMessageType('error');
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showNotification = (text, type) => {
    setMessage(text);
    setMessageType(type || 'success');
    setTimeout(() => { setMessage(''); setMessageType(''); }, 3000);
  };

  const submitRole = async (userId, role, action) => {
    try {
      const res = await apiPost('/api/admin/role', { targetUserId: userId, role, action });
      showNotification(res.message || t('admin.done'), res.success ? 'success' : 'error');
      await refreshDashboard();
    } catch {
      showNotification(t('admin.roleUpdateError'), 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    window.location.href = '/login';
  };

  if (accessDenied) {
    return (
      <AccessDenied
        title={t('admin.accessTitle')}
        message={t('admin.accessMsg')}
        actionLabel={t('admin.goToDashboard')}
        actionHref="/dashboard"
      />
    );
  }

  if (loading) {
    return (
      <div className="adm-wrap">
        <div className="adm-shell">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            {t('admin.loading')}
          </div>
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
          <span className="adm-topbar-title">{t('admin.title')}</span>
          <div className="adm-topbar-nav">
            <a href="/dashboard" className="adm-btn">{t('admin.dashboard')}</a>
            <a href="/moderator/history" className="adm-btn">{t('admin.moderationHistory')}</a>
            <button className="adm-btn" type="button" onClick={handleLogout}>{t('admin.signOut')}</button>
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
            <div className="adm-stat-label">{t('admin.totalUsers')}</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat-num">{stats?.adminCount ?? 0}</div>
            <div className="adm-stat-label">{t('admin.adminCount')}</div>
          </div>
          <div className="adm-stat">
            <div className="adm-stat-num">{stats?.moderatorCount ?? 0}</div>
            <div className="adm-stat-label">{t('admin.moderatorCount')}</div>
          </div>
        </div>

        {/* Users table */}
        <div className="adm-card">
          <h2 className="adm-card-title">{t('admin.usersTitle')}</h2>
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <th>Email</th>
                <th>{t('admin.colName')}</th>
                <th style={{ width: 140 }}>{t('admin.colRoles')}</th>
                <th style={{ width: 320 }}>{t('admin.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    {t('admin.noUsers')}
                  </td>
                </tr>
              )}
              {users.map((user) => {
                const userRoles = new Set((user.roles || []).map(String));
                const isModerator = userRoles.has('MODERATOR');
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
                    <td>
                      <div className="adm-actions">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="adm-btn"
                            type="button"
                            onClick={() => submitRole(user.id, 'MODERATOR', isModerator ? 'revoke' : 'assign')}
                          >
                            {isModerator ? t('admin.revokeModerator') : t('admin.makeModerator')}
                          </button>
                          <button
                            className={`adm-btn ${isAdmin ? 'adm-btn-danger' : 'adm-btn-primary'}`}
                            type="button"
                            onClick={() => submitRole(user.id, 'ADMIN', isAdmin ? 'revoke' : 'assign')}
                          >
                            {isAdmin ? t('admin.revokeAdmin') : t('admin.makeAdmin')}
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
