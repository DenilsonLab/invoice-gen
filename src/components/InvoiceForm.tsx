import React, { lazy, Suspense, useEffect, useState } from 'react';
import { InvoiceData, InvoiceItem, SavedClient } from '../types';
import { CheckCircle2, Pencil, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { useTranslation } from 'react-i18next';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = lazy(() => import('react-quill-new'));

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

export default function InvoiceForm({ data, onChange }: InvoiceFormProps) {
  const { t } = useTranslation();
  const { layout } = useBuilder();
  const [clients, setClients] = useState<SavedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [isSavingClient, setIsSavingClient] = useState(false);

  const hasBlock = (types: string[]) => layout.some(b => types.includes(b.type));

  const showCompany = hasBlock(['company-info', 'header-split']);
  const showClient = hasBlock(['client-info']);
  const showDetails = hasBlock(['invoice-details', 'header-split']);
  const showItems = hasBlock(['items-table']);
  const showTotals = hasBlock(['totals']);
  const showNotes = hasBlock(['notes']);
  const showTerms = hasBlock(['terms']);
  const showBankDetails = hasBlock(['bank-details']);

  useEffect(() => {
    if (!showClient) return;

    const loadClients = async () => {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) setClients(await res.json());
      } catch (error) {
        console.error('Failed to load clients', error);
      }
    };

    loadClients();
  }, [showClient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const handleQuillChange = (name: string, value: string) => {
    onChange({ ...data, [name]: value });
  };

  const applyClient = (client: SavedClient) => {
    setSelectedClientId(client.id);
    setClientFeedback('');
    onChange({
      ...data,
      clientName: client.name,
      clientEmail: client.email || '',
      clientPhone: client.phone || '',
      clientAddress: client.address || '',
    });
  };

  const saveClient = async () => {
    if (!data.clientName.trim()) {
      setClientFeedback(t('clients.nameRequired'));
      return;
    }

    setIsSavingClient(true);
    setClientFeedback('');
    const payload = {
      name: data.clientName,
      email: data.clientEmail,
      phone: data.clientPhone || '',
      address: data.clientAddress,
    };

    try {
      const res = await fetch(selectedClientId ? `/api/clients/${selectedClientId}` : '/api/clients', {
        method: selectedClientId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save client');

      const savedClient = await res.json();
      setClients((current) => {
        const exists = current.some((client) => client.id === savedClient.id);
        const next = exists ? current.map((client) => client.id === savedClient.id ? savedClient : client) : [...current, savedClient];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedClientId(savedClient.id);
      setClientFeedback(t('clients.saved'));
    } catch (error) {
      console.error('Failed to save client', error);
      setClientFeedback(t('clients.saveError'));
    } finally {
      setIsSavingClient(false);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!confirm(t('clients.deleteConfirm'))) return;

    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete client');

      setClients((current) => current.filter((client) => client.id !== clientId));
      if (selectedClientId === clientId) setSelectedClientId('');
      setClientFeedback(t('clients.deleted'));
    } catch (error) {
      console.error('Failed to delete client', error);
      setClientFeedback(t('clients.deleteError'));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: parseFloat(value) || 0 });
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    const newItems = data.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...data, items: newItems });
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      price: 0,
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const removeItem = (id: string) => {
    onChange({ ...data, items: data.items.filter(item => item.id !== id) });
  };

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'code'],
      ['code-block'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  const clientSearch = data.clientName.trim().toLowerCase();
  const filteredClients = clientSearch
    ? clients.filter((client) => `${client.name} ${client.email} ${client.phone}`.toLowerCase().includes(clientSearch)).slice(0, 5)
    : clients.slice(0, 5);

  return (
    <div className="space-y-8">

      {/* Invoice Details */}
      {showDetails && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">{t('form.invoiceTitle')}</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.invoiceNumber')}</label>
              <input type="text" name="invoiceNumber" value={data.invoiceNumber} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.issueDate')}</label>
              <input type="date" name="issueDate" value={data.issueDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.dueDate')}</label>
              <input type="date" name="dueDate" value={data.dueDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
          </div>
        </section>
      )}

      {showDetails && (showCompany || showClient || showItems || showTotals || showNotes || showTerms || showBankDetails) && <hr className="border-gray-100" />}

      {/* Company Details */}
      {showCompany && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">{t('form.companyTitle')}</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.invoiceLabel')}</label>
              <input type="text" name="documentTitle" value={data.documentTitle || t('invoice.defaultTitle')} onChange={handleChange} placeholder={t('invoice.defaultTitle')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.companyName')}</label>
              <input type="text" name="companyName" value={data.companyName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.email')}</label>
              <input type="email" name="companyEmail" value={data.companyEmail} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.phone')}</label>
              <input type="tel" name="companyPhone" value={data.companyPhone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.address')}</label>
              <textarea name="companyAddress" value={data.companyAddress} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm resize-none" />
            </div>
          </div>
        </section>
      )}

      {showCompany && (showClient || showDetails || showItems || showTotals || showNotes || showTerms) && <hr className="border-gray-100" />}

      {/* Client Details */}
      {showClient && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('form.clientTitle')}</h3>
            <button
              type="button"
              onClick={saveClient}
              disabled={isSavingClient}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectedClientId ? <Save size={14} /> : <UserPlus size={14} />}
              {isSavingClient ? t('common.saving') : selectedClientId ? t('clients.update') : t('clients.save')}
            </button>
          </div>

          {clients.length > 0 && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <label className="mb-2 block text-xs font-medium text-gray-500">{t('clients.savedClients')}</label>
              <select
                value={selectedClientId}
                onChange={(event) => {
                  const client = clients.find((item) => item.id === event.target.value);
                  if (client) applyClient(client);
                  else setSelectedClientId('');
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('clients.selectPlaceholder')}</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </div>
          )}

          {clientFeedback && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
              <CheckCircle2 size={14} />
              {clientFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.clientName')}</label>
              <input type="text" name="clientName" value={data.clientName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>

            {filteredClients.length > 0 && (
              <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('clients.quickFill')}</p>
                {filteredClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-gray-50">
                    <button type="button" onClick={() => applyClient(client)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-medium text-gray-800">{client.name}</span>
                      <span className="block truncate text-xs text-gray-500">{client.email || client.phone || client.address}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => applyClient(client)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50" title={t('clients.edit')}>
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => deleteClient(client.id)} className="rounded-md p-1.5 text-red-600 hover:bg-red-50" title={t('clients.delete')}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.clientEmail')}</label>
              <input type="email" name="clientEmail" value={data.clientEmail} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.clientPhone')}</label>
              <input type="tel" name="clientPhone" value={data.clientPhone || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">{t('form.clientAddress')}</label>
              <textarea name="clientAddress" value={data.clientAddress} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm resize-none" />
            </div>
          </div>
        </section>
      )}

      {showClient && (showDetails || showItems || showTotals || showNotes || showTerms) && <hr className="border-gray-100" />}

      {/* Items */}
      {showItems && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('form.itemsTitle')}</h3>
          </div>

          <div className="space-y-4">
            {data.items.map((item) => (
              <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3 relative">
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title={t('form.removeItem')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="pr-8">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">{t('form.description')}</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    placeholder={t('form.description')}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">{t('form.quantity')}</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder={t('form.quantity')}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">{t('form.price')}</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder={t('form.price')}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addItem}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus size={16} />
            {t('form.addItem')}
          </button>
        </section>
      )}

      {showItems && (showTotals || showNotes || showTerms) && <hr className="border-gray-100" />}

      {/* Totals & Settings */}
      {(showTotals || showNotes || showTerms || showBankDetails) && (
        <section>
          <div className="grid grid-cols-1 gap-8">
            {(showNotes || showTerms || showBankDetails) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('form.notesTermsTitle')}</h3>
                {showNotes && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">{t('form.additionalNotes')}</label>
                    <Suspense fallback={<div className="h-32 bg-gray-50 rounded-lg border border-gray-200" />}>
                      <ReactQuill
                        theme="snow"
                        value={data.notes}
                        onChange={(value) => handleQuillChange('notes', value)}
                        modules={quillModules}
                        className="bg-white rounded-lg"
                      />
                    </Suspense>
                  </div>
                )}
                {showTerms && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">{t('form.terms')}</label>
                    <Suspense fallback={<div className="h-32 bg-gray-50 rounded-lg border border-gray-200" />}>
                      <ReactQuill
                        theme="snow"
                        value={data.terms}
                        onChange={(value) => handleQuillChange('terms', value)}
                        modules={quillModules}
                        className="bg-white rounded-lg"
                      />
                    </Suspense>
                  </div>
                )}
                {showBankDetails && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">{t('form.bankDetails')}</label>
                    <Suspense fallback={<div className="h-32 bg-gray-50 rounded-lg border border-gray-200" />}>
                      <ReactQuill
                        theme="snow"
                        value={data.bankAddress || ''}
                        onChange={(value) => handleQuillChange('bankAddress', value)}
                        modules={quillModules}
                        className="bg-white rounded-lg"
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            )}

            {showTotals && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{t('form.totalsTitle')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">{t('form.currency')}</label>
                    <select name="currency" value={data.currency} onChange={handleChange as any} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm bg-white">
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="MXN">MXN ($)</option>
                      <option value="ARS">ARS ($)</option>
                      <option value="COP">COP ($)</option>
                      <option value="CLP">CLP ($)</option>
                      <option value="PEN">PEN (S/)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">{t('form.taxRate')}</label>
                    <input type="number" name="taxRate" value={data.taxRate} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">{t('form.discount')}</label>
                    <input type="number" name="discount" value={data.discount} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {!showCompany && !showClient && !showDetails && !showItems && !showTotals && !showNotes && !showTerms && !showBankDetails && (
        <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-sm">
          {t('form.emptyCanvas')}
        </div>
      )}

    </div>
  );
}
