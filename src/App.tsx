import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Divination } from './pages/Divination';
import { DivinationResult } from './pages/DivinationResult';
import { DivinationHistory } from './pages/DivinationHistory';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { Redeem } from './pages/Redeem';
import { Chat } from './pages/Chat';
import { SettingsPage } from './pages/Settings.tsx';
import { NfcPage } from './pages/Nfc.tsx';
import { RecordsPage } from './pages/Records.tsx';
import { AccountPage } from './pages/Account';
import { OAuthPage } from './pages/OAuth';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminRecords } from './pages/admin/Records';
import { AdminCodes } from './pages/admin/Codes';
import { AdminModels } from './pages/admin/Models';
import './i18n';
import { useAuthBootstrap } from './hooks/useAuthBootstrap';

function App() {
  useAuthBootstrap();

  return (
    <BrowserRouter>
      <Routes>
        {/* 前台路由 */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="divination">
            <Route index element={<Divination />} />
            <Route path="result" element={<DivinationResult />} />
            <Route path="history" element={<DivinationHistory />} />
          </Route>
          <Route path="chat" element={<Chat />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="login" element={<Login />} />
          <Route path="oauth" element={<OAuthPage />} />
          <Route path="redeem" element={<Redeem />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="nfc" element={<NfcPage />} />
          <Route path="records" element={<RecordsPage />} />
        </Route>

        {/* 后台管理路由 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="records" element={<AdminRecords />} />
          <Route path="codes" element={<AdminCodes />} />
          <Route path="models" element={<AdminModels />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
