import { InvoiceData, InvoiceBlock, InvoiceSettings } from './types';

export const initialInvoiceData: InvoiceData = {
  documentTitle: '',
  companyName: '',
  companyAddress: '',
  companyEmail: '',
  companyPhone: '',

  clientName: '',
  clientAddress: '',
  clientEmail: '',
  clientPhone: '',

  invoiceNumber: 'INV-0001',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now

  items: [
    {
      id: '1',
      description: '',
      quantity: 1,
      price: 1500,
    },
    {
      id: '2',
      description: '',
      quantity: 40,
      price: 50,
    }
  ],

  currency: 'USD',
  taxRate: 10,
  discount: 0,

  notes: '',
  terms: '',
};

export const initialLayout: InvoiceBlock[] = [
  { id: 'block-header-split', type: 'header-split' },
  { id: 'block-spacer-1', type: 'spacer' },
  { id: 'block-client-info', type: 'client-info' },
  { id: 'block-spacer-2', type: 'spacer' },
  { id: 'block-items-table', type: 'items-table' },
  { id: 'block-spacer-3', type: 'spacer' },
  { id: 'block-totals', type: 'totals' },
  { id: 'block-spacer-4', type: 'spacer' },
  { id: 'block-notes', type: 'notes' },
  { id: 'block-bank-details', type: 'bank-details' },
  { id: 'block-terms', type: 'terms' },
];

export const initialSettings: InvoiceSettings = {
  brandColor: '#2563eb', // blue-600
  logoUrl: null,
  fontFamily: 'Inter',
};

