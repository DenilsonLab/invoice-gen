import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, LogOut, User as UserIcon, Trash2, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('dashboard.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error('Failed to delete invoice', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-gray-900 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <FileText size={20} />
            </div>
            <span className="font-semibold text-lg tracking-tight">InvoiceGen Pro</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              <UserIcon size={16} />
              <span>{user?.username}</span>
            </Link>
            <LanguageSwitcher />
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <Link 
            to="/builder"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            {t('nav.newInvoice')}
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.noInvoices')}</h3>
            <p className="text-gray-500 mb-6">{t('dashboard.startCreating')}</p>
            <Link 
              to="/builder"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              {t('dashboard.createInvoice')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{invoice.title}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {invoice.data.invoiceNumber}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p><span className="font-medium text-gray-700">{t('dashboard.client')}</span> {invoice.data.clientName || t('dashboard.unnamed')}</p>
                    <p><span className="font-medium text-gray-700">{t('dashboard.date')}</span> {new Date(invoice.updatedAt).toLocaleDateString()}</p>
                    <p><span className="font-medium text-gray-700">{t('dashboard.total')}</span> {invoice.data.currency} {
                      ((invoice.data.items || []).reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0) * (1 + (Number(invoice.data.taxRate) || 0) / 100) - (Number(invoice.data.discount) || 0)).toFixed(2)
                    }</p>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end gap-3">
                  <Link 
                    to={`/builder/${invoice.id}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Edit size={16} />
                    {t('common.edit')}
                  </Link>
                  <button 
                    onClick={() => handleDelete(invoice.id)}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
