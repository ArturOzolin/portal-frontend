import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './AdDetails.css';
import { useI18n } from '../i18n/I18nProvider';

const API_BASE = 'http://localhost:8080';

const AdDetails = () => {
  const { t, language } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState(null);
  const [details, setDetails] = useState({ authorName: '', photoCount: 0, buyerId: null });
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentFeedback, setCommentFeedback] = useState({ type: '', text: '' });
  const [hasPhoto, setHasPhoto] = useState(false);
  const [liked, setLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('idle');

  const formatPrice = (price) => {
    if (price === -1) return t('home.negotiable');
    if (price === 0) return t('home.free');
    return `${Number(price || 0).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')} ₽`;
  };

  const formatDate = (value) => {
    if (!value) return t('adDetails.notSpecified', 'Not specified');
    return new Date(value).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
  };

  // ✨ ИЗМЕНЕНО: единственная функция загрузки всех данных
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [adResp, detailsResp, commentsResp, meResp] = await Promise.all([
        fetch(`${API_BASE}/api/announcements/${id}`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/announcements/${id}/details`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/announcements/${id}/comments`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/users/me`, { credentials: 'include' })
      ]);

      if (!adResp.ok) {
        if (adResp.status === 404) {
          navigate(`/error?code=404&message=${encodeURIComponent(t('adDetails.notFound', 'Listing not found'))}`);
          return;
        }
        setError(t('adDetails.loadError', 'Failed to load listing'));
        return;
      }

      const adData = await adResp.json();
      const detailsData = detailsResp.ok ? await detailsResp.json() : { authorName: '', photoCount: 0 };
      const commentsData = commentsResp.ok ? await commentsResp.json() : [];

      setAnnouncement(adData);
      setDetails(detailsData);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setHasPhoto(Number(detailsData.photoCount || 0) > 0);

      if (meResp.ok) {
        const meData = await meResp.json();
        setCurrentUserId(meData.id);
      }

      const favRes = await fetch(`${API_BASE}/api/favorites`, { credentials: 'include' });
      if (favRes.ok) {
        const ids = await favRes.json();
        setLiked(ids.includes(Number(id)));
      }
    } catch (e) {
      setError(e.message || t('adDetails.loadError', 'Failed to load listing'));
    } finally {
      setLoading(false);
    }
  };

  // ✨ ИЗМЕНЕНО: единственный useEffect, вызывает loadData + инкремент просмотров
  useEffect(() => {
    loadData();
    // Инкремент просмотров — fire-and-forget
    fetch(`${API_BASE}/api/announcements/${id}/view`, {
      method: 'POST',
      credentials: 'include'
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ✨ ИЗМЕНЕНО: убран buyerId из URL (bakend берёт из сессии)
  const handleBook = async () => {
    if (!currentUserId) { navigate('/login'); return; }
    setBookingStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/v1/bookings/${id}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        setBookingStatus('done');
        alert(t('adDetails.bookedOk', 'Товар забронирован на 24 часа'));
        loadData(); // перезагружаем, чтобы обновить статус
      } else {
        const msg = await res.text();
        setError(msg || t('adDetails.bookError', 'Не удалось забронировать'));
        setBookingStatus('error');
      }
    } catch (e) {
      setError(e.message || t('adDetails.bookError', 'Ошибка бронирования'));
      setBookingStatus('error');
    }
  };

  // ✨ ИЗМЕНЕНО: DELETE + правильный URL (без /cancel)
  const handleCancelBooking = async () => {
    if (!window.confirm(t('adDetails.confirmCancel', 'Отменить бронь?'))) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/bookings/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        alert(t('adDetails.bookingCancelled', 'Бронь отменена'));
        loadData();
      } else {
        const msg = await res.text();
        setError(msg || 'Ошибка отмены');
      }
    } catch (e) {
      setError(e.message || 'Ошибка отмены');
    }
  };

  // ✨ НОВОЕ: подтверждение продажи (для автора)
  const handleConfirmSale = async () => {
    if (!window.confirm(t('adDetails.confirmSale', 'Подтвердить продажу? Объявление уйдёт в архив.'))) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/bookings/${id}/confirm`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        alert(t('adDetails.saleConfirmed', 'Продажа подтверждена!'));
        navigate('/dashboard');
      } else {
        const msg = await res.text();
        setError(msg || 'Ошибка подтверждения');
      }
    } catch (e) {
      setError(e.message || 'Ошибка подтверждения');
    }
  };

  const toggleFavorite = async () => {
    const res = await fetch(`${API_BASE}/api/favorites/${id}`, {
      method: 'POST', credentials: 'include'
    });
    if (res.status === 401) { navigate('/login'); return; }
    if (res.ok) {
      const data = await res.json();
      setLiked(data.liked);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    setCommentFeedback({ type: '', text: '' });
    const text = commentText.trim();
    if (!text) return;

    const response = await fetch(`${API_BASE}/api/announcements/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: text })
    });

    if (response.status === 401) { navigate('/login'); return; }

    if (!response.ok) {
      const message = await response.text();
      setCommentFeedback({ type: 'error', text: message || t('adDetails.commentAddError', 'Failed to add comment') });
      return;
    }

    setCommentText('');
    setCommentFeedback({ type: 'success', text: t('adDetails.commentAdded', 'Comment added') });
    const commentsResp = await fetch(`${API_BASE}/api/announcements/${id}/comments`, { credentials: 'include' });
    if (commentsResp.ok) {
      setComments(await commentsResp.json());
    }
  };

  if (loading) {
    return <div className="adDetailsPage"><div className="adDetailsCard">{t('common.loading')}</div></div>;
  }

  if (!announcement) {
    return <div className="adDetailsPage"><div className="adDetailsCard">{t('adDetails.notFound', 'Listing not found')}</div></div>;
  }

  // ✨ НОВОЕ: вспомогательные флаги для условий отображения кнопок
  const isAuthor = currentUserId && currentUserId === announcement.authorId;
  const isLoggedIn = !!currentUserId;
  const isActive = announcement.status === 'ACTIVE';
  const isBooked = announcement.status === 'BOOKED';

  return (
    <div className="adDetailsPage">
      <div className="adDetailsLayout">
        <div className="adDetailsCard">
          <div className="adTitleRow">
            <h1>{announcement.title}</h1>
            <div className="adTitleActions">

              {/* ✨ ИЗМЕНЕНО: кнопка Забронировать — только для не-автора, активного объявления */}
              {isActive && isLoggedIn && !isAuthor && (
                <button
                  className="adBookBtn"
                  onClick={handleBook}
                  disabled={bookingStatus === 'loading'}
                  title={t('adDetails.bookTitle', 'Забронировать товар')}
                >
                  {bookingStatus === 'loading'
                    ? t('adDetails.booking', 'Бронируем...')
                    : t('adDetails.book', '📦 Забронировать')}
                </button>
              )}

              {/* ✨ НОВОЕ: статус + кнопки при BOOKED */}
              {isBooked && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ background: '#ffc107', padding: '5px 10px', borderRadius: '5px' }}>
                    ⚠️ {t('adDetails.isBooked', 'Забронировано')}
                  </span>

                  {/* Автор видит кнопку "Подтвердить продажу" */}
                  {isAuthor && (
                    <button
                      className="adBookBtn"
                      onClick={handleConfirmSale}
                      style={{ background: '#28a745', color: 'white' }}
                    >
                      💰 {t('adDetails.confirm', 'Подтвердить продажу')}
                    </button>
                  )}

                  {/* Любой авторизованный пользователь (автор или покупатель) может отменить */}
                  {isLoggedIn && (
                    <button
                      className="adBookBtn"
                      onClick={handleCancelBooking}
                      style={{ background: '#dc3545', color: 'white' }}
                    >
                      ❌ {t('adDetails.cancelBooking', 'Отменить бронь')}
                    </button>
                  )}
                </div>
              )}

              <button
                className={`adLikeBtn${liked ? ' liked' : ''}`}
                onClick={toggleFavorite}
                title={liked ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="price">{formatPrice(announcement.price)}</div>

          <div className="metaRow">
            <span>{t('adDetails.category', 'Category')}: {announcement.category}</span>
            <span>{t('adDetails.condition', 'Condition')}: {announcement.condition}</span>
            <span>{t('adDetails.author', 'Author')}: {details.authorName || t('adDetails.unknownUser', 'Unknown user')}</span>
          </div>

          <div className="photoSection">
            {hasPhoto ? (
              <img
                className="mainPhoto"
                src={`${API_BASE}/ad-photo?adId=${announcement.id}&photoIndex=0`}
                alt={t('home.adPhotoAlt')}
                onError={() => setHasPhoto(false)}
              />
            ) : (
              <div className="emptyPhoto">{t('adDetails.noPhotos', 'No photos available')}</div>
            )}
          </div>

          <h3>{t('adDetails.description', 'Description')}</h3>
          <p className="description">{announcement.description || t('adDetails.noDescription', 'Description is missing')}</p>

          <div className="infoGrid">
            <div>{t('adDetails.location', 'Location')}: {announcement.location || t('adDetails.notSpecified', 'Not specified')}</div>
            <div>{t('adDetails.subcategory', 'Subcategory')}: {announcement.subcategory || t('adDetails.notSpecified', 'Not specified')}</div>
            <div>{t('adDetails.views', 'Views')}: {announcement.viewCount || 0}</div>
            <div>{t('adDetails.createdAt', 'Created')}: {formatDate(announcement.createdAt)}</div>
          </div>

          {error && <div className="errorText">{error}</div>}

          <div className="actions">
            <button onClick={() => navigate(-1)} className="secondary">{t('common.back')}</button>
            <button onClick={() => navigate('/dashboard')}>{t('login.goToDashboard')}</button>
          </div>
        </div>

        <div className="commentsCard">
          <h3>{t('adDetails.comments', 'Comments')} ({comments.length})</h3>
          <form onSubmit={addComment}>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t('adDetails.commentPlaceholder', 'Write a comment')}
              required
            />
            {commentFeedback.text && (
              <div className={`commentFeedback ${commentFeedback.type}`}>
                {commentFeedback.text}
              </div>
            )}
            <button type="submit">{t('adDetails.addComment', 'Add')}</button>
          </form>

          <div className="commentsList">
            {comments.length === 0 ? (
              <div className="emptyComments">{t('adDetails.noComments', 'No comments yet')}</div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="commentItem">
                  <div className="commentHeader">
                    <strong>{comment.userName}</strong>
                    <span>{formatDate(comment.createdAt)}</span>
                  </div>
                  <p>{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdDetails;