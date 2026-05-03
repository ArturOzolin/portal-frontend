import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../../api';
import AccessDenied from '../AccessDenied';
import { useI18n } from '../../i18n/I18nProvider';
import eyeIcon from '../../assets/eye.png';
import './ModeratorDashboard.css';

const API_BASE = '';

function ModeratorDashboard() {
  const { t, language } = useI18n();

  const ACTION_CONFIGS = useMemo(() => ({
    approve: {
      icon: '✓',
      title: t('moderator.approveTitleAction'),
      message: (title) => t('moderator.approveMsg').replace('{title}', title),
      confirmClass: 'approve',
      successMessage: t('moderator.approveSuccess'),
    },
    reject: {
      icon: '↩',
      title: t('moderator.rejectTitleAction'),
      message: (title) => t('moderator.rejectMsg').replace('{title}', title),
      confirmClass: 'reject',
      successMessage: t('moderator.rejectSuccess'),
    },
    delete: {
      icon: '✕',
      title: t('moderator.deleteTitleAction'),
      message: (title) => t('moderator.deleteMsg').replace('{title}', title),
      confirmClass: 'delete',
      successMessage: t('moderator.deleteSuccess'),
    },
  }), [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const REJECT_REASONS = useMemo(() => [
    t('moderator.rejectReason1'),
    t('moderator.rejectReason2'),
    t('moderator.rejectReason3'),
  ], [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const DELETE_REASONS = useMemo(() => [
    t('moderator.deleteReason1'),
    t('moderator.deleteReason2'),
    t('moderator.deleteReason3'),
    t('moderator.deleteReason4'),
  ], [t]); // eslint-disable-line react-hooks/exhaustive-deps

  const [ads, setAds]               = useState([]);
  const [stats, setStats]           = useState(null);
  const [message, setMessage]       = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading]       = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [reasonOpen, setReasonOpen]     = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [currentAd, setCurrentAd]       = useState(null);
  const [currentReason, setCurrentReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [reasonRequired, setReasonRequired] = useState(false);
  const [historyOpen, setHistoryOpen]   = useState({});
  const [historyData, setHistoryData]   = useState({});

  const reasons = useMemo(() => {
    if (currentAction === 'reject') return REJECT_REASONS;
    if (currentAction === 'delete') return DELETE_REASONS;
    return [];
  }, [currentAction, REJECT_REASONS, DELETE_REASONS]);

  function formatDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatPrice(price) {
    if (price === -1) return t('moderator.negotiable');
    if (price === 0)  return t('moderator.free');
    return `${price?.toLocaleString()} ₽`;
  }

  const load = () => {
    setLoading(true);
    apiGet('/api/moderator/dashboard')
      .then((data) => {
        setAds(data.ads || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch((err) => {
        if (err && (err.status === 401 || err.status === 403)) {
          setAccessDenied(true);
        } else if (!err?.status) {
          setAccessDenied(true);
        } else {
          setMessage(t('moderator.loadError'));
          setMessageType('error');
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showNotification = (text, type) => {
    setMessage(text);
    setMessageType(type || 'info');
    setTimeout(() => { setMessage(''); setMessageType(''); }, 3000);
  };

  const openConfirm = (action, ad) => { setCurrentAction(action); setCurrentAd(ad); setConfirmOpen(true); };
  const openReason  = (action, ad) => {
    setCurrentAction(action); setCurrentAd(ad);
    setCurrentReason(''); setCustomReason(''); setReasonRequired(false);
    setReasonOpen(true);
  };

  const handleActionClick = (action, ad) => {
    if (action === 'approve') openConfirm(action, ad);
    else openReason(action, ad);
  };

  const confirmWithReason = () => {
    if (!currentReason && !customReason.trim()) { setReasonRequired(true); return; }
    setCurrentReason(currentReason || customReason.trim());
    setReasonOpen(false);
    openConfirm(currentAction, currentAd);
  };

  const executeAction = async () => {
    if (!currentAction || !currentAd) return;
    try {
      const res = await apiPost(`/api/moderator/${currentAction}`, {
        adId: currentAd.id,
        reason: currentAction === 'approve' ? null : currentReason,
      });
      showNotification(ACTION_CONFIGS[currentAction].successMessage, res.success ? 'success' : 'error');
      setConfirmOpen(false);
      setCurrentAction(null); setCurrentAd(null); setCurrentReason('');
      load();
    } catch {
      showNotification(t('moderator.actionError'), 'error');
      setConfirmOpen(false);
    }
  };

  const toggleHistory = async (adId) => {
    setHistoryOpen(prev => ({ ...prev, [adId]: !prev[adId] }));
    if (historyData[adId]) return;
    try {
      const data = await apiGet(`/api/announcements/${adId}/history`);
      setHistoryData(prev => ({ ...prev, [adId]: data || [] }));
    } catch {
      setHistoryData(prev => ({ ...prev, [adId]: [] }));
    }
  };

  const handleLogout = async () => {
    try { await fetch(`${API_BASE}/api/users/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    window.location.href = '/login';
  };

  if (accessDenied) {
    return (
      <AccessDenied
        title={t('moderator.accessTitle')}
        message={t('moderator.accessMsg')}
        actionLabel={t('moderator.goToDashboard')}
        actionHref="/dashboard"
      />
    );
  }

  if (loading) {
    return (
      <div className="mod-wrap">
        <div className="mod-shell">
          <div className="mod-loading">{t('moderator.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mod-wrap">
      <div className="mod-shell">

        {/* Top bar */}
        <header className="mod-topbar">
          <a href="/" className="mod-brand">
            <div className="mod-brand-mark"></div>
            <span>PORTAL</span>
          </a>
          <span className="mod-topbar-title">{t('moderator.title')}</span>
          <div className="mod-topbar-nav">
            <a href="/dashboard" className="mod-btn mod-btn-ghost">{t('moderator.dashboard')}</a>
            <button className="mod-btn mod-btn-ghost" onClick={handleLogout}>{t('moderator.signOut')}</button>
          </div>
        </header>

        {/* Toast */}
        {message && (
          <div className={`mod-toast mod-toast-${messageType}`}>{message}</div>
        )}

        <div className="mod-card">

          {/* Stats */}
          <div className="mod-stats">
            <div className="mod-stat">
              <div className="mod-stat-num">{ads.length}</div>
              <div className="mod-stat-label">{t('moderator.awaitingReview')}</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-num">{stats?.totalUsers ?? 0}</div>
              <div className="mod-stat-label">{t('moderator.totalUsers')}</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-num">{stats?.moderatorCount ?? 0}</div>
              <div className="mod-stat-label">{t('moderator.moderatorsCount')}</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-num">{stats?.adminCount ?? 0}</div>
              <div className="mod-stat-label">{t('moderator.adminsCount')}</div>
            </div>
          </div>

          <h3 className="mod-section-title">{t('moderator.listingsUnderReview')}</h3>

          {ads.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty-icon">📋</div>
              <h3>{t('moderator.nothingToReview')}</h3>
              <p>{t('moderator.allProcessed')}</p>
            </div>
          ) : (
            <div className="mod-ads-list">
              {ads.map(ad => (
                <div className="mod-ad-card" key={ad.id}>

                  {/* Photo */}
                  <div className="mod-ad-photo-wrap">
                    <img
                      src={`${API_BASE}/ad-photo?adId=${ad.id}&photoIndex=0`}
                      alt={ad.title}
                      onError={e => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement.innerHTML =
                          `<div class="mod-ad-photo-fallback"><span>📷</span><span>${t('moderator.noPhoto')}</span></div>`;
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="mod-ad-body">
                    <div className="mod-ad-top">
                      <a className="mod-ad-title" href={`/ad/${ad.id}`} target="_blank" rel="noreferrer">{ad.title}</a>
                      <span className="mod-status-badge">{t('moderator.underReview')}</span>
                    </div>

                    <div className="mod-ad-price">{formatPrice(ad.price)}</div>

                    <div className="mod-ad-meta">
                      {ad.category    && <span>{ad.category}</span>}
                      {ad.subcategory && <span>{ad.subcategory}</span>}
                      {ad.createdAt   && <span>{formatDate(ad.createdAt)}</span>}
                    </div>

                    {ad.location && (
                      <div className="mod-ad-location">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        {ad.location}
                      </div>
                    )}

                    {ad.description && (
                      <div className="mod-ad-desc">{ad.description}</div>
                    )}

                    <div className="mod-ad-views">
                      <span
                        className="mod-ad-views-icon"
                        aria-hidden="true"
                        style={{
                          WebkitMaskImage: `url(${eyeIcon})`,
                          maskImage: `url(${eyeIcon})`
                        }}
                      />
                      {ad.viewCount || 0} {t('moderator.views')}
                    </div>

                    <div className="mod-actions">
                      <button className="mod-btn-approve" onClick={() => handleActionClick('approve', ad)}>
                        {t('moderator.approveBtn')}
                      </button>
                      <button className="mod-btn-reject" onClick={() => handleActionClick('reject', ad)}>
                        {t('moderator.sendBackBtn')}
                      </button>
                      <button className="mod-btn-history" onClick={() => toggleHistory(ad.id)}>
                        {historyOpen[ad.id] ? t('moderator.hideHistoryBtn') : t('moderator.historyBtn')}
                      </button>
                    </div>

                    {historyOpen[ad.id] && (
                      <div className="mod-history-box">
                        {(historyData[ad.id] || []).length > 0 ? (
                          historyData[ad.id].map((item, i) => (
                            <div className="mod-history-entry" key={i}>
                              <div><strong>{item.fromStatus || '—'}</strong> → <strong>{item.toStatus}</strong></div>
                              <div className="mod-history-meta">
                                {formatDate(item.createdAt)}
                                {item.moderatorId ? ` · ${t('moderator.moderatorLabel')} ${item.moderatorId}` : ''}
                              </div>
                              {item.reason && <div>{item.reason}</div>}
                            </div>
                          ))
                        ) : (
                          <div className="mod-history-entry">{t('moderator.noHistoryRecords')}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpen && currentAction && currentAd && (
        <div className="mod-modal" onClick={e => e.target === e.currentTarget && setConfirmOpen(false)}>
          <div className="mod-modal-box">
            <div className="mod-modal-icon">{ACTION_CONFIGS[currentAction].icon}</div>
            <div className="mod-modal-title">{ACTION_CONFIGS[currentAction].title}</div>
            <div className="mod-modal-msg">{ACTION_CONFIGS[currentAction].message(currentAd.title)}</div>
            <div className="mod-modal-actions">
              <button className="mod-modal-cancel" onClick={() => setConfirmOpen(false)}>{t('moderator.cancel')}</button>
              <button className={`mod-modal-confirm ${ACTION_CONFIGS[currentAction].confirmClass}`} onClick={executeAction}>
                {t('moderator.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reason modal */}
      {reasonOpen && currentAction && currentAd && (
        <div className="mod-modal" onClick={e => e.target === e.currentTarget && setReasonOpen(false)}>
          <div className="mod-reason-box">
            <div className="mod-modal-title">{t('moderator.selectReason')}</div>
            <div style={{ textAlign: 'left' }}>
              <div className="mod-reason-label">{t('moderator.chooseOne')}</div>
              <div className="mod-reason-btns">
                {reasons.map(r => (
                  <button
                    key={r}
                    className={`mod-reason-btn${currentReason === r ? ' selected' : ''}`}
                    onClick={() => { setCurrentReason(r); setCustomReason(''); setReasonRequired(false); }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="mod-reason-label">{t('moderator.orEnterOwn')}</div>
              <textarea
                className="mod-reason-textarea"
                placeholder={t('moderator.enterReasonPlaceholder')}
                value={customReason}
                onChange={e => { setCustomReason(e.target.value); setCurrentReason(''); setReasonRequired(false); }}
              />
              {reasonRequired && (
                <div className="mod-reason-error">{t('moderator.reasonRequired')}</div>
              )}
            </div>
            <div className="mod-modal-actions" style={{ marginTop: 20 }}>
              <button className="mod-modal-cancel" onClick={() => setReasonOpen(false)}>{t('moderator.cancel')}</button>
              <button className="mod-modal-confirm" onClick={confirmWithReason}>{t('moderator.continueBtn')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModeratorDashboard;
