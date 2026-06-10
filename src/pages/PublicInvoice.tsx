import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StaticBuilderProvider } from '../context/BuilderContext';
import BlockRenderer from '../components/Builder/BlockRenderer';
import { SavedInvoice } from '../types';

export default function PublicInvoice() {
  const { t } = useTranslation();
  const { username, invoiceId } = useParams();
  const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const safeUsername = encodeURIComponent(username || '');
        const safeInvoiceId = encodeURIComponent(invoiceId || '');
        const res = await fetch(`/api/invoices/public/${safeUsername}/${safeInvoiceId}`);
        if (res.ok) {
          setInvoice(await res.json());
        }
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [username, invoiceId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#f5f5f4] text-gray-500">Loading...</div>;
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f4] text-gray-500 gap-3">
        <FileText size={40} className="text-gray-300" />
        <p>Invoice not found.</p>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const { generatePdf } = await import('../utils/pdfExport');
      await generatePdf(invoice.data);
    } catch (error) {
      console.error('Error generating public invoice PDF:', error);
      alert(t('builder.actions.pdfError'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <StaticBuilderProvider data={invoice.data} layout={invoice.layout} settings={invoice.settings}>
      <div className="min-h-screen bg-[#f5f5f4] py-8 px-4 print:bg-white print:p-0">
        <div className="mx-auto mb-4 flex w-full max-w-[210mm] justify-end print:hidden">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            {isDownloading ? t('builder.actions.generating') : t('publicInvoice.downloadPdf')}
          </button>
        </div>
        <main
          id="invoice-canvas"
          className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-2xl print:shadow-none print:m-0 print:w-full print:max-w-none print:h-auto print:min-h-0"
          style={{ fontFamily: invoice.settings.fontFamily }}
        >
          <div className="p-12 md:p-16 flex flex-col min-h-[297mm]">
            {invoice.layout.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        </main>
      </div>
    </StaticBuilderProvider>
  );
}
