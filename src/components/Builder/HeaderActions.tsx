import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Copy, Download, FileText, Mail, Printer, Save, Share2 } from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function HeaderActions() {
  const { t } = useTranslation();
  const { data, setData, layout, settings, invoiceId, status, publicUrl, isAutosaving, lastSavedAt, setInvoiceMeta } = useBuilder();
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'invoice' | 'export' | null>(null);

  const fullPublicUrl = publicUrl ? `${window.location.origin}${publicUrl}` : '';

  const handlePrint = () => {
    setActiveMenu(null);
    window.print();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const defaultTitle = `${data.documentTitle || t('invoice.defaultTitle')} ${data.invoiceNumber || t('invoice.draft')}`;
      const title = data.invoiceName || defaultTitle;
      const payload = { title, data, layout, settings };
      const currentId = invoiceId || id;

      let res;
      if (currentId) {
        res = await fetch(`/api/invoices/${currentId}/publish`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/invoices/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const savedInvoice = await res.json();
        setInvoiceMeta({ id: savedInvoice.id, status: savedInvoice.status || 'published', publicUrl: savedInvoice.publicUrl || null });
        if (savedInvoice.data) setData(savedInvoice.data);
        if (!currentId) {
          navigate(`/builder/${savedInvoice.id}`, { replace: true });
        }
        alert(t('builder.actions.publishSuccess'));
        setActiveMenu(null);
      } else {
        alert(t('builder.actions.saveError'));
      }
    } catch (error) {
      console.error('Failed to save invoice', error);
      alert(t('builder.actions.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!fullPublicUrl) return;
    await navigator.clipboard.writeText(fullPublicUrl);
    setActiveMenu(null);
    alert(t('builder.share.copied'));
  };

  const handleEmailLink = () => {
    if (!fullPublicUrl) return;
    const subject = encodeURIComponent(data.invoiceName || `${data.documentTitle || t('invoice.defaultTitle')} ${data.invoiceNumber}`);
    const body = encodeURIComponent(`${t('builder.share.emailBody')}\n\n${fullPublicUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setActiveMenu(null);
  };

  const handleSharePdf = async () => {
    setActiveMenu(null);
    await handleExportPdf();
  };

  const handleExportDocx = async () => {
    setActiveMenu(null);
    try {
      const { generateDocx } = await import('../../utils/docxExport');
      await generateDocx(data, layout, settings);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      alert(t('builder.actions.docxError'));
    }
  };

  const handleExportPdf = async () => {
    setActiveMenu(null);
    setIsExportingPdf(true);
    try {
      const { generatePdf } = await import('../../utils/pdfExport');
      await generatePdf(data);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('builder.actions.pdfError'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500 shadow-sm">
        <span className={`h-2 w-2 rounded-full ${status === 'published' ? 'bg-green-500' : 'bg-amber-400'}`} />
        <span className="font-medium text-gray-700">{status === 'published' ? t('builder.status.published') : t('builder.status.draft')}</span>
        {status === 'draft' && <span>{isAutosaving ? t('builder.status.autosaving') : lastSavedAt ? t('builder.status.autosaved') : ''}</span>}
      </div>

      <div className="relative">
        <button
          onClick={() => setActiveMenu((value) => value === 'invoice' ? null : 'invoice')}
          className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 shadow-sm transition-colors hover:bg-green-100"
          title={t('builder.menu.invoice')}
        >
          <CheckCircle2 size={16} />
          <span className="hidden sm:inline">{t('builder.menu.invoice')}</span>
          <ChevronDown size={15} className={`transition-transform ${activeMenu === 'invoice' ? 'rotate-180' : ''}`} />
        </button>

        {activeMenu === 'invoice' && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-xl z-50">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('builder.menu.invoice')}</div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-800 transition-colors hover:bg-green-50 disabled:opacity-50"
            >
              {status === 'published' ? <Save size={16} className="text-green-600" /> : <CheckCircle2 size={16} className="text-green-600" />}
              <span>{isSaving ? t('common.saving') : t('builder.actions.publish')}</span>
            </button>

            <div className="my-2 border-t border-gray-100" />
            <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('builder.share.title')}</div>
            <button
              onClick={handleCopyLink}
              disabled={status !== 'published' || !publicUrl}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              title={status === 'published' ? t('builder.share.copyLink') : t('builder.share.disabledDraft')}
            >
              <Copy size={16} /> {t('builder.share.copyLink')}
            </button>
            <button
              onClick={handleEmailLink}
              disabled={status !== 'published' || !publicUrl}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              title={status === 'published' ? t('builder.share.emailLink') : t('builder.share.disabledDraft')}
            >
              <Mail size={16} /> {t('builder.share.emailLink')}
            </button>
            <button
              onClick={handleSharePdf}
              disabled={status !== 'published' || !publicUrl || isExportingPdf}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              title={status === 'published' ? t('builder.share.sendPdf') : t('builder.share.disabledDraft')}
            >
              <Share2 size={16} /> {t('builder.share.sendPdf')}
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setActiveMenu((value) => value === 'export' ? null : 'export')}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          title={t('builder.menu.export')}
        >
          <Download size={16} />
          <span className="hidden sm:inline">{t('builder.menu.export')}</span>
          <ChevronDown size={15} className={`transition-transform ${activeMenu === 'export' ? 'rotate-180' : ''}`} />
        </button>

        {activeMenu === 'export' && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl z-50">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('builder.menu.export')}</div>
            <button 
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <Download size={16} className="text-red-600" />
              <span>{isExportingPdf ? t('builder.actions.generating') : t('builder.actions.pdf')}</span>
            </button>
            <button 
              onClick={handleExportDocx}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50"
            >
              <FileText size={16} className="text-blue-600" />
              <span>{t('builder.actions.word')}</span>
            </button>
            <button 
              onClick={handlePrint}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Printer size={16} className="text-gray-700" />
              <span>{t('builder.actions.print')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
