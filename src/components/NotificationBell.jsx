import React, { useEffect, useMemo, useState } from 'react';
import './NotificationBell.css';
import { useI18n } from '../i18n/I18nProvider';
import notificationIcon from '../assets/notification.png';

const API_BASE = 'http://localhost:8080';

const NotificationBell = ({ adIds = [] }) => {
  const { t } = useI18n();
  const normalizedAdIds = useMemo(() => adIds.filter(Boolean), [adIds]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    if (!normalizedAdIds.length) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const [listResp, countResp] = await Promise.all([
        fetch(`${API_BASE}/api/notifications/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(normalizedAdIds)
        }),
        fetch(`${API_BASE}/api/notifications/user/unread-count`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(normalizedAdIds)
        })
      ]);

      const listData = listResp.ok ? await listResp.json() : [];
      const countData = countResp.ok ? await countResp.json() : { unreadCount: 0 };

      setNotifications(Array.isArray(listData) ? listData : []);
      setUnreadCount(Number(countData.unreadCount || 0));
    } catch (e) {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedAdIds.join(',')]);

  useEffect(() => {
    if (!isOpen) return;
    const close = (e) => {
      if (!e.target.closest('.notificationContainer')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [isOpen]);

  const markAsRead = async (id) => {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: 'POST',
      credentials: 'include'
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const removeNotification = async (id) => {
    await fetch(`${API_BASE}/api/notifications/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = async () => {
    await fetch(`${API_BASE}/api/notifications/user/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(normalizedAdIds)
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const getTitle = (action) => {
    if (action === 'approve') return t('notifications.approve', 'Listing approved');
    if (action === 'reject') return t('notifications.reject', 'Needs revision');
    if (action === 'delete') return t('notifications.delete', 'Listing rejected');
    return t('notifications.title', 'Notification');
  };

  return (
    <div className="notificationContainer">
      <button
        className="notificationBell"
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) loadNotifications();
        }}
      >
        <span
          className="notificationBellIcon"
          aria-hidden="true"
          style={{
            WebkitMaskImage: `url(${notificationIcon})`,
            maskImage: `url(${notificationIcon})`
          }}
        />
        {unreadCount > 0 && <span className="notificationBadge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notificationDropdown">
          <div className="notificationHeader">
            <h4>{t('notifications.title', 'Notifications')}</h4>
            {unreadCount > 0 && (
              <button className="markAllBtn" onClick={markAllAsRead}>{t('notifications.readAll', 'Mark all as read')}</button>
            )}
          </div>

          {loading ? (
            <div className="notificationEmpty">{t('common.loading')}</div>
          ) : notifications.length === 0 ? (
            <div className="notificationEmpty">{t('notifications.empty', 'No notifications')}</div>
          ) : (
            <div className="notificationList">
              {notifications.map((item) => (
                <div key={item.id} className={`notificationItem ${item.isRead ? 'read' : 'unread'}`}>
                  <div className="notificationBody" onClick={() => !item.isRead && markAsRead(item.id)}>
                    <div className="notificationTitle">{getTitle(item.action)}</div>
                    <div className="notificationText">{item.reason || t('notifications.defaultText', 'Listing status was changed by moderator')}</div>
                  </div>
                  <button className="deleteBtn" onClick={() => removeNotification(item.id)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
