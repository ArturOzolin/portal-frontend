import React, { useCallback, useState } from 'react';
import './Register.css';
import YandexLocationPicker from './YandexLocationPicker.jsx';
import { useI18n } from '../i18n/I18nProvider';

const Register = () => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    passwordAgain: '',
    studyProgram: 'Не указывать',
    course: 0,
    addressFull: '',
    addressCity: '',
    addressStreet: '',
    addressHouseNumber: '',
    addressBuilding: ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const value = e.target.name === 'course' ? parseInt(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    
    // Валидация имени в реальном времени
    if (e.target.name === 'name') {
      if (!value.trim()) {
        setFieldErrors(prev => ({ ...prev, name: t('register.errors.emptyName', 'Name cannot be empty') }));
      } else if (value.includes(' ')) {
        setFieldErrors(prev => ({ ...prev, name: t('register.errors.nameNoSpaces', 'Name must not contain spaces') }));
      } else {
        setFieldErrors(prev => ({ ...prev, name: '' }));
      }
    } else if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.passwordAgain) {
      setMessage({ type: 'error', text: t('register.errors.passwordMismatch', 'Passwords do not match') });
      return;
    }

    // Отправляем в том же формате, что и JSP
    const requestData = {
      email: formData.email,
      name: formData.name,
      password: formData.password,
      passwordAgain: formData.passwordAgain,
      studyProgram: formData.studyProgram,
      course: formData.course,
      addressFull: formData.addressFull,
      addressCity: formData.addressCity,
      addressStreet: formData.addressStreet,
      addressHouseNumber: formData.addressHouseNumber,
      addressBuilding: formData.addressBuilding
    };

    console.log('Sending data:', requestData);

    try {
      const response = await fetch('http://localhost:8080/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t('register.success', 'Registration successful! Redirecting to sign in page.') });
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        setMessage({ type: 'error', text: errorData || t('register.errors.submit', 'Registration failed. Please check your data.') });
      }
    } catch (error) {
      console.error('Network error:', error);
      setMessage({ type: 'error', text: t('register.errors.network', 'Network error. Server unavailable.') });
    }
  };

  const handleAddressSelect = useCallback((address) => {
    setFormData((prev) => ({
      ...prev,
      addressFull: address,
      addressCity: '',
      addressStreet: '',
      addressHouseNumber: '',
      addressBuilding: ''
    }));
  }, []);

  return (
      <div className="portal-container loginContainer">
        <div className="portal-logo">PORTAL</div>
        <div className="portal-subtitle">{t('register.title', 'Register')}</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" placeholder="ivanov.ii@phystech.edu" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>{t('register.username', 'Username')} *</label>
            <input 
              type="text" 
              name="name" 
              placeholder="ivanov" 
              value={formData.name}
              onChange={handleChange}
              className={fieldErrors.name ? 'error-field' : ''}
              required 
            />
            {fieldErrors.name && (
                <small style={{ color: '#dc3545', marginTop: '5px', display: 'block' }}>
                  {fieldErrors.name}
                </small>
            )}
          </div>

          <div className="form-group">
            <label>{t('register.password', 'Password')} *</label>
            <div className="password-info">
              {t('register.passwordHint', 'Password must contain at least 8 characters.')}
            </div>
            <input type="password" name="password" required onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>{t('register.confirmPassword', 'Confirm password')} *</label>
            <input type="password" name="passwordAgain" required onChange={handleChange}
                   style={{ borderColor: formData.passwordAgain && formData.password !== formData.passwordAgain ? '#dc3545' : '' }} />
          </div>

          <div className="address-section">
            <h3>{t('register.addressSection', 'Home address')}</h3>

            <div className="form-group">
              <label>{t('register.address', 'Address')}</label>
              <div className="location-preview">
                <span className="location-preview-label">{t('register.selectedAddress', 'Selected address:')}</span>
                <span className="location-preview-value">{formData.addressFull || t('register.notSelected', 'not selected yet')}</span>
              </div>
              <YandexLocationPicker onAddressChange={handleAddressSelect} />
            </div>
          </div>

          <div className="form-group">
            <label>{t('register.studyProgram', 'Study program')} *</label>
            <select name="studyProgram" required onChange={handleChange}>
              <option value="Не указывать">{t('register.notSpecify', 'Do not specify')}</option>
              <option value="ФПМИ">ФПМИ</option>
              <option value="ВШПИ">ВШПИ</option>
              <option value="ФРКТ">ФРКТ</option>
              <option value="ЛФИ">ЛФИ</option>
              <option value="ФАКТ">ФАКТ</option>
              <option value="ФЭФМ">ФЭФМ</option>
              <option value="ВШМ">ВШМ</option>
              <option value="КНТ">КНТ</option>
              <option value="ФБМФ">ФБМФ</option>
              <option value="ПИШ ФАЛТ">ПИШ ФАЛТ</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('register.course', 'Course')} *</label>
            <select name="course" required onChange={handleChange}>
              <option value="0">{t('register.notSpecify', 'Do not specify')}</option>
              <option value="1">{t('register.courseN', 'Year {{n}}').replace('{{n}}', '1')}</option>
              <option value="2">{t('register.courseN', 'Year {{n}}').replace('{{n}}', '2')}</option>
              <option value="3">{t('register.courseN', 'Year {{n}}').replace('{{n}}', '3')}</option>
              <option value="4">{t('register.courseN', 'Year {{n}}').replace('{{n}}', '4')}</option>
              <option value="5">{t('register.courseN', 'Year {{n}}').replace('{{n}}', '5')}</option>
              <option value="6">{t('register.courseN', 'Year {{n}}').replace('{{n}}', '6')}</option>
            </select>
           </div>

          {message.text && (
              <div className={`message ${message.type}`} style={{ marginBottom: '20px' }}>
                {message.text}
              </div>
          )}

           <div className="button-group">
             <button type="submit" className="btn btn-primary">{t('register.submit', 'Register')}</button>
             <a href="/login" className="btn btn-secondary">{t('common.signIn')}</a>
           </div>
         </form>
       </div>
  );
};

export default Register;
