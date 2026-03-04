import { InvoiceData, InvoiceBlock, InvoiceSettings } from './types';

export const initialInvoiceData: InvoiceData = {
  documentTitle: 'Factura',
  companyName: 'Mi Empresa S.A.',
  companyAddress: 'Calle Principal 123\nCiudad, País 12345',
  companyEmail: 'contacto@miempresa.com',
  companyPhone: '+1 234 567 890',
  
  clientName: 'Cliente Ejemplo',
  clientAddress: 'Avenida Secundaria 456\nOtra Ciudad, País 67890',
  clientEmail: 'cliente@ejemplo.com',
  clientPhone: '+1 987 654 321',

  invoiceNumber: 'INV-0001',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now

  items: [
    {
      id: '1',
      description: 'Diseño Web',
      quantity: 1,
      price: 1500,
    },
    {
      id: '2',
      description: 'Desarrollo Frontend',
      quantity: 40,
      price: 50,
    }
  ],

  currency: 'USD',
  taxRate: 10,
  discount: 0,

  notes: 'Gracias por su negocio.',
  terms: 'El pago debe realizarse en un plazo de 14 días.',
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
  { id: 'block-terms', type: 'terms' },
];

export const initialSettings: InvoiceSettings = {
  brandColor: '#2563eb', // blue-600
  logoUrl: null,
  fontFamily: 'Inter',
};

