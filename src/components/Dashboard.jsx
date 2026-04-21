import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import ChangePasswordModal from './ChangePasswordModal';
import NotificationBell from './NotificationBell';
import Icon from './Icon';
import { useI18n } from '../i18n/I18nProvider';
import { Link, useNavigate } from 'react-router-dom';
const API_BASE = 'http://localhost:8080';
const Dashboard = () => {
  const { t, language } = useI18n();
  const [user, setUser]               = useState(null);
  const [ads, setAds]                 = useState([]);
  const [favoriteAds, setFavoriteAds] = useState([]);
  const [bookedAds, setBookedAds]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage]     = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [activeSection, setActiveSection]   = useState('all');
  const [adsOpen, setAdsOpen]         = useState(false);

  useEffect(() => { loadUserData(); }, []);

  useEffect(() => {
    if (successMessage) { const t = setTimeout(() => setSuccessMessage(''), 3000); return () => clearTimeout(t); }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) { const t = setTimeout(() => setErrorMessage(''), 3000); return () => clearTimeout(t); }
  }, [errorMessage]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const userRes = await fetch('http://localhost:8080/api/users/me', { credentials: 'include' });
      if (!userRes.ok) { if (userRes.status === 401) window.location.href = '/login'; return; }
      setUser(await userRes.json());

      const adsRes = await fetch('http://localhost:8080/api/announcements/my', { credentials: 'include' });
      if (adsRes.ok) setAds((await adsRes.json()).filter(a => a.status !== 'DELETED'));

      const favRes = await fetch('http://localhost:8080/api/favorites/ads', { credentials: 'include' });
      if (favRes.ok) setFavoriteAds(await favRes.json());

      const bookedRes = await fetch('http://localhost:8080/api/v1/bookings/my', { credentials: 'include' });
      if (bookedRes.ok) setBookedAds(await bookedRes.json());
    } catch { setErrorMessage(t('dashboard.loadDataError', 'Failed to load data')); }
    finally { setLoading(false); }
  };
  const handleCancelBooking = async (adId) => {
      if (!window.confirm(t('dashboard.cancelBookingQuestion', 'Снять бронь с объявления?'))) {
          return;
      }
      try {
          const res = await fetch(`${API_BASE}/api/v1/bookings/${adId}`, {
              method: 'DELETE',
              credentials: 'include'
          });
          if (res.ok) {
              alert(t('dashboard.bookingCancelled', 'Бронь снята'));
              loadUserData();
          } else {
              const msg = await res.text();
              alert(`${t('dashboard.error', 'Ошибка')}: ${msg}`);
          }
      } catch (err) {
          console.error('Cancel booking error:', err);
          alert(t('dashboard.networkError', 'Сетевая ошибка'));
      }
  };
  const handleConfirmSale = async (adId) => {
      if (!window.confirm(t('dashboard.confirmSaleQuestion', 'Подтвердить продажу? Объявление уйдёт в архив.'))) {
          return;
      }
      try {
          const res = await fetch(`${API_BASE}/api/v1/bookings/${adId}/confirm`, {
              method: 'POST',
              credentials: 'include'
          });
          if (res.ok) {
              alert(t('dashboard.saleConfirmed', 'Продажа подтверждена!'));
              loadUserData(); // перезагружаем список
          } else {
              const msg = await res.text();
              alert(`${t('dashboard.error', 'Ошибка')}: ${msg}`);
          }
      } catch (err) {
          console.error('Confirm sale error:', err);
          alert(t('dashboard.networkError', 'Сетевая ошибка'));
      }
  };
  const handlePasswordChanged = async (currentPassword, newPassword, confirmPassword) => {
    if (newPassword !== confirmPassword) { setErrorMessage(t('dashboard.passwordsDontMatch', 'Passwords do not match!')); return false; }
    if (newPassword.length < 8) { setErrorMessage(t('dashboard.passwordTooShort', 'Password must be at least 8 characters!')); return false; }
    try {
      const res = await fetch('http://localhost:8080/api/users/change-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) { setSuccessMessage(data.message || t('dashboard.passwordChanged', 'Password changed!')); if (data.user) setUser(data.user); return true; }
      setErrorMessage(data.message || t('dashboard.changePasswordError', 'Error changing password')); return false;
    } catch { setErrorMessage(t('dashboard.changePasswordError', 'Error changing password')); return false; }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm(t('dashboard.confirmDeleteAccount', 'Are you sure? This cannot be undone.'))) return;
    try {
      const res = await fetch('http://localhost:8080/api/users/delete-account', {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) { setSuccessMessage(t('dashboard.accountDeleted', 'Account deleted')); setTimeout(() => window.location.href = '/login', 2000); }
      else setErrorMessage(`${t('common.error')}: ${await res.text()}`);
    } catch { setErrorMessage(t('dashboard.deleteAccountError', 'Error deleting account')); }
  };

  const handleLogout = async () => {
    try { await fetch('http://localhost:8080/api/users/logout', { method: 'POST', credentials: 'include' }); }
    catch {}
    window.location.href = '/login';
  };

  const handleUnfavorite = async (e, adId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:8080/api/favorites/${adId}`, { method: 'POST', credentials: 'include' });
      if (res.ok) setFavoriteAds(prev => prev.filter(a => a.id !== adId));
    } catch { setErrorMessage('Error updating favorites'); }
  };

  const handleDeleteAd = async (adId) => {
    if (!window.confirm(t('dashboard.confirmDeleteAd', 'Delete this ad?'))) return;
    try {
      const res = await fetch(`http://localhost:8080/api/announcements/${adId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { setSuccessMessage(t('dashboard.adDeleted', 'Ad deleted')); loadUserData(); }
      else setErrorMessage(t('dashboard.deleteAdError', 'Error deleting ad'));
    } catch { setErrorMessage(t('dashboard.deleteAdError', 'Error deleting ad')); }
  };

  const formatPrice = (price) => {
    if (price === -1) return t('home.negotiable');
    if (price === 0)  return t('home.free');
    return `${price.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')} ₽`;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US') : '—';

  const formatAddress = (address) => {
    if (!address) return t('dashboard.notSpecified', 'Not specified');
    if (typeof address === 'string') return address;
    if (address.fullAddress?.trim()) return address.fullAddress;
    return [address.city, address.street, address.houseNumber].filter(Boolean).join(', ') || t('dashboard.notSpecified', 'Not specified');
  };

  const STATUS_LABEL = {
    ACTIVE: t('dashboard.statusActive', 'Active'),
    DRAFT: t('dashboard.statusDraft', 'Draft'),
    UNDER_MODERATION: t('dashboard.statusModeration', 'Moderation'),
    ARCHIVED: t('dashboard.statusArchived', 'Archived'),
    DELETED: t('dashboard.statusDeleted', 'Deleted'),
    BOOKED: t('dashboard.statusBooked', 'Забронировано')

  };
  const STATUS_CLASS = { ACTIVE: 'statusActive', DRAFT: 'statusDraft', UNDER_MODERATION: 'statusModeration', ARCHIVED: 'statusArchived', DELETED: 'statusDeleted', BOOKED: 'statusBooked' };

  const activeAds      = ads.filter(a => a.status === 'ACTIVE');
  const moderationAds  = ads.filter(a => a.status === 'UNDER_MODERATION');
  const draftAds       = ads.filter(a => a.status === 'DRAFT');
  const archivedAds    = ads.filter(a => a.status === 'ARCHIVED');

  const visibleAds = activeSection === 'active'     ? activeAds
                   : activeSection === 'moderation' ? moderationAds
                   : activeSection === 'drafts'     ? draftAds
                   : activeSection === 'archive'    ? archivedAds
                   : activeSection === 'favorites'  ? favoriteAds
                   : activeSection === 'booked'     ? bookedAds
                   : ads;

    const sectionTitle = activeSection === 'active'     ? t('dashboard.sectionActive', 'Active listings')
                    : activeSection === 'moderation' ? t('dashboard.sectionModeration', 'Under review')
                    : activeSection === 'drafts'     ? t('dashboard.sectionDrafts', 'Drafts')
                    : activeSection === 'archive'    ? t('dashboard.sectionArchive', 'Archive')
                    : activeSection === 'favorites'  ? t('dashboard.sectionFavorites', 'Favorites')
                        : activeSection === 'booked' ? t('dashboard.sectionBooked', 'Booked')
                    : t('dashboard.sectionAll', 'All listings');


  const openModal  = (name) => setActiveModal(name);
  const closeModal = ()     => setActiveModal(null);

  const selectSection = (section) => {
    setActiveSection(section);
    if (['active','drafts','archive','all','moderation'].includes(section)) setAdsOpen(true);
  };

  if (loading) return (
    <div className="loadingContainer">
      <div className="loader"></div>
      <p>{t('common.loading')}</p>
    </div>
  );

  if (!user) return (
    <div className="loadingContainer">
      <p>{t('dashboard.userLoadError', 'Failed to load user data')}</p>
      <button onClick={() => window.location.href = '/login'} className="db-btn-primary" style={{ marginTop: 16 }}>
        {t('dashboard.signInAgain', 'Sign In Again')}
      </button>
    </div>
  );

  return (
    <div className="dash-wrap">
      <div className="dash-shell">

        {/* Toast messages */}
        {successMessage && <div className="db-toast db-toast-success">{successMessage}</div>}
        {errorMessage   && <div className="db-toast db-toast-error">{errorMessage}</div>}

        {/* Top bar */}
        <header className="dash-topbar">
          <Link to="/" className="dash-brand">
            <div className="dash-brand-mark"></div>
            <span>PORTAL</span>
          </Link>
          <div className="dash-topbar-right">
            <NotificationBell adIds={ads.map(a => a.id)} />
            <button className="db-btn-ghost" onClick={handleLogout}>{t('common.signOut')}</button>
          </div>
        </header>

        <div className="dash-body">

          {/* ── Sidebar ── */}
          <aside className="dash-sidebar">

            {/* Avatar */}
            <div className="db-avatar-block">
              <div className="db-avatar">
                <Icon name="user" size={36} />
              </div>
              <div className="db-avatar-name">{user.name || t('dashboard.userFallback', 'User')}</div>
              <div className="db-avatar-email">{user.email}</div>
            </div>

            {/* About Me */}
            <div className="db-info-section">
              <div className="db-section-label">{t('dashboard.aboutMe', 'About Me')}</div>

              <div className="db-info-group">
                <div className="db-info-label">{t('dashboard.basicInfo', 'Basic info')}</div>
                <div className="db-info-row"><span>{t('dashboard.name', 'Name')}</span><span>{user.name || '—'}</span></div>
                <div className="db-info-row"><span>{t('dashboard.email', 'Email')}</span><span className="db-info-ellipsis">{user.email}</span></div>
                <div className="db-info-row"><span>{t('dashboard.address', 'Address')}</span><span className="db-info-ellipsis">{formatAddress(user.address)}</span></div>
              </div>

              <div className="db-info-group">
                <div className="db-info-label">{t('dashboard.academic', 'Academic')}</div>
                <div className="db-info-row"><span>{t('dashboard.program', 'Program')}</span><span>{user.studyProgram || '—'}</span></div>
                <div className="db-info-row"><span>{t('dashboard.course', 'Course')}</span><span>{user.course ? `${user.course} ${t('dashboard.year', 'year')}` : '—'}</span></div>
              </div>

            </div>

            {/* Nav */}
            <nav className="db-nav">

              {/* Listings collapsible */}
              <button
                className={`db-nav-item db-nav-group-toggle${adsOpen ? ' open' : ''}`}
                onClick={() => setAdsOpen(o => !o)}
              >
                <span>{t('dashboard.listings', 'Listings')}</span>
                <span className="db-chevron">{adsOpen ? '▲' : '▼'}</span>
              </button>
              {adsOpen && (
                <div className="db-subnav">
                  <button className={`db-subnav-item${activeSection === 'all' ? ' active' : ''}`} onClick={() => selectSection('all')}>
                    {t('dashboard.filterAll', 'All')} <span className="db-count">{ads.length}</span>
                  </button>
                  <button className={`db-subnav-item${activeSection === 'active' ? ' active' : ''}`} onClick={() => selectSection('active')}>
                    {t('dashboard.filterActive', 'Active')} <span className="db-count">{activeAds.length}</span>
                  </button>
                  <button className={`db-subnav-item${activeSection === 'moderation' ? ' active' : ''}`} onClick={() => selectSection('moderation')}>
                    {t('dashboard.filterModeration', 'Under review')} <span className="db-count">{moderationAds.length}</span>
                  </button>
                  <button className={`db-subnav-item${activeSection === 'drafts' ? ' active' : ''}`} onClick={() => selectSection('drafts')}>
                    {t('dashboard.filterDrafts', 'Drafts')} <span className="db-count">{draftAds.length}</span>
                  </button>
                  <button className={`db-subnav-item${activeSection === 'archive' ? ' active' : ''}`} onClick={() => selectSection('archive')}>
                    {t('dashboard.filterArchive', 'Archive')} <span className="db-count">{archivedAds.length}</span>
                  </button>
                </div>
              )}

              <button
                className={`db-nav-item${activeSection === 'favorites' ? ' active' : ''}`}
                onClick={() => selectSection('favorites')}
              >
                ♡ {t('dashboard.filterFavorites', 'Favorites')} <span className="db-count">{favoriteAds.length}</span>
              </button>

              <button
                className={`db-nav-item${activeSection === 'booked' ? ' active' : ''}`}
                onClick={() => selectSection('booked')}
              >
                🔖 {t('dashboard.filterBooked', 'Booked')} <span className="db-count">{bookedAds.length}</span>
              </button>

              <Link to="/" className="db-nav-item">
                {t('dashboard.browseMarketplace', 'Browse Marketplace')}
              </Link>

              <Link to="/edit-profile" className="db-nav-item">
                {t('dashboard.editProfile', 'Edit Profile')}
              </Link>

              <button className="db-nav-item" onClick={() => openModal('account')}>
                {t('dashboard.accountSettings', 'Account Settings')}
              </button>

              <Link to="/support" className="db-nav-item">
                {t('dashboard.support', 'Support')}
              </Link>

              {user.moderator && (
                <button className="db-nav-item db-nav-role db-nav-moderator" onClick={() => window.location.href = '/moderator/dashboard'}>
                  {t('dashboard.moderatorPanel', 'Moderator Panel')}
                </button>
              )}
              {user.admin && (
                <button className="db-nav-item db-nav-role db-nav-admin" onClick={() => window.location.href = '/admin/dashboard'}>
                  {t('dashboard.adminPanel', 'Admin Panel')}
                </button>
              )}
            </nav>
          </aside>

          {/* ── Main content ── */}
          <main className="dash-main">
            <div className="dash-main-head">
              <h2>{sectionTitle}</h2>
              <button className="db-btn-primary" onClick={() => window.location.href = '/create-ad'}>
                + {t('dashboard.newListing', 'New listing')}
              </button>
            </div>

            {visibleAds.length === 0 ? (
              <div className="db-empty">
                <div className="db-empty-icon">📦</div>
                <h3>{t('dashboard.noListingsTitle', 'No listings here')}</h3>
                <p>
                  {activeSection === 'drafts'  ? t('dashboard.noDrafts', 'You have no drafts.') :
                   activeSection === 'archive' ? t('dashboard.archiveEmpty', 'Your archive is empty.') :
                   activeSection === 'active'  ? t('dashboard.noActive', 'No active listings yet.') :
                   activeSection === 'favorites' ? t('dashboard.noFavorites', 'No saved listings yet. Click the heart on any ad!') :
                   activeSection === 'booked'    ? t('dashboard.noBooked', 'You have no booked items.') :
                   t('dashboard.createFirst', 'Create your first listing!')}
                </p>
              </div>
            ) : (
              <div className="db-ad-grid">
                {visibleAds.map(ad => (
                  <div key={ad.id} className="db-ad-card" onClick={() => window.open(`/ad/${ad.id}`, '_blank')}>
                    <div className="db-ad-image">
                      <img
                        src={`http://localhost:8080/ad-photo?adId=${ad.id}&photoIndex=0`}
                        alt={ad.title}
                        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                      />
                      <div className="db-ad-image-fallback" style={{ display: 'none' }}>📦</div>
                      <span className={`db-ad-status ${STATUS_CLASS[ad.status] || ''}`}>
                        {STATUS_LABEL[ad.status] || ad.status}
                      </span>
                      {activeSection === 'favorites' && (
                        <button
                          className="db-like-btn liked"
                          onClick={(e) => handleUnfavorite(e, ad.id)}
                          title={t('dashboard.removeFromFavorites', 'Remove from favorites')}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="db-ad-body">
                      <div className="db-ad-price">{formatPrice(ad.price)}</div>
                      <div className="db-ad-title">{ad.title}</div>
                      {ad.location && (
                        <div className="db-ad-location">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          {ad.location}
                        </div>
                      )}
                      <div className="db-ad-meta">
                        <span className="db-ad-views">👁 {ad.viewCount || 0}</span>
                        <span className="db-ad-date">{formatDate(ad.createdAt)}</span>
                      </div>
                      {activeSection !== 'favorites' && activeSection !== 'booked' && (
                       <div className="db-ad-actions" onClick={e => e.stopPropagation()}>
                           {/* НОВАЯ КНОПКА ПОДТВЕРЖДЕНИЯ (видна только если статус BOOKED и ты автор) */}
                           {ad.status === 'BOOKED' && (
                             <button
                               className="db-btn-primary"
                               style={{background: '#28a745', marginRight: '8px', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer'}}
                               onClick={() => handleConfirmSale(ad.id)}
                             >
                               💰 {t('dashboard.confirmSale', 'Подтвердить продажу')}
                             </button>
                           )}

                           {/* Кнопка отмены брони со стороны продавца (если покупатель передумал) */}
                           {ad.status === 'BOOKED' && (
                             <button
                               className="db-btn-ghost"
                               style={{marginRight: '8px', color: '#dc3545'}}
                               onClick={() => handleCancelBooking(ad.id)}
                             >
                               {t('dashboard.cancelBooking', 'Снять бронь')}
                             </button>
                           )}

                           {/* Твои старые кнопки редактирования и удаления */}
                           {ad.status !== 'BOOKED' && (
                             <button className="db-btn-edit" onClick={() => window.location.href = `/edit-ad?adId=${ad.id}`}>
                               {t('dashboard.edit', 'Edit')}
                             </button>
                           )}

                           <button className="db-btn-danger" onClick={() => handleDeleteAd(ad.id)}>
                             {t('dashboard.delete', 'Delete')}
                           </button>
                       </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Account modal */}
      {activeModal === 'account' && (
        <div className="db-modal" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="db-modal-content">
            <button className="db-modal-close" onClick={closeModal}>×</button>
            <h3>{t('dashboard.accountSettings', 'Account Settings')}</h3>
            <div className="db-modal-actions">
              <button className="db-btn-primary" onClick={() => openModal('password')}>{t('dashboard.changePassword', 'Change Password')}</button>
              <button className="db-btn-danger"  onClick={() => openModal('delete')}>{t('dashboard.deleteAccount', 'Delete Account')}</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'password' && (
        <ChangePasswordModal onClose={closeModal} onChangePassword={handlePasswordChanged} />
      )}

      {activeModal === 'delete' && (
        <div className="db-modal" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="db-modal-content">
            <button className="db-modal-close" onClick={closeModal}>×</button>
            <h3>{t('dashboard.deleteAccount', 'Delete Account')}</h3>
            <div className="db-warning-box">
              {t('dashboard.deleteWarning', 'This action is irreversible. All your data and listings will be permanently deleted.')}
            </div>
            <form onSubmit={handleDeleteAccount}>
              <div className="db-form-group">
                <label>{t('dashboard.confirmWithPassword', 'Confirm with your password')}</label>
                <input type="password" required value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
              </div>
              <div className="db-modal-actions">
                <button type="submit"  className="db-btn-danger">{t('dashboard.deleteAccount', 'Delete Account')}</button>
                <button type="button" className="db-btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
