import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BuilderProvider, useBuilder } from './context/BuilderContext';
import Builder from './components/Builder/Builder';
import HeaderActions from './components/Builder/HeaderActions';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PublicInvoice from './pages/PublicInvoice';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
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
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 print:hidden flex-shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex shrink-0 items-center gap-3">
              <Link to="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <FileText size={20} />
                </div>
                <span className="hidden font-semibold tracking-tight text-gray-900 sm:inline">InvoiceGen Pro</span>
              </div>
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
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/builder" element={<PrivateRoute><BuilderLayout /></PrivateRoute>} />
          <Route path="/builder/:id" element={<PrivateRoute><BuilderLayout /></PrivateRoute>} />
          <Route path="/:username/:invoiceId" element={<PublicInvoice />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
