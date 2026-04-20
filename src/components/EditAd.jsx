import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './EditAd.css';
import ProfanityWarningModal from './ProfanityWarningModal';
import YandexLocationPicker from './YandexLocationPicker.jsx';
import { useI18n } from '../i18n/I18nProvider';

const API_BASE = 'http://localhost:8080';

const categoryOptions = [
  { value: 'ELECTRONICS', label: 'Электроника' },
  { value: 'CLOTHING', label: 'Одежда и обувь' },
  { value: 'HOME', label: 'Дом и сад' },
  { value: 'BEAUTY', label: 'Красота и здоровье' },
  { value: 'SPORTS', label: 'Спорт и отдых' },
  { value: 'CHILDREN', label: 'Детские товары' },
  { value: 'AUTO', label: 'Автотовары' },
  { value: 'BOOKS', label: 'Книги и канцелярия' },
  { value: 'HOBBY', label: 'Хобби и творчество' },
  { value: 'PETS', label: 'Животные' },
  { value: 'TUTORING', label: 'Репетиторство' },
  { value: 'EDUCATION_SERVICES', label: 'Образовательные услуги' },
  { value: 'HOUSEHOLD_SERVICES', label: 'Бытовые услуги' },
  { value: 'REPAIR', label: 'Ремонт и строительство' },
  { value: 'BEAUTY_SERVICES', label: 'Красота и уход' },
  { value: 'TRANSPORT_SERVICES', label: 'Транспортные услуги' },
  { value: 'IT_SERVICES', label: 'IT и компьютерные услуги' },
  { value: 'EVENTS', label: 'Мероприятия и развлечения' },
  { value: 'MEDICAL', label: 'Медицинские услуги' },
  { value: 'LEGAL', label: 'Юридические услуги' },
  { value: 'OTHER', label: 'Другое' }
];

const EditAd = () => {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const adId = useMemo(() => params.get('adId') || params.get('id'), [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showProfanityWarning, setShowProfanityWarning] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER',
    subcategory: '',
    location: '',
    condition: 'USED',
    priceType: 'fixed',
    price: '',
    action: 'draft'
  });

  const hasProfanity = async (text) => {
    const response = await fetch(`${API_BASE}/api/profanity/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return Boolean(data.hasProfanity);
  };

  useEffect(() => {
    if (!adId) {
      setMessage({ type: 'error', text: t('editAd.errors.missingId', 'Ad id is missing') });
      setLoading(false);
      return;
    }

    const loadAd = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/announcements/${adId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          setMessage({ type: 'error', text: t('editAd.errors.loadFailed', 'Failed to load listing') });
          return;
        }

        const ad = await response.json();
        let priceType = 'fixed';
        let price = ad.price;
        if (ad.price === -1) {
          priceType = 'negotiable';
          price = '';
        } else if (ad.price === 0) {
          priceType = 'free';
          price = '';
        }

        setFormData({
          title: ad.title || '',
          description: ad.description || '',
          category: ad.category || 'OTHER',
          subcategory: ad.subcategory || '',
          location: ad.location || '',
          condition: ad.condition || 'USED',
          priceType,
          price,
          action: 'draft'
        });
      } catch (e) {
        setMessage({ type: 'error', text: e.message || t('editAd.errors.loadFailed', 'Failed to load listing') });
      } finally {
        setLoading(false);
      }
    };

    loadAd();
  }, [adId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressSelect = useCallback((address) => {
    setFormData((prev) => ({ ...prev, location: address }));
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    const textToCheck = `${formData.title} ${formData.description}`.trim();
    if (textToCheck && await hasProfanity(textToCheck)) {
      setShowProfanityWarning(true);
      setSaving(false);
      return;
    }

    let finalPrice = Number(formData.price || 0);
    if (formData.priceType === 'free') {
      finalPrice = 0;
    } else if (formData.priceType === 'negotiable') {
      finalPrice = -1;
    }

    try {
      const response = await fetch(`${API_BASE}/api/announcements/${adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          subcategory: formData.subcategory,
          location: formData.location,
          condition: formData.condition,
          price: finalPrice,
          action: formData.action
        })
      });

      if (!response.ok) {
        const text = await response.text();
        setMessage({ type: 'error', text: text || t('editAd.errors.saveFailed', 'Error while saving') });
        return;
      }

      const savedAd = await response.json();

      if (photo && savedAd?.id) {
        const fd = new FormData();
        fd.append('photo', photo);
        const uploadResponse = await fetch(`${API_BASE}/api/announcements/${savedAd.id}/photo`, {
          method: 'POST',
          body: fd,
          credentials: 'include'
        });
        if (!uploadResponse.ok) {
          setMessage({ type: 'error', text: t('editAd.errors.photoUpdateFailed', 'Listing saved, but photo update failed') });
          return;
        }
      }

      navigate('/successful-edit-ad', {
        state: {
          announcement: savedAd,
          action: formData.action
        }
      });
    } catch (e) {
      setMessage({ type: 'error', text: e.message || t('editAd.errors.saveFailed', 'Error while saving') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="editAdPage"><div className="editAdCard">{t('common.loading')}</div></div>;
  }

  return (
    <div className="editAdPage">
      <ProfanityWarningModal open={showProfanityWarning} onClose={() => setShowProfanityWarning(false)} />
      <div className="editAdCard">
        <h1>{t('editAd.title', 'Edit listing')}</h1>

        {message.text && (
          <div className={`editAdAlert ${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>{t('editAd.fields.title', 'Title')}</label>
          <input name="title" value={formData.title} onChange={handleChange} required />

          <label>{t('editAd.fields.description', 'Description')}</label>
          <textarea name="description" value={formData.description} onChange={handleChange} required />

          <label>{t('editAd.fields.category', 'Category')}</label>
          <select name="category" value={formData.category} onChange={handleChange} required>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <label>{t('editAd.fields.subcategory', 'Subcategory')}</label>
          <input name="subcategory" value={formData.subcategory} onChange={handleChange} required />

          <label>{t('editAd.fields.location', 'Location')}</label>
          <div className="location-preview">
            <span className="location-preview-label">{t('editAd.selectedAddress', 'Selected address:')}</span>
            <span className="location-preview-value">{formData.location || t('editAd.notSelected', 'not selected yet')}</span>
          </div>
          <YandexLocationPicker onAddressChange={handleAddressSelect} />

          <label>{t('editAd.fields.condition', 'Condition')}</label>
          <select name="condition" value={formData.condition} onChange={handleChange}>
            <option value="USED">{t('enums.condition.USED')}</option>
            <option value="NEW">{t('enums.condition.NEW')}</option>
            <option value="BROKEN">{t('home.notWorking')}</option>
          </select>

          <label>{t('editAd.fields.priceType', 'Price type')}</label>
          <select name="priceType" value={formData.priceType} onChange={handleChange}>
            <option value="fixed">{t('editAd.fixedPrice', 'Fixed price')}</option>
            <option value="negotiable">{t('home.negotiable')}</option>
            <option value="free">{t('home.free')}</option>
          </select>

          {formData.priceType === 'fixed' && (
            <>
              <label>{t('editAd.fields.price', 'Price')}</label>
              <input
                type="number"
                name="price"
                min="1"
                max="1000000000"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </>
          )}

          <label>{t('editAd.fields.photoOptional', 'Photo (optional)')}</label>
          <div className="file-upload-row">
            <input
              id="edit-ad-photo-input"
              type="file"
              accept="image/*"
              className="file-input-hidden"
              onChange={handlePhotoChange}
            />
            <label htmlFor="edit-ad-photo-input" className="file-trigger-btn">{t('editAd.chooseFile', 'Choose file')}</label>
            <span className="file-name">{photo ? photo.name : t('editAd.noFile', 'No file chosen')}</span>
          </div>
          {photoPreview && (
            <div className="edit-photo-preview">
              <img src={photoPreview} alt="preview" />
            </div>
          )}

          <label>{t('editAd.fields.afterSave', 'After save')}</label>
          <select name="action" value={formData.action} onChange={handleChange}>
            <option value="draft">{t('editAd.saveAsDraft', 'Save as draft')}</option>
            <option value="publish">{t('editAd.sendToModeration', 'Send to moderation')}</option>
          </select>

          <div className="editAdActions">
            <button type="button" className="secondary" onClick={() => navigate('/dashboard')}>{t('common.cancel')}</button>
            <button type="submit" disabled={saving}>{saving ? t('dashboard.saving') : t('common.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAd;
