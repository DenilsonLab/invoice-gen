import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, FileText, Loader2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Profile() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency || 'USD');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [companyEmail, setCompanyEmail] = useState(user?.companyEmail || '');
  const [companyPhone, setCompanyPhone] = useState(user?.companyPhone || '');
  const [companyAddress, setCompanyAddress] = useState(user?.companyAddress || '');
  const [bankAddress, setBankAddress] = useState(user?.bankAddress || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setUsername(user.username);
      setPreferredCurrency(user.preferredCurrency);
      setCompanyName(user.companyName || '');
      setCompanyEmail(user.companyEmail || '');
      setCompanyPhone(user.companyPhone || '');
      setCompanyAddress(user.companyAddress || '');
      setBankAddress(user.bankAddress || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName, lastName, username, preferredCurrency,
          companyName, companyEmail, companyPhone, companyAddress, bankAddress
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setMessage(t('profile.updateSuccess'));
        setSaveStatus('success');
      } else {
        setError(data.error);
        setSaveStatus('error');
      }
    } catch (err) {
      setError(t('common.genericError'));
      setSaveStatus('error');
    }
  };

  const feedbackMessage = message || error;

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex shrink-0 items-center gap-3">
            <Link to="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <FileText size={20} />
              </div>
              <span className="font-semibold text-lg tracking-tight">{t('nav.profile')}</span>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {feedbackMessage && (
        <div className="fixed right-4 top-20 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm shadow-xl ${message ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {message ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
            <div>
              <p className="font-semibold">{message ? t('profile.savedTitle') : t('profile.errorTitle')}</p>
              <p>{feedbackMessage}</p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('profile.personalInfo')}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    {t('auth.firstName')}
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    {t('auth.lastName')}
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    {t('auth.username')}
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      @
                    </span>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300 py-2 px-3 border"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    {t('auth.email')}
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="shadow-sm block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{t('profile.emailLocked')}</p>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                    {t('profile.preferredCurrency')}
                  </label>
                  <div className="mt-1">
                    <select
                      id="currency"
                      name="currency"
                      value={preferredCurrency}
                      onChange={(e) => setPreferredCurrency(e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="MXN">MXN ($)</option>
                      <option value="COP">COP ($)</option>
                      <option value="ARS">ARS ($)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('profile.companyData')}</h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">{t('form.companyName')}</label>
                    <div className="mt-1">
                      <input type="text" id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">{t('profile.companyEmail')}</label>
                    <div className="mt-1">
                      <input type="email" id="companyEmail" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">{t('form.phone')}</label>
                    <div className="mt-1">
                      <input type="text" id="companyPhone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                    </div>
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">{t('form.address')}</label>
                    <div className="mt-1">
                      <input type="text" id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                    </div>
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="bankAddress" className="block text-sm font-medium text-gray-700">{t('form.bankDetails')}</label>
                    <div className="mt-1">
                      <textarea id="bankAddress" rows={3} value={bankAddress} onChange={(e) => setBankAddress(e.target.value)} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 -mx-8 -mb-8 flex items-center justify-between gap-4 border-t border-gray-200 bg-white/95 px-8 py-5 backdrop-blur">
                <div className="min-h-5 text-sm">
                  {saveStatus === 'success' && <span className="flex items-center gap-2 font-medium text-green-700"><CheckCircle2 size={16} />{t('profile.updateSuccess')}</span>}
                  {saveStatus === 'error' && <span className="flex items-center gap-2 font-medium text-red-700"><AlertCircle size={16} />{error || t('common.genericError')}</span>}
                  {saveStatus === 'saving' && <span className="flex items-center gap-2 font-medium text-blue-700"><Loader2 size={16} className="animate-spin" />{t('common.saving')}</span>}
                </div>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className={`inline-flex min-w-40 items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
                >
                  {saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : saveStatus === 'success' ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  {saveStatus === 'saving' ? t('common.saving') : saveStatus === 'success' ? t('profile.savedButton') : t('profile.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>

        <PasswordChangeForm />
      </main>
    </div>
  );
}

function PasswordChangeForm() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(t('common.genericError'));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
      <div className="p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('profile.changePassword')}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">{message}</div>}
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
          
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700">{t('profile.currentPassword')}</label>
              <div className="mt-1 relative">
                <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 pr-10 border" />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  aria-label={showCurrentPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700">{t('profile.newPassword')}</label>
              <div className="mt-1 relative">
                <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 pr-10 border" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  aria-label={showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="pt-5 flex justify-end">
            <button type="submit" className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 gap-2 items-center">
              {t('profile.updatePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
