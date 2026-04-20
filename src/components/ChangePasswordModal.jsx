// ChangePasswordModal.jsx
import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';

const ChangePasswordModal = ({ onClose, onChangePassword }) => {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await onChangePassword(currentPassword, newPassword, confirmPassword);

    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
      <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modalContent">
          <span className="close" onClick={onClose}>&times;</span>
          <h3>🔐 {t('dashboard.changePassword', 'Change password')}</h3>

          {error && (
              <div className="errorMessage" style={{ marginBottom: '15px' }}>
                {error}
              </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="formGroup">
              <label>{t('dashboard.currentPassword', 'Current password')}</label>
              <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  placeholder={t('dashboard.currentPasswordPlaceholder', 'Enter current password')}
              />
            </div>

            <div className="formGroup">
              <label>{t('dashboard.newPassword', 'New password')}</label>
              <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  placeholder={t('dashboard.newPasswordPlaceholder', 'At least 8 characters')}
              />
            </div>

            <div className="formGroup">
              <label>{t('dashboard.confirmNewPassword', 'Confirm new password')}</label>
              <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  placeholder={t('dashboard.confirmNewPasswordPlaceholder', 'Repeat new password')}
              />
            </div>

            <div className="buttonGroup">
              <button type="submit" className="btnPrimary" disabled={loading}>
                {loading
                  ? t('dashboard.saving', 'Saving...')
                  : t('dashboard.savePassword', 'Save password')}
              </button>
              <button type="button" onClick={onClose} className="btnSecondary" disabled={loading}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default ChangePasswordModal;
