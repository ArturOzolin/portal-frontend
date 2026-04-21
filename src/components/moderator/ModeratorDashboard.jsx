import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../../api';
import AccessDenied from '../AccessDenied';
import './ModeratorDashboard.css';
import eyeIcon from '../../assets/eye.png';

const API_BASE = 'http://localhost:8080';

const ACTION_CONFIGS = {
  approve: {
    icon: '✓',
    title: 'Approve listing',
    message: (title) => `Approve "${title}"?`,
    confirmClass: 'approve',
    successMessage: 'Listing approved'
  },
  reject: {
    icon: '↩',
    title: 'Send back for revision',
    message: (title) => `Send "${title}" back for revision?`,
    confirmClass: 'reject',
    successMessage: 'Listing sent back for revision'
  },
  delete: {
    icon: '✕',
    title: 'Delete listing',
    message: (title) => `Delete "${title}"? This cannot be undone.`,
    confirmClass: 'delete',
    successMessage: 'Listing deleted'
  }
};

const REJECT_REASONS = [
  'Incomplete or incorrect information',
  'Wrong category / subcategory / tags',
  'Platform rules violation'
];

const DELETE_REASONS = [
  'Platform rules violation',
  'Fraud or deception',
  'Offensive content',
  'Spam'
];

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatPrice(price) {
  if (price === -1) return 'Negotiable';
  if (price === 0)  return 'Free';
  return `${price?.toLocaleString()} ₽`;
}

function ModeratorDashboard() {
  const [ads, setAds]               = useState([]);
  const [stats, setStats]           = useState(null);
  const [moderator, setModerator]   = useState(null);
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
  }, [currentAction]);

  const load = () => {
    setLoading(true);
    apiGet('/api/moderator/dashboard')
      .then((data) => {
        setAds(data.ads || []);
        setStats(data.stats || null);
        setModerator(data.moderator || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[ModeratorDashboard] load error:', err, 'status:', err?.status);
        if (err && (err.status === 401 || err.status === 403)) {
          setAccessDenied(true);
        } else if (!err?.status) {
          setAccessDenied(true);
        } else {
          setMessage(`Failed to load moderator panel (status: ${err.status}, path: ${err.path})`);
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
        reason: currentAction === 'approve' ? null : currentReason
      });
      showNotification(ACTION_CONFIGS[currentAction].successMessage, res.success ? 'success' : 'error');
      setConfirmOpen(false);
      setCurrentAction(null); setCurrentAd(null); setCurrentReason('');
      load();
    } catch {
      showNotification('Failed to execute action', 'error');
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
        title="Access denied"
        message="Your account does not have moderator rights."
        actionLabel="Go to Dashboard"
        actionHref="/dashboard"
      />
    );
  }

  if (loading) {
    return (
      <div className="mod-wrap">
        <div className="mod-shell">
          <div className="mod-loading">Loading…</div>
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
          <span className="mod-topbar-title">Moderation Panel</span>
          <div className="mod-topbar-nav">
            <a href="/dashboard" className="mod-btn mod-btn-ghost">Dashboard</a>
            <button className="mod-btn mod-btn-ghost" onClick={handleLogout}>Sign Out</button>
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
              <div className="mod-stat-label">Awaiting review</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-num">{stats?.totalUsers ?? 0}</div>
              <div className="mod-stat-label">Total users</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-num">{stats?.moderatorCount ?? 0}</div>
              <div className="mod-stat-label">Moderators</div>
            </div>
            <div className="mod-stat">
              <div className="mod-stat-num">{stats?.adminCount ?? 0}</div>
              <div className="mod-stat-label">Admins</div>
            </div>
          </div>

          <h3 className="mod-section-title">Listings under review</h3>

          {ads.length === 0 ? (
            <div className="mod-empty">
              <div className="mod-empty-icon">📋</div>
              <h3>Nothing to review</h3>
              <p>All listings have been processed.</p>
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
                          '<div class="mod-ad-photo-fallback"><span>📷</span><span>No photo</span></div>';
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="mod-ad-body">
                    <div className="mod-ad-top">
                      <a className="mod-ad-title" href={`/ad/${ad.id}`} target="_blank" rel="noreferrer">{ad.title}</a>
                      <span className="mod-status-badge">Under review</span>
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
                      {ad.viewCount || 0} views
                    </div>

                    <div className="mod-actions">
                      <button className="mod-btn-approve" onClick={() => handleActionClick('approve', ad)}>
                        Approve
                      </button>
                      <button className="mod-btn-reject" onClick={() => handleActionClick('reject', ad)}>
                        Send back for revision
                      </button>
                      <button className="mod-btn-history" onClick={() => toggleHistory(ad.id)}>
                        {historyOpen[ad.id] ? 'Hide history' : 'History'}
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
                                {item.moderatorId ? ` · Moderator: ${item.moderatorId}` : ''}
                              </div>
                              {item.reason && <div>{item.reason}</div>}
                            </div>
                          ))
                        ) : (
                          <div className="mod-history-entry">No records yet</div>
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
              <button className="mod-modal-cancel" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className={`mod-modal-confirm ${ACTION_CONFIGS[currentAction].confirmClass}`} onClick={executeAction}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reason modal */}
      {reasonOpen && currentAction && currentAd && (
        <div className="mod-modal" onClick={e => e.target === e.currentTarget && setReasonOpen(false)}>
          <div className="mod-reason-box">
            <div className="mod-modal-title">Select a reason</div>
            <div style={{ textAlign: 'left' }}>
              <div className="mod-reason-label">Choose one:</div>
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
              <div className="mod-reason-label">Or enter your own:</div>
              <textarea
                className="mod-reason-textarea"
                placeholder="Enter reason…"
                value={customReason}
                onChange={e => { setCustomReason(e.target.value); setCurrentReason(''); setReasonRequired(false); }}
              />
              {reasonRequired && (
                <div className="mod-reason-error">Please select or enter a reason</div>
              )}
            </div>
            <div className="mod-modal-actions" style={{ marginTop: 20 }}>
              <button className="mod-modal-cancel" onClick={() => setReasonOpen(false)}>Cancel</button>
              <button className="mod-modal-confirm" onClick={confirmWithReason}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModeratorDashboard;
