import React from 'react';
import { InvoiceBlock } from '../../types';
import { useBuilder } from '../../context/BuilderContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BlockRendererProps {
  block: InvoiceBlock;
}

export default function BlockRenderer({ block }: BlockRendererProps) {
  const { data, settings } = useBuilder();

  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount - data.discount;

  switch (block.type) {
    case 'header-split':
      return (
        <div className="flex justify-between items-start mb-8">
          <div className="max-w-xs">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="max-h-20 mb-4 object-contain" />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ color: settings.brandColor }}>
                {data.companyName || 'Nombre de Empresa'}
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
            <h2 className="text-4xl font-light text-gray-300 tracking-widest uppercase mb-4">{data.documentTitle || 'Factura'}</h2>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500 font-normal mr-2">Nº:</span>
                {data.invoiceNumber}
              </p>
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500 font-normal mr-2">Fecha:</span>
                {formatDate(data.issueDate)}
              </p>
              <p className="text-sm font-medium text-gray-900">
                <span className="text-gray-500 font-normal mr-2">Vence:</span>
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
            {data.companyName || 'Nombre de Empresa'}
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
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Facturar a:</h3>
          <p className="text-lg font-medium text-gray-900 mb-1">{data.clientName || 'Nombre del Cliente'}</p>
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
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nº Factura</p>
            <p className="text-sm font-medium text-gray-900">{data.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha de Emisión</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(data.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha de Vencimiento</p>
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
                <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider w-1/2">Descripción</th>
                <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">Cant.</th>
                <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">Precio</th>
                <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 text-sm text-gray-900">{item.description || '-'}</td>
                  <td className="py-4 text-sm text-gray-600 text-right">{item.quantity}</td>
                  <td className="py-4 text-sm text-gray-600 text-right">{formatCurrency(item.price, data.currency)}</td>
                  <td className="py-4 text-sm text-gray-900 text-right font-medium">{formatCurrency(item.quantity * item.price, data.currency)}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400 italic">No hay artículos</td>
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
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, data.currency)}</span>
            </div>
            {data.taxRate > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Impuesto ({data.taxRate}%)</span>
                <span>{formatCurrency(taxAmount, data.currency)}</span>
              </div>
            )}
            {data.discount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Descuento</span>
                <span className="text-red-500">-{formatCurrency(data.discount, data.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t-2" style={{ borderColor: settings.brandColor }}>
              <span>Total</span>
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
          <h4 className="font-medium text-gray-900 mb-1 text-sm">Notas</h4>
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
          <h4 className="font-medium text-gray-900 mb-1 text-sm">Términos y Condiciones</h4>
          <div
            className="prose prose-sm max-w-none text-gray-500"
            dangerouslySetInnerHTML={{ __html: termsContent }}
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
            dangerouslySetInnerHTML={{ __html: block.content || 'Texto personalizado...' }}
          />
        </div>
      );

    case 'logo':
      if (!settings.logoUrl) return <div className="h-20 w-40 bg-gray-100 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded mb-8">Logo Placeholder</div>;
      return <img src={settings.logoUrl} alt="Logo" className="max-h-20 mb-8 object-contain" />;

    default:
      return null;
  }
}
