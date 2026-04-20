import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SuccessfulCreateAd.css';

const STATUS_LABELS = {
  DRAFT: 'Черновик',
  UNDER_MODERATION: 'На модерации',
  ACTIVE: 'Активно'
};

const formatPrice = (price) => {
  if (price === -1) return 'Договорная';
  if (price === 0) return 'Бесплатно';
  return `${Number(price || 0).toLocaleString('ru-RU')} руб.`;
};

const SuccessfulCreateAd = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const announcement = state?.announcement;
  const warning = state?.warning;
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div className="successPage">
      <div className="successCard">
        <h1>Объявление успешно создано</h1>
        <p>Через {secondsLeft} сек. откроется личный кабинет</p>
        {warning && <p style={{ color: '#b45309' }}>⚠️ {warning}</p>}

        {announcement && (
          <div className="successInfo">
            <div><strong>ID:</strong> #{announcement.id || '-'}</div>
            <div><strong>Заголовок:</strong> {announcement.title || '-'}</div>
            <div><strong>Категория:</strong> {announcement.category || '-'}</div>
            <div><strong>Цена:</strong> {formatPrice(announcement.price)}</div>
            <div><strong>Статус:</strong> {STATUS_LABELS[announcement.status] || announcement.status || '-'}</div>
          </div>
        )}

        <div className="successActions">
          <button onClick={() => navigate('/create-ad')}>Создать еще одно</button>
          <button onClick={() => navigate('/dashboard')}>В личный кабинет</button>
        </div>
      </div>
    </div>
  );
};

export default SuccessfulCreateAd;

