import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BuilderProvider, useBuilder } from './context/BuilderContext';
import { DialogProvider } from './context/DialogContext';
import Builder from './components/Builder/Builder';
import HeaderActions from './components/Builder/HeaderActions';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import Logo from './components/Logo';

// Lazy load heavy components
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicInvoice = lazy(() => import('./pages/PublicInvoice'));

const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white">
    <Logo variant="full" className="h-16 w-auto object-contain animate-pulse" />
    <div className="flex items-center gap-2 text-gray-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      <span className="text-sm font-medium">Cargando...</span>
    </div>
  </div>
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

// Routes that only make sense when logged OUT (login/register). If a session is
// already active, send the user straight to the dashboard.
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function DocumentNameField() {
  const { t } = useTranslation();
  const { data, setData } = useBuilder();
  const fallbackName = `${data.documentTitle || t('invoice.defaultTitle')} ${data.invoiceNumber || t('invoice.draft')}`;

  return (
    <label className="hidden md:flex min-w-0 flex-1 max-w-md items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 shadow-sm">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-blue-700">{t('form.invoiceName')}</span>
      <input
        type="text"
        value={data.invoiceName || ''}
        onChange={(event) => setData((current) => ({ ...current, invoiceName: event.target.value }))}
        placeholder={fallbackName}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 placeholder:text-blue-300 focus:outline-none"
      />
    </label>
  );
}

function BuilderLayout() {
  return (
    <BuilderProvider>
      <div className="min-h-screen bg-[#f5f5f4] text-gray-900 font-sans selection:bg-blue-200 flex flex-col">
        {/* Top Navigation - Hidden when printing */}
        <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-20 print:hidden flex-shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex shrink-0 items-center gap-3">
              <Link
                to="/dashboard"
                title="Volver al panel"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </Link>
              <Link to="/dashboard" className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <Logo variant="iso" className="h-8 w-8 object-contain" />
                <span className="hidden font-semibold tracking-tight text-gray-900 sm:inline">InvoiceGen Pro</span>
              </Link>
            </div>
            
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <DocumentNameField />
              <div className="hidden lg:block">
                <LanguageSwitcher />
              </div>
              <HeaderActions />
            </div>
          </div>
        </header>

        {/* Main Builder Area */}
        <main className="flex-1 overflow-hidden print:overflow-visible">
          <Builder />
        </main>
      </div>
    </BuilderProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/builder" element={<PrivateRoute><BuilderLayout /></PrivateRoute>} />
            <Route path="/builder/:id" element={<PrivateRoute><BuilderLayout /></PrivateRoute>} />
            <Route path="/:username/:invoiceId" element={<PublicInvoice />} />
            <Route path="/" element={<Landing />} />
            </Routes>
          </Suspense>
        </Router>
      </DialogProvider>
    </AuthProvider>
  );
}
