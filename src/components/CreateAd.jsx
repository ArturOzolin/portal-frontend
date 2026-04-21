import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateAd.css';
import ProfanityWarningModal from './ProfanityWarningModal';
import YandexLocationPicker from './YandexLocationPicker.jsx';
import { useI18n } from '../i18n/I18nProvider';
import StyledSelect from './StyledSelect';

const API_BASE = 'http://localhost:8080';

const STEPS = [
    { n: 1, label: 'Basic info' },
    { n: 2, label: 'Category & location' },
    { n: 3, label: 'Price & photo' },
];

const CreateAd = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        categoryId: '',
        category: '',
        subcategory: '',
        location: '',
        condition: 'USED',
        priceType: 'fixed',
        price: '',
        action: 'draft',
    });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showProfanityWarning, setShowProfanityWarning] = useState(false);
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    const categoryOptions = [
        { value: '', label: t('createAd.chooseCategory', 'Choose a category') },
        ...categories.map((category) => ({ value: String(category.id), label: category.name }))
    ];

    const subcategoryOptions = [
        { value: '', label: t('createAd.chooseSubcategory', 'Choose a subcategory') },
        ...subcategories.map((subcategory) => ({ value: subcategory.name, label: subcategory.name }))
    ];

    useEffect(() => {
        fetch(`${API_BASE}/api/announcements/categories`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : [])
            .then(data => setCategories(Array.isArray(data) ? data : []))
            .catch(() => {});
        fetch(`${API_BASE}/api/users/me`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(u => { if (u?.id) setCurrentUserId(u.id); })
            .catch(() => {});
    }, []);

    const hasProfanity = async (text) => {
        try {
            const r = await fetch(`${API_BASE}/api/profanity/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ text })
            });
            if (!r.ok) return false;
            return Boolean((await r.json()).hasProfanity);
        } catch { return false; }
    };

    const handleChange = async (e) => {
        const { name, value } = e.target;
        setMessage({ type: '', text: '' });

        if (name === 'categoryId') {
            const sel = categories.find(c => String(c.id) === String(value));
            setFormData(prev => ({ ...prev, categoryId: value, category: sel?.name || '', subcategory: '' }));
            setSubcategories([]);
            if (!value) return;
            try {
                const r = await fetch(`${API_BASE}/api/announcements/categories/${value}/subcategories`, { credentials: 'include' });
                setSubcategories(r.ok ? (await r.json()) : []);
            } catch {}
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0] ?? null;
        setPhoto(file);
        setPhotoPreview(file ? URL.createObjectURL(file) : null);
    };

    const handleAddressSelect = useCallback((address) => {
        setFormData(prev => ({ ...prev, location: address }));
    }, []);

    const validate = (s) => {
        if (s === 1) {
            if (!formData.title.trim())       { setMessage({ type: 'error', text: t('createAd.errors.enterTitle', 'Please enter a title.') }); return false; }
            if (!formData.description.trim()) { setMessage({ type: 'error', text: t('createAd.errors.enterDescription', 'Please enter a description.') }); return false; }
            return true;
        }
        if (s === 2) {
            if (!formData.categoryId)   { setMessage({ type: 'error', text: t('createAd.errors.chooseCategory', 'Please choose a category.') }); return false; }
            if (!formData.subcategory)  { setMessage({ type: 'error', text: t('createAd.errors.chooseSubcategory', 'Please choose a subcategory.') }); return false; }
            if (!formData.location)     { setMessage({ type: 'error', text: t('createAd.errors.chooseLocation', 'Please pick a location on the map.') }); return false; }
            return true;
        }
        return true;
    };

    const goNext = async () => {
        if (!validate(step)) return;
        if (step === 1) {
            const txt = `${formData.title} ${formData.description}`.trim();
            if (txt && await hasProfanity(txt)) { setShowProfanityWarning(true); return; }
        }
        setMessage({ type: '', text: '' });
        setStep(s => s + 1);
    };

    const goBack = () => { setMessage({ type: '', text: '' }); setStep(s => s - 1); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate(3)) return;
        setSubmitting(true);

        let finalPrice = formData.price;
        if (formData.priceType === 'free')       finalPrice = 0;
        if (formData.priceType === 'negotiable') finalPrice = -1;

        const dto = {
            title:       formData.title,
            description: formData.description,
            category:    formData.category,
            subcategory: formData.subcategory,
            location:    formData.location,
            condition:   formData.condition,
            price:       parseInt(finalPrice) || 0,
            authorId:    currentUserId,
        };

        try {
            const r = await fetch(`${API_BASE}/api/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(dto)
            });

            if (!r.ok) { setMessage({ type: 'error', text: t('createAd.errors.createFailed', 'Error creating ad.') }); setSubmitting(false); return; }

            const created = await r.json();

            if (photo && created?.id) {
                const fd = new FormData();
                fd.append('photo', photo);
                const pr = await fetch(`${API_BASE}/api/announcements/${created.id}/photo`, {
                    method: 'POST', body: fd, credentials: 'include'
                });
                if (!pr.ok) console.warn('Photo could not be saved.');
            }

            if (formData.action === 'publish' && created?.id) {
                await fetch(`${API_BASE}/api/announcements/${created.id}/send-to-moderation`, {
                    method: 'POST', credentials: 'include'
                });
            }

            navigate(`/ad/${created.id}`);
        } catch {
            setMessage({ type: 'error', text: t('createAd.errors.network', 'Network error. Server unavailable.') });
            setSubmitting(false);
        }
    };

    return (
        <div className="ca-wrap">
            <ProfanityWarningModal open={showProfanityWarning} onClose={() => setShowProfanityWarning(false)} />

            <div className="ca-shell">
                {/* Header */}
                <div className="ca-header">
                    <a href="/" className="ca-brand">
                        <div className="ca-brand-mark"></div>
                        <span>PORTAL</span>
                    </a>
                </div>

                <div className="ca-card">
                    <h1 className="ca-title">{t('createAd.title', 'New listing')}</h1>

                    {/* Step indicator */}
                    <div className="ca-stepper">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.n}>
                                <div className={`ca-step${step === s.n ? ' active' : ''}${step > s.n ? ' done' : ''}`}>
                                    <div className="ca-step-dot">
                                        {step > s.n ? '✓' : s.n}
                                    </div>
                                    <div className="ca-step-label">{s.label}</div>
                                </div>
                                {i < STEPS.length - 1 && <div className={`ca-step-line${step > s.n ? ' done' : ''}`}></div>}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Alert */}
                    {message.text && (
                        <div className={`ca-alert ca-alert-${message.type}`}>{message.text}</div>
                    )}

                    {/* ── Step 1: Basic info ── */}
                    {step === 1 && (
                        <div className="ca-step-body">
                            <div className="form-group">
                                <label className="required">{t('createAd.fields.title', 'Title')}</label>
                                <input
                                    type="text"
                                    name="title"
                                    className="form-control"
                                    value={formData.title}
                                    placeholder={t('createAd.placeholders.title', 'What are you selling?')}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="required">{t('createAd.fields.description', 'Description')}</label>
                                <textarea
                                    name="description"
                                    className="form-control"
                                    value={formData.description}
                                    placeholder={t('createAd.placeholders.description', 'Describe the item: condition, features, reason for selling…')}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Category & Location ── */}
                    {step === 2 && (
                        <div className="ca-step-body">
                            <div className="form-group">
                                <label className="required">{t('createAd.fields.category', 'Category')}</label>
                                <StyledSelect
                                    name="categoryId"
                                    value={formData.categoryId}
                                    onChange={handleChange}
                                    options={categoryOptions}
                                    placeholder={t('createAd.chooseCategory', 'Choose a category')}
                                />
                            </div>
                            <div className="form-group">
                                <label className="required">{t('createAd.fields.subcategory', 'Subcategory')}</label>
                                <StyledSelect
                                    name="subcategory"
                                    value={formData.subcategory}
                                    onChange={handleChange}
                                    options={subcategoryOptions}
                                    placeholder={t('createAd.chooseSubcategory', 'Choose a subcategory')}
                                    disabled={!formData.categoryId}
                                />
                            </div>
                            <div className="form-group">
                                <label className="required">{t('createAd.fields.location', 'Location')}</label>
                                {formData.location && (
                                    <div className="ca-location-badge">📍 {formData.location}</div>
                                )}
                                <YandexLocationPicker onAddressChange={handleAddressSelect} />
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Price, condition & photo ── */}
                    {step === 3 && (
                        <div className="ca-step-body">
                            <div className="form-group">
                                <label className="required">{t('createAd.fields.condition', 'Condition')}</label>
                                <div className="radio-group">
                                    {[[ 'NEW', t('enums.condition.NEW') ], [ 'USED', t('enums.condition.USED') ], [ 'BROKEN', t('home.notWorking') ]].map(([val, lbl]) => (
                                        <label key={val} className={`radio-item${formData.condition === val ? ' selected' : ''}`}>
                                            <input type="radio" name="condition" value={val} checked={formData.condition === val} onChange={handleChange} />
                                            <span>{lbl}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="required">{t('createAd.fields.priceType', 'Price type')}</label>
                                <div className="radio-group">
                                    {[[ 'fixed', t('createAd.fixedPrice', 'Fixed price') ], [ 'negotiable', t('home.negotiable') ], [ 'free', t('home.free') ]].map(([val, lbl]) => (
                                        <label key={val} className={`radio-item${formData.priceType === val ? ' selected' : ''}`}>
                                            <input type="radio" name="priceType" value={val} checked={formData.priceType === val} onChange={handleChange} />
                                            <span>{lbl}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {formData.priceType === 'fixed' && (
                                <div className="form-group">
                                    <label>{t('createAd.fields.price', 'Price (₽)')}</label>
                                    <input type="number" name="price" className="form-control" value={formData.price} onChange={handleChange} required />
                                </div>
                            )}

                            <div className="form-group">
                                <label>{t('createAd.fields.photoOptional', 'Photo (optional)')}</label>
                                <div className="file-upload-row">
                                    <input
                                        id="create-ad-photo-input"
                                        type="file"
                                        accept="image/*"
                                        className="file-input-hidden"
                                        onChange={handlePhotoChange}
                                    />
                                    <label htmlFor="create-ad-photo-input" className="file-trigger-btn">{t('createAd.chooseFile', 'Choose file')}</label>
                                    <span className="file-name">{photo ? photo.name : t('createAd.noFile', 'No file chosen')}</span>
                                </div>
                                {photoPreview && (
                                    <div className="ca-photo-preview">
                                        <img src={photoPreview} alt="preview" />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="required">{t('createAd.fields.afterCreate', 'After creating')}</label>
                                <div className="radio-group">
                                    {[[ 'draft', t('createAd.saveAsDraft', 'Save as draft') ], [ 'publish', t('createAd.sendToModeration', 'Send to moderation') ]].map(([val, lbl]) => (
                                        <label key={val} className={`radio-item${formData.action === val ? ' selected' : ''}`}>
                                            <input type="radio" name="action" value={val} checked={formData.action === val} onChange={handleChange} />
                                            <span>{lbl}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="ca-nav-btns">
                        {step === 1
                            ? <a href="/" className="btn btn-outline">{t('common.cancel')}</a>
                            : <button type="button" className="btn btn-outline" onClick={goBack}>← {t('common.back')}</button>
                        }
                        {step < 3
                            ? <button type="button" className="btn btn-primary" onClick={goNext}>{t('createAd.next', 'Next')} →</button>
                            : (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? t('createAd.creating', 'Creating…') : `✓ ${t('createAd.createListing', 'Create listing')}`}
                                </button>
                            )
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateAd;
