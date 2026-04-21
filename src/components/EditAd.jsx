import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './EditAd.css';
import ProfanityWarningModal from './ProfanityWarningModal';
import YandexLocationPicker from './YandexLocationPicker.jsx';
import { useI18n } from '../i18n/I18nProvider';
import StyledSelect from './StyledSelect';

const API_BASE = 'http://localhost:8080';

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
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    category: 'OTHER',
    subcategory: '',
    location: '',
    condition: 'USED',
    priceType: 'fixed',
    price: '',
    action: 'draft'
  });

  const categorySelectOptions = [
    { value: '', label: t('createAd.chooseCategory', 'Choose a category') },
    ...categories.map((category) => ({
      value: String(category.id),
      label: category.name
    }))
  ];

  const subcategoryOptions = [
    { value: '', label: t('createAd.chooseSubcategory', 'Choose a subcategory') },
    ...subcategories.map((subcategory) => ({
      value: subcategory.name,
      label: subcategory.name
    }))
  ];

  const conditionOptions = [
    { value: 'USED', label: t('enums.condition.USED') },
    { value: 'NEW', label: t('enums.condition.NEW') },
    { value: 'BROKEN', label: t('home.notWorking') }
  ];

  const priceTypeOptions = [
    { value: 'fixed', label: t('editAd.fixedPrice', 'Fixed price') },
    { value: 'negotiable', label: t('home.negotiable') },
    { value: 'free', label: t('home.free') }
  ];

  const actionOptions = [
    { value: 'draft', label: t('editAd.saveAsDraft', 'Save as draft') },
    { value: 'publish', label: t('editAd.sendToModeration', 'Send to moderation') }
  ];

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
        const [categoriesResponse, adResponse] = await Promise.all([
          fetch(`${API_BASE}/api/announcements/categories`, { credentials: 'include' }),
          fetch(`${API_BASE}/api/announcements/${adId}`, { credentials: 'include' })
        ]);

        const categoriesData = categoriesResponse.ok ? await categoriesResponse.json() : [];
        const safeCategories = Array.isArray(categoriesData) ? categoriesData : [];
        setCategories(safeCategories);
        let ad = null;

        if (adResponse.ok) {
          ad = await adResponse.json();
        } else {
          try {
            const myAdsResponse = await fetch(`${API_BASE}/api/announcements/my`, {
              credentials: 'include'
            });
            const myAds = myAdsResponse.ok ? await myAdsResponse.json() : [];
            ad = Array.isArray(myAds)
              ? myAds.find((item) => String(item.id) === String(adId)) || null
              : null;
          } catch {
            ad = null;
          }
        }

        if (!ad) {
          setMessage({ type: 'error', text: t('editAd.errors.loadFailed', 'Failed to load listing') });
          return;
        }

        let priceType = 'fixed';
        let price = ad.price;
        if (ad.price === -1) {
          priceType = 'negotiable';
          price = '';
        } else if (ad.price === 0) {
          priceType = 'free';
          price = '';
        }

        const selectedCategory = safeCategories.find((category) => category.name === ad.category);
        const categoryId = selectedCategory ? String(selectedCategory.id) : '';

        let nextSubcategories = [];
        if (categoryId) {
          try {
            const subcategoriesResponse = await fetch(`${API_BASE}/api/announcements/categories/${categoryId}/subcategories`, {
              credentials: 'include'
            });
            nextSubcategories = subcategoriesResponse.ok ? await subcategoriesResponse.json() : [];
          } catch {
            nextSubcategories = [];
          }
        }

        setSubcategories(Array.isArray(nextSubcategories) ? nextSubcategories : []);

        setFormData({
          title: ad.title || '',
          description: ad.description || '',
          categoryId,
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

  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === 'categoryId') {
      const selectedCategory = categories.find((category) => String(category.id) === String(value));
      setFormData((prev) => ({
        ...prev,
        categoryId: value,
        category: selectedCategory?.name || '',
        subcategory: ''
      }));
      setSubcategories([]);

      if (!value) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/announcements/categories/${value}/subcategories`, {
          credentials: 'include'
        });
        const nextSubcategories = response.ok ? await response.json() : [];
        setSubcategories(Array.isArray(nextSubcategories) ? nextSubcategories : []);
      } catch {
        setSubcategories([]);
      }
      return;
    }

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

    let finalPrice = formData.price;
    if (formData.priceType === 'free') {
      finalPrice = 0;
    } else if (formData.priceType === 'negotiable') {
      finalPrice = -1;
    }

    const dto = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      subcategory: formData.subcategory,
      location: formData.location,
      condition: formData.condition,
      price: parseInt(finalPrice, 10) || 0
    };

    try {
      const response = await fetch(`${API_BASE}/api/announcements/${adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(dto)
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

      if (formData.action === 'publish' && savedAd?.id) {
        await fetch(`${API_BASE}/api/announcements/${savedAd.id}/send-to-moderation`, {
          method: 'POST',
          credentials: 'include'
        });
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
          <StyledSelect
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            options={categorySelectOptions}
            placeholder={t('createAd.chooseCategory', 'Choose a category')}
          />

          <label>{t('editAd.fields.subcategory', 'Subcategory')}</label>
          <StyledSelect
            name="subcategory"
            value={formData.subcategory}
            onChange={handleChange}
            options={subcategoryOptions}
            placeholder={t('createAd.chooseSubcategory', 'Choose a subcategory')}
            disabled={!formData.categoryId}
          />

          <label>{t('editAd.fields.location', 'Location')}</label>
          <div className="location-preview">
            <span className="location-preview-label">{t('editAd.selectedAddress', 'Selected address:')}</span>
            <span className="location-preview-value">{formData.location || t('editAd.notSelected', 'not selected yet')}</span>
          </div>
          <YandexLocationPicker onAddressChange={handleAddressSelect} />

          <label>{t('editAd.fields.condition', 'Condition')}</label>
          <StyledSelect
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            options={conditionOptions}
            placeholder={t('editAd.fields.condition', 'Condition')}
          />

          <label>{t('editAd.fields.priceType', 'Price type')}</label>
          <StyledSelect
            name="priceType"
            value={formData.priceType}
            onChange={handleChange}
            options={priceTypeOptions}
            placeholder={t('editAd.fields.priceType', 'Price type')}
          />

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
          <StyledSelect
            name="action"
            value={formData.action}
            onChange={handleChange}
            options={actionOptions}
            placeholder={t('editAd.fields.afterSave', 'After save')}
          />

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
