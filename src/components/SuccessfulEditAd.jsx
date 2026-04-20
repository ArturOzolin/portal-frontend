import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './SuccessfulEditAd.css';

const STATUS_LABELS = {
  DRAFT: 'Черновик',
  UNDER_MODERATION: 'На модерации',
  ACTIVE: 'Активно'
};

const SuccessfulEditAd = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const announcement = state?.announcement;
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
    <div className="successEditPage">
      <div className="successEditCard">
        <h1>Объявление успешно обновлено</h1>
        <p>Через {secondsLeft} сек. откроется личный кабинет</p>

        {announcement && (
          <div className="successEditInfo">
            <div><strong>ID:</strong> #{announcement.id || '-'}</div>
            <div><strong>Заголовок:</strong> {announcement.title || '-'}</div>
            <div><strong>Статус:</strong> {STATUS_LABELS[announcement.status] || announcement.status || '-'}</div>
          </div>
        )}

        <div className="successEditActions">
          <button onClick={() => navigate('/dashboard')}>В личный кабинет</button>
          {announcement?.id && (
            <button onClick={() => navigate(`/ad/${announcement.id}`)}>Открыть объявление</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessfulEditAd;

