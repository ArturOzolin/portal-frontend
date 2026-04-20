import React, { useCallback, useState, useEffect } from 'react';
import './EditProfile.css';
import YandexLocationPicker from './YandexLocationPicker.jsx';

const API_BASE_URL = 'http://localhost:8080';

const EditProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
   const [message, setMessage] = useState({ text: '', type: '' });
   const [fieldErrors, setFieldErrors] = useState({});
   const [passwordData, setPasswordData] = useState({
     newPassword: '',
     confirmPassword: ''
   });
  const [formData, setFormData] = useState({
    name: '',
    addressFull: '',
    addressCity: '',
    addressStreet: '',
    addressHouseNumber: '',
    addressBuilding: '',
    studyProgram: 'ФПМИ',
    course: '1'
  });

  const studyPrograms = [
    'ФПМИ', 'ВШПИ', 'ФРКТ', 'ЛФИ', 'ФАКТ',
    'ФЭФМ', 'ВШМ', 'КНТ', 'ФБМФ', 'ПИШ ФАЛТ', 'ВШСИ'
  ];

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.status === 401) {
        window.location.href = '/login.jsp';
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const userData = await response.json();
      setUser(userData);

      setFormData({
        name: userData.name || '',
        addressFull: userData.address?.fullAddress || '',
        addressCity: userData.address?.city || '',
        addressStreet: userData.address?.street || '',
        addressHouseNumber: userData.address?.houseNumber || '',
        addressBuilding: userData.address?.building || '',
        studyProgram: userData.studyProgram || 'ФПМИ',
        course: userData.course?.toString() || '1'
      });

    } catch (error) {
       console.error('Ошибка загрузки пользователя:', error);
       setMessage({
         text: 'Ошибка соединения с сервером',
         type: 'error'
       });
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: user.password || '', // Если бэкенд требует текущий пароль
          newPassword: newPassword
        })
      });

      if (response.ok) {
        return { success: true, message: 'Пароль успешно изменен' };
      } else {
        const errorMsg = await response.text();
        return { success: false, message: errorMsg || 'Ошибка смены пароля' };
      }
    } catch (error) {
      console.error('Ошибка смены пароля:', error);
      return { success: false, message: 'Ошибка соединения' };
    }
  };

   const updateProfile = async (profileData) => {
     try {
       const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         credentials: 'include',
         body: JSON.stringify(profileData)
       });

       if (response.ok) {
         const updatedUser = await response.json();
         setUser(updatedUser);
         return { success: true, message: 'Профиль успешно обновлен' };
       } else {
         let errorMsg = 'Ошибка обновления профиля';
         let fieldError = null;
         
         try {
           // Пробуем прочитать как JSON
           const errorData = await response.json();
           if (errorData && errorData.message) {
             errorMsg = errorData.message;
             fieldError = errorData.field;
           } else {
             errorMsg = 'Ошибка при обновлении профиля';
           }
         } catch (parseError) {
           console.warn('Failed to parse error response as JSON:', parseError);
           errorMsg = 'Ошибка при обновлении профиля';
         }
         
         return { success: false, message: errorMsg, field: fieldError };
       }
     } catch (error) {
       console.error('Ошибка обновления профиля:', error);
       return { success: false, message: 'Ошибка соединения' };
     }
   };

   const handleInputChange = (e) => {
     const { name, value } = e.target;
     setFormData(prev => ({ ...prev, [name]: value }));
     
     // Валидация имени в реальном времени
     if (name === 'name') {
       if (!value.trim()) {
         setFieldErrors(prev => ({ ...prev, name: 'Имя не может быть пустым' }));
       } else if (value.includes(' ')) {
         setFieldErrors(prev => ({ ...prev, name: 'Имя должно быть без пробелов!' }));
       } else {
         setFieldErrors(prev => ({ ...prev, name: '' }));
       }
     } else if (fieldErrors[name]) {
       // Очищаем ошибку для других полей при редактировании
       setFieldErrors(prev => ({ ...prev, [name]: '' }));
     }
   };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
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

   const handleSubmit = async (e) => {
     e.preventDefault();
     setFieldErrors({});

     // Валидация имени
     if (!formData.name.trim()) {
       setFieldErrors(prev => ({ ...prev, name: 'Имя не может быть пустым' }));
       setMessage({ text: 'Пожалуйста, заполните все обязательные поля', type: 'error' });
       return;
     }

     // Проверка пароля
     if (passwordData.newPassword) {
       if (passwordData.newPassword !== passwordData.confirmPassword) {
         setFieldErrors(prev => ({ 
           ...prev, 
           confirmPassword: 'Новые пароли не совпадают'
         }));
         setMessage({ text: 'Пароли не совпадают', type: 'error' });
         return;
       }
       if (passwordData.newPassword.length < 8) {
         setFieldErrors(prev => ({ 
           ...prev, 
           newPassword: 'Пароль должен содержать минимум 8 символов'
         }));
         setMessage({ text: 'Пароль слишком короткий', type: 'error' });
         return;
       }
     }

     setMessage({ text: 'Сохранение изменений...', type: 'info' });

     // Сначала меняем пароль, если нужно
     if (passwordData.newPassword) {
       const passwordResult = await changePassword(passwordData.newPassword);

       if (!passwordResult.success) {
         setFieldErrors(prev => ({ ...prev, password: passwordResult.message }));
         setMessage({ text: passwordResult.message, type: 'error' });
         return;
       }

       setMessage({ text: 'Пароль успешно изменен!', type: 'success' });
       setPasswordData({ newPassword: '', confirmPassword: '' });
     }

     // Обновляем данные профиля
     const profileData = {
       name: formData.name.trim(),
       address: {
         fullAddress: formData.addressFull,
         city: formData.addressCity,
         street: formData.addressStreet,
         houseNumber: formData.addressHouseNumber,
         building: formData.addressBuilding
       },
       studyProgram: formData.studyProgram,
       course: parseInt(formData.course)
     };

      const profileResult = await updateProfile(profileData);

      if (profileResult.success) {
        setMessage({ text: 'Профиль успешно обновлен!', type: 'success' });
        setFieldErrors({});
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        // Если есть конкретное поле с ошибкой, показываем её под полем
        if (profileResult.field) {
          setFieldErrors(prev => ({ ...prev, [profileResult.field]: profileResult.message }));
        } else {
          setFieldErrors(prev => ({ ...prev, general: profileResult.message }));
        }
        setMessage({ text: profileResult.message, type: 'error' });
      }
   };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/login.jsp';
    } catch (error) {
      console.error('Ошибка выхода:', error);
      window.location.href = '/login.jsp';
    }
  };

  const checkPasswordsMatch = () => {
    if (passwordData.newPassword && passwordData.confirmPassword &&
        passwordData.newPassword !== passwordData.confirmPassword) {
      return false;
    }
    return true;
  };

  if (loading) {
    return (
        <div className="edit-container">
          <div className="loading">Загрузка...</div>
        </div>
    );
  }

  if (!user) {
    return (
        <div className="edit-container">
          <div className="message error">
            <p><strong>Не удалось загрузить профиль</strong></p>
            <div className="button-group" style={{ marginTop: '20px' }}>
              <button onClick={fetchCurrentUser} className="btn btn-primary">
                Попробовать снова
              </button>
              <a href="/login.jsp" className="btn btn-secondary">
                Перейти на страницу входа
              </a>
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="edit-container">
        <div className="portal-logo">PORTAL</div>
        <div className="page-title">Редактирование профиля</div>

        <div className="current-info">
          <strong>Email:</strong> {user.email}<br />
          <strong>Количество объявлений:</strong> {user.adList?.length || 0}
        </div>

        <form onSubmit={handleSubmit}>
           <div className="form-group">
              <label htmlFor="name">Имя пользователя *</label>
              <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="ivanov"
                  className={fieldErrors.name ? 'error-field' : ''}
                  required
              />
              {fieldErrors.name && (
                  <small style={{ color: '#dc3545', marginTop: '5px', display: 'block' }}>
                    {fieldErrors.name}
                  </small>
              )}
            </div>

          <div className="address-section">
            <h3>📍 Адрес проживания</h3>

            <div className="form-group">
              <label>Адрес</label>
              <div className="location-preview">
                <span className="location-preview-label">Выбранный адрес:</span>
                <span className="location-preview-value">{formData.addressFull || 'пока не выбран'}</span>
              </div>
              <YandexLocationPicker initialAddress={formData.addressFull} onAddressChange={handleAddressSelect} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="studyProgram">Учебная программа *</label>
            <select
                id="studyProgram"
                name="studyProgram"
                value={formData.studyProgram}
                onChange={handleInputChange}
                required
            >
              {studyPrograms.map(program => (
                  <option key={program} value={program}>
                    {program}
                  </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="course">Курс *</label>
            <select
                id="course"
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                required
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>
                    {num} курс
                  </option>
              ))}
            </select>
          </div>

          <div className="password-section">
            <h3>🔐 Смена пароля </h3>
            <div className="form-group">
              <label htmlFor="newPassword">Новый пароль</label>
              <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Оставьте пустым, если не хотите менять"
              />
            </div>
             <div className="form-group">
               <label htmlFor="confirmPassword">Подтверждение нового пароля</label>
               <input
                   type="password"
                   id="confirmPassword"
                   name="confirmPassword"
                   value={passwordData.confirmPassword}
                   onChange={handlePasswordChange}
                   style={{
                     borderColor: !checkPasswordsMatch() && passwordData.confirmPassword ? '#dc3545' :
                         passwordData.newPassword && passwordData.confirmPassword ? '#28a745' : ''
                   }}
               />
               {fieldErrors.confirmPassword && (
                   <small style={{ color: '#dc3545', marginTop: '5px', display: 'block' }}>
                     {fieldErrors.confirmPassword}
                   </small>
               )}
               {!checkPasswordsMatch() && passwordData.confirmPassword && !fieldErrors.confirmPassword && (
                   <small style={{ color: '#dc3545', marginTop: '5px', display: 'block' }}>
                     Пароли не совпадают
                   </small>
               )}
             </div>
           </div>

           {message.text && (
               <div className={`message ${message.type}`} style={{ marginBottom: '20px' }}>
                 {message.text}
               </div>
           )}

             <div className="button-group">
               <button type="submit" className="btn btn-primary">Сохранить изменения</button>
               <a href="/dashboard" className="btn btn-secondary">Отмена</a>
               <button type="button" onClick={handleLogout} className="btn btn-secondary">Выйти</button>
             </div>
          </form>
        </div>
  );
};

export default EditProfile;