import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { PageProvider } from './context/PageContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import NewCampaignPage from './pages/NewCampaignPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PerformancePage from './pages/PerformancePage';
import ComparePage from './pages/ComparePage';
import AdSpendPage from './pages/AdSpendPage';
import ConnectPage from './pages/ConnectPage';
import SecurityPage from './pages/SecurityPage';
import TeamPage from './pages/TeamPage';
import ProfilePage from './pages/ProfilePage';
import PlannerPage from './pages/PlannerPage';
import InsightsPage from './pages/InsightsPage';
import AICampaignCreatorPage from './pages/AICampaignCreatorPage';
import ROIPage from './pages/ROIPage';
import ABTestingPage from './pages/ABTestingPage';
import InboxPage from './pages/InboxPage';
import SchedulesPage from './pages/SchedulesPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import OAuthSuccessPage from './pages/OAuthSuccessPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdCopyPage from './pages/AdCopyPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import AdCopyPage from './pages/AdCopyPage';
import './index.css';
import { Bolt } from './components/shared/Icons.js';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)', flexDirection:'column', gap:16 }}>
      <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center' }}><Bolt size={24}/></div>
      <div style={{ color:'var(--text-muted)', fontSize:14 }}>Loading AdsPulse...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <PageProvider>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition:true, v7_relativeSplatPath:true }}>
            <Routes>
              <Route path="/login"              element={<LoginPage />} />
              <Route path="/verify-email"       element={<VerifyEmailPage />} />
              <Route path="/reset-password"     element={<ResetPasswordPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/privacy"         element={<PrivacyPage />} />
              <Route path="/terms"           element={<TermsPage />} />
              <Route path="/ad-copy"         element={<ProtectedRoute><AdCopyPage /></ProtectedRoute>} />
              <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
              <Route path="/ad-copy"          element={<AdCopyPage />} />
              <Route path="/accept-invite"      element={<AcceptInvitePage />} />
              <Route path="/oauth-success"       element={<OAuthSuccessPage />} />
              <Route path="/"                   element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/campaigns"          element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
              <Route path="/campaigns/new"      element={<ProtectedRoute><NewCampaignPage /></ProtectedRoute>} />
              <Route path="/campaigns/:id"      element={<ProtectedRoute><CampaignDetailPage /></ProtectedRoute>} />
              <Route path="/campaigns/:id/edit" element={<ProtectedRoute><NewCampaignPage /></ProtectedRoute>} />
              <Route path="/analytics"          element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/performance"        element={<ProtectedRoute><PerformancePage /></ProtectedRoute>} />
              <Route path="/compare"            element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
              <Route path="/ad-spend"           element={<ProtectedRoute><AdSpendPage /></ProtectedRoute>} />
              <Route path="/connect"            element={<ProtectedRoute><ConnectPage /></ProtectedRoute>} />
              <Route path="/security"           element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
              <Route path="/team"               element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
              <Route path="/profile"            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/planner"            element={<ProtectedRoute><PlannerPage /></ProtectedRoute>} />
              <Route path="/insights"           element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
              <Route path="/ai-campaign"         element={<ProtectedRoute><AICampaignCreatorPage /></ProtectedRoute>} />
              <Route path="/roi"               element={<ProtectedRoute><ROIPage /></ProtectedRoute>} />
              <Route path="/ab-testing"         element={<ProtectedRoute><ABTestingPage /></ProtectedRoute>} />
              <Route path="/inbox"             element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
              <Route path="/schedules"          element={<ProtectedRoute><SchedulesPage /></ProtectedRoute>} />
              <Route path="/billing"            element={<Navigate to="/ad-spend" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        </PageProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}