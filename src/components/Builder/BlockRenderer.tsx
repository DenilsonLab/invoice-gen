import React from 'react';
import { InvoiceBlock } from '../../types';
import { useBuilder } from '../../context/BuilderContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useTranslation } from 'react-i18next';

interface BlockRendererProps {
  block: InvoiceBlock;
}

export default function BlockRenderer({ block }: BlockRendererProps) {
  const { t } = useTranslation();
  const { data, settings } = useBuilder();

  const subtotal = (data.items || []).reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
  const taxAmount = subtotal * ((Number(data.taxRate) || 0) / 100);
  const total = subtotal + taxAmount - (Number(data.discount) || 0);

  switch (block.type) {
    case 'header-split':
      return (
        <div className="flex justify-between items-start mb-8">
          <div className="max-w-xs">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="max-h-20 mb-4 object-contain" />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ color: settings.brandColor }}>
                {data.companyName || t('invoice.companyNamePlaceholder')}
              </h1>
            )}
            <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed">
              {data.companyAddress}
            </p>
            <div className="mt-4 text-sm text-gray-500">
              {data.companyEmail && <p>{data.companyEmail}</p>}
              {data.companyPhone && <p>{data.companyPhone}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-light text-gray-300 tracking-widest uppercase mb-4">{data.documentTitle || t('invoice.defaultTitle')}</h2>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500 font-normal mr-2">{t('invoice.numberAbbr')}</span>
                {data.invoiceNumber}
              </p>
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500 font-normal mr-2">{t('invoice.dateAbbr')}</span>
                {formatDate(data.issueDate)}
              </p>
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500 font-normal mr-2">{t('invoice.dueAbbr')}</span>
                {formatDate(data.dueDate)}
              </p>
            </div>
          </div>
        </div>
      );

    case 'company-info':
      return (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ color: settings.brandColor }}>
            {data.companyName || t('invoice.companyNamePlaceholder')}
          </h1>
          <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed">
            {data.companyAddress}
          </p>
          <div className="mt-2 text-sm text-gray-500">
            {data.companyEmail && <p>{data.companyEmail}</p>}
            {data.companyPhone && <p>{data.companyPhone}</p>}
          </div>
        </div>
      );

    case 'client-info':
      return (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t('invoice.billTo')}</h3>
          <p className="text-lg font-medium text-gray-900 mb-1">{data.clientName || t('invoice.clientNamePlaceholder')}</p>
          <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed max-w-sm">
            {data.clientAddress}
          </p>
          <div className="mt-2 text-sm text-gray-500">
            {data.clientEmail && <p>{data.clientEmail}</p>}
            {data.clientPhone && <p>{data.clientPhone}</p>}
          </div>
        </div>
      );

    case 'invoice-details':
      return (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-wrap gap-8">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('form.invoiceNumber')}</p>
            <p className="text-sm font-medium text-gray-900">{data.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('form.issueDate')}</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(data.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{t('form.dueDate')}</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(data.dueDate)}</p>
          </div>
        </div>
      );

    case 'items-table':
      return (
        <div className="mb-8 w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2" style={{ borderColor: settings.brandColor }}>
                <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider w-1/2">{t('form.description')}</th>
                <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">{t('invoice.qtyAbbr')}</th>
                <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">{t('form.price')}</th>
                <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">{t('invoice.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 text-sm text-gray-900">{item.description || '-'}</td>
                  <td className="py-4 text-sm text-gray-600 text-right">{item.quantity}</td>
                  <td className="py-4 text-sm text-gray-600 text-right">{formatCurrency(item.price, data.currency)}</td>
                  <td className="py-4 text-sm text-gray-900 text-right font-medium">{formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0), data.currency)}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400 italic">{t('invoice.noItems')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );

    case 'totals':
      return (
        <div className="flex justify-end mb-8">
          <div className="w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('invoice.subtotal')}</span>
              <span>{formatCurrency(subtotal, data.currency)}</span>
            </div>
            {data.taxRate > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('invoice.tax')} ({data.taxRate}%)</span>
                <span>{formatCurrency(taxAmount, data.currency)}</span>
              </div>
            )}
            {data.discount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('form.discount')}</span>
                <span className="text-red-500">-{formatCurrency(data.discount, data.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t-2" style={{ borderColor: settings.brandColor }}>
              <span>{t('invoice.total')}</span>
              <span>{formatCurrency(total, data.currency)}</span>
            </div>
          </div>
        </div>
      );

    case 'notes': {
      const notesContent = data.notes?.replace(/<p><br><\/p>/g, '').trim();
      if (!notesContent || notesContent === '<p></p>') return null;
      return (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-1 text-sm">{t('form.additionalNotes')}</h4>
          <div
            className="prose prose-sm max-w-none text-gray-500"
            dangerouslySetInnerHTML={{ __html: notesContent }}
          />
        </div>
      );
    }

    case 'terms': {
      const termsContent = data.terms?.replace(/<p><br><\/p>/g, '').trim();
      if (!termsContent || termsContent === '<p></p>') return null;
      return (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-1 text-sm">{t('form.terms')}</h4>
          <div
            className="prose prose-sm max-w-none text-gray-500"
            dangerouslySetInnerHTML={{ __html: termsContent }}
          />
        </div>
      );
    }

    case 'bank-details': {
      const bankContent = data.bankAddress?.replace(/<p><br><\/p>/g, '').trim();
      if (!bankContent || bankContent === '<p></p>') return null;
      return (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-1 text-sm pt-4 border-t border-gray-100">{t('form.bankDetails')}</h4>
          <div
            className="prose prose-sm max-w-none text-gray-500"
            dangerouslySetInnerHTML={{ __html: bankContent }}
          />
        </div>
      );
    }

    case 'divider':
      return <hr className="my-8 border-gray-200" />;

    case 'spacer':
      return <div className="h-8 w-full" />;

    case 'custom-text':
      return (
        <div className="mb-6">
          <div
            className="text-sm text-gray-700 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: block.content || `<p>${t('invoice.customTextPlaceholder')}</p>` }}
          />
        </div>
      );

    case 'logo':
      if (!settings.logoUrl) return <div className="h-20 w-40 bg-gray-100 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded mb-8">{t('invoice.logoPlaceholder')}</div>;
      return <img src={settings.logoUrl} alt="Logo" className="max-h-20 mb-8 object-contain" />;

    default:
      return null;
  }
}
