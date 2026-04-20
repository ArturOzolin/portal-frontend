import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CreateAd from './components/CreateAd';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import EditAd from './components/EditAd';
import AdDetails from './components/AdDetails';
import ErrorPage from './components/ErrorPage';
import SupportChat from './components/SupportChat';
import SuccessfulCreateAd from './components/SuccessfulCreateAd';
import SuccessfulEditAd from './components/SuccessfulEditAd';
import AdminDashboard from './components/admin/AdminDashboard';
import ModeratorDashboard from './components/moderator/ModeratorDashboard';
import ModerationHistory from './components/moderator/ModerationHistory';
import EditProfile from './components/EditProfile';
import { useI18n } from './i18n/I18nProvider';

function App() {
  const { t } = useI18n();

  return (
    <Router>
      <Routes>
        {/* Когда адрес в браузере просто /, показываем главную */}
        <Route path="/" element={<Home />} />

        {/* Когда адрес /create-ad (или старый /create), показываем создание */}
        <Route path="/create-ad" element={<CreateAd />} />
        <Route path="/create" element={<CreateAd />} />

        {/* Когда адрес /register, показываем регистрацию */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/edit-ad" element={<EditAd />} />
        <Route path="/successful-create-ad" element={<SuccessfulCreateAd />} />
        <Route path="/successful-edit-ad" element={<SuccessfulEditAd />} />
        <Route path="/ad/:id" element={<AdDetails />} />
        <Route path="/support" element={<SupportChat />} />
        <Route path="/error" element={<ErrorPage />} />
        <Route path="*" element={<ErrorPage defaultCode="404" defaultMessage={t('common.notFound')} />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/moderator" element={<ModeratorDashboard />} />
        <Route path="/moderator/dashboard" element={<ModeratorDashboard />} />
        <Route path="/moderator/history" element={<ModerationHistory />} />
        <Route path="/edit-profile" element={<EditProfile />} />
      </Routes>
    </Router>
  );
}

export default App;