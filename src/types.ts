export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
  invoiceName?: string;
  documentTitle?: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;

  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;

  invoiceNumber: string;
  issueDate: string;
  dueDate: string;

  items: InvoiceItem[];

  currency: string;
  taxRate: number;
  discount: number;

  notes: string;
  terms: string;
  bankAddress?: string;
}

export type BlockType =
  | 'logo'
  | 'company-info'
  | 'client-info'
  | 'invoice-details'
  | 'items-table'
  | 'totals'
  | 'notes'
  | 'terms'
  | 'bank-details'
  | 'divider'
  | 'spacer'
  | 'custom-text'
  | 'header-split'; // A composite block for common layout

export interface InvoiceBlock {
  id: string;
  type: BlockType;
  content?: string; // For custom text or specific block data
}

export interface InvoiceSettings {
  brandColor: string;
  logoUrl: string | null;
  fontFamily: string;
}

export type InvoiceStatus = 'draft' | 'published';

export interface SavedInvoice {
  id: string;
  title: string;
  invoiceNumber?: string;
  status: InvoiceStatus;
  publicUrl?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  data: InvoiceData;
  layout: InvoiceBlock[];
  settings: InvoiceSettings;
}

export interface SavedClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt?: string;
  updatedAt?: string;
}
