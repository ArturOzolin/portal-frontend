import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SupportChat.css';
import { useI18n } from '../i18n/I18nProvider';

const API_BASE = 'http://localhost:8080';

const SupportChat = () => {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');

  const formatDate = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US');
  };

  const loadMessages = async () => {
    setLoading(true);
    setFeedback('');
    try {
      const response = await fetch(`${API_BASE}/api/support/messages`, {
        credentials: 'include'
      });

      if (response.status === 401) {
        navigate('/login');
        return;
      }

      if (!response.ok) {
        setFeedback(t('support.loadError', 'Failed to load support messages'));
        return;
      }

      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setFeedback(e.message || t('support.loadError', 'Failed to load support messages'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setFeedback('');
    const response = await fetch(`${API_BASE}/api/support/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message: trimmed })
    });

    if (response.status === 401) {
      navigate('/login');
      return;
    }

    if (!response.ok) {
      const text = await response.text();
      setFeedback(text || t('support.sendError', 'Failed to send message'));
      return;
    }

    setMessage('');
    await loadMessages();
  };

  return (
    <div className="support-wrap supportPage">
      <div className="support-shell">
        <header className="support-topbar">
          <a href="/" className="support-brand">
            <div className="support-brand-mark"></div>
            <span>PORTAL</span>
          </a>
          <button type="button" className="support-btn support-btn-secondary" onClick={() => navigate('/dashboard')}>
            {t('support.backToDashboard', 'Back to dashboard')}
          </button>
        </header>

        <div className="supportCard">
          <div className="supportHeader">
            <h1>{t('support.title', 'Support')}</h1>
            <p>{t('support.subtitle', 'Describe your issue and we will respond in this section.')}</p>
          </div>

          {feedback && <div className="supportFeedback">{feedback}</div>}

          <div className="supportMessages">
            {loading ? (
              <div className="empty">{t('common.loading')}</div>
            ) : messages.length === 0 ? (
              <div className="empty">{t('support.empty', 'No messages yet. Send your first message.')}</div>
            ) : (
              messages.map((item) => (
                <div key={item.id} className="supportMessage">
                  <div className="meta">
                    <strong>{item.userName}</strong>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <p>{item.message}</p>
                </div>
              ))
            )}
          </div>

          <form className="supportForm" onSubmit={sendMessage}>
            <div className="supportInputWrap">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('support.placeholder', 'Describe your issue or question')}
                required
              />
            </div>
            <div className="supportActions">
              <button type="submit" className="support-btn support-btn-primary">{t('support.send', 'Send')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupportChat;
