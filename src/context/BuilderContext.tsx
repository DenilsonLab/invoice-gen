import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { InvoiceData, InvoiceBlock, InvoiceSettings, InvoiceStatus } from '../types';
import { initialInvoiceData, initialLayout, initialSettings } from '../constants';
import { useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';

interface BuilderContextType {
  data: InvoiceData;
  setData: React.Dispatch<React.SetStateAction<InvoiceData>>;
  layout: InvoiceBlock[];
  setLayout: React.Dispatch<React.SetStateAction<InvoiceBlock[]>>;
  settings: InvoiceSettings;
  setSettings: React.Dispatch<React.SetStateAction<InvoiceSettings>>;
  selectedBlockId: string | null;
  setSelectedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  invoiceId: string | null;
  status: InvoiceStatus;
  publicUrl: string | null;
  isAutosaving: boolean;
  lastSavedAt: Date | null;
  setInvoiceMeta: (meta: { id?: string | null; status?: InvoiceStatus; publicUrl?: string | null }) => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export function BuilderProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<InvoiceData>(initialInvoiceData);
  const [layout, setLayout] = useState<InvoiceBlock[]>(initialLayout);
  const [settings, setSettings] = useState<InvoiceSettings>(initialSettings);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(id || null);
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isReady, setIsReady] = useState(!id);

  const setInvoiceMeta = (meta: { id?: string | null; status?: InvoiceStatus; publicUrl?: string | null }) => {
    if (meta.id !== undefined) setInvoiceId(meta.id);
    if (meta.status !== undefined) setStatus(meta.status);
    if (meta.publicUrl !== undefined) setPublicUrl(meta.publicUrl);
  };

  useEffect(() => {
    if (!id) return;

    const loadInvoice = async () => {
      setIsReady(false);
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (res.ok) {
          const invoice = await res.json();
          setInvoiceMeta({ id: invoice.id, status: invoice.status || 'draft', publicUrl: invoice.publicUrl || null });
          setData(invoice.data);
          setLayout(invoice.layout);
          setSettings(invoice.settings);
          setIsReady(true);
        } else {
          alert(t('builder.actions.loadError'));
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Failed to load invoice', error);
        alert(t('builder.actions.loadError'));
        navigate('/dashboard');
      }
    };

    loadInvoice();
  }, [id, navigate, t]);

  useEffect(() => {
    if (!id && user) {
      // It's a new invoice, let's set the user's data and calculate the next invoice number
      const fetchInitialData = async () => {
        try {
          const res = await fetch('/api/invoices/next-number');
          let nextInvoiceNumber = 'INV-0001';

          if (res.ok) {
            const nextNumber = await res.json();
            nextInvoiceNumber = nextNumber.invoiceNumber || nextInvoiceNumber;
          }

          setData(prev => ({
            ...prev,
            companyName: user.companyName || '',
            companyEmail: user.companyEmail || '',
            companyPhone: user.companyPhone || '',
            companyAddress: user.companyAddress || '',
            bankAddress: user.bankAddress || '',
            currency: user.preferredCurrency || 'USD',
            invoiceNumber: nextInvoiceNumber,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }));
          setIsReady(true);
        } catch (error) {
          console.error('Failed to fetch initial data', error);
        }
      };

      fetchInitialData();
    }
  }, [id, user]);

  useEffect(() => {
    if (!isReady || !user || status !== 'draft' || !data.invoiceNumber) return;

    const timeout = window.setTimeout(async () => {
      setIsAutosaving(true);
      try {
        const defaultTitle = `${data.documentTitle || t('invoice.defaultTitle')} ${data.invoiceNumber || t('invoice.draft')}`;
        const title = data.invoiceName || defaultTitle;
        const payload = { title, data, layout, settings };
        const currentId = invoiceId || id;
        const res = await fetch(currentId ? `/api/invoices/${currentId}/draft` : '/api/invoices/draft', {
          method: currentId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const savedInvoice = await res.json();
          setInvoiceMeta({ id: savedInvoice.id, status: savedInvoice.status || 'draft', publicUrl: savedInvoice.publicUrl || null });
          if (savedInvoice.data?.invoiceNumber && savedInvoice.data.invoiceNumber !== data.invoiceNumber) {
            setData(savedInvoice.data);
          }
          setLastSavedAt(new Date());
          if (!currentId) navigate(`/builder/${savedInvoice.id}`, { replace: true });
        }
      } catch (error) {
        console.error('Failed to autosave draft', error);
      } finally {
        setIsAutosaving(false);
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [data, layout, settings, isReady, user, status, invoiceId, id, navigate, t]);

  return (
    <BuilderContext.Provider value={{
      data, setData,
      layout, setLayout,
      settings, setSettings,
      selectedBlockId, setSelectedBlockId,
      invoiceId, status, publicUrl, isAutosaving, lastSavedAt, setInvoiceMeta
    }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function StaticBuilderProvider({ data, layout, settings, children }: { data: InvoiceData; layout: InvoiceBlock[]; settings: InvoiceSettings; children: React.ReactNode }) {
  const noop = () => undefined;

  return (
    <BuilderContext.Provider value={{
      data,
      setData: noop as React.Dispatch<React.SetStateAction<InvoiceData>>,
      layout,
      setLayout: noop as React.Dispatch<React.SetStateAction<InvoiceBlock[]>>,
      settings,
      setSettings: noop as React.Dispatch<React.SetStateAction<InvoiceSettings>>,
      selectedBlockId: null,
      setSelectedBlockId: noop as React.Dispatch<React.SetStateAction<string | null>>,
      invoiceId: null,
      status: 'published',
      publicUrl: null,
      isAutosaving: false,
      lastSavedAt: null,
      setInvoiceMeta: noop,
    }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}
