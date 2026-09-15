import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { useCleanUrls } from './lib/urls';
import { DemoPage, WeddingPage } from './platform/WeddingPage';
import {
  HomePage,
  LoginPage,
  NotFoundPage,
  PlatformLayout,
  ProtectedRoute,
} from './platform/PlatformPages';
import { AdminPage, DashboardHome } from './platform/Dashboard';
import { WeddingEditorPage } from './platform/WeddingEditor';
import { RsvpPage, WishesPage } from './platform/Responses';
import './platform/platform.css';

export default function PlatformRouter() {
  const Router = useCleanUrls ? BrowserRouter : HashRouter;
  return (
    <Router
      {...(useCleanUrls ? { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' } : {})}
    >
      <AuthProvider>
        <Routes>
          <Route path="/wedding/:slug" element={<WeddingPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route element={<PlatformLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardHome />} />
              <Route path="/dashboard/weddings/:weddingId/edit" element={<WeddingEditorPage />} />
              <Route path="/dashboard/weddings/:weddingId/rsvp" element={<RsvpPage />} />
              <Route path="/dashboard/weddings/:weddingId/wishes" element={<WishesPage />} />
            </Route>
            <Route element={<ProtectedRoute admin />}>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/weddings/new" element={<WeddingEditorPage />} />
              <Route path="/admin/weddings/:weddingId/edit" element={<WeddingEditorPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}
