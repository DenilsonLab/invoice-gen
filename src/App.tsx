import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BuilderProvider } from './context/BuilderContext';
import Builder from './components/Builder/Builder';
import HeaderActions from './components/Builder/HeaderActions';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function BuilderLayout() {
  return (
    <BuilderProvider>
      <div className="min-h-screen bg-[#f5f5f4] text-gray-900 font-sans selection:bg-blue-200 flex flex-col">
        {/* Top Navigation - Hidden when printing */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 print:hidden flex-shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="text-gray-500 hover:text-gray-900 mr-2">
                <ArrowLeft size={20} />
              </Link>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <FileText size={20} />
              </div>
              <span className="font-semibold text-lg tracking-tight">InvoiceGen Pro</span>
            </div>
            
            <HeaderActions />
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
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

