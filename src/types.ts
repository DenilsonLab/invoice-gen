export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface InvoiceData {
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

