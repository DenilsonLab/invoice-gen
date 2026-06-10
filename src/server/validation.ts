import { z } from 'zod';

const htmlString = z.string().max(20_000);
const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'MXN', 'ARS', 'COP', 'CLP', 'PEN']);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(128),
});

export const profileSchema = z.object({
  firstName: z.string().trim().max(100),
  lastName: z.string().trim().max(100),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  preferredCurrency: currencySchema,
  companyName: z.string().trim().max(200),
  companyEmail: z.string().trim().email().max(320).or(z.literal('')),
  companyPhone: z.string().trim().max(50),
  companyAddress: z.string().trim().max(2_000),
  bankAddress: z.string().max(10_000),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320).or(z.literal('')),
  phone: z.string().trim().max(50),
  address: z.string().trim().max(2_000),
});

const invoiceItemSchema = z.object({
  id: z.string().min(1).max(100),
  description: z.string().max(2_000),
  quantity: z.coerce.number().finite().min(0).max(1_000_000),
  price: z.coerce.number().finite().min(0).max(1_000_000_000),
});

const invoiceDataSchema = z.object({
  invoiceName: z.string().max(200).optional(),
  documentTitle: z.string().max(100).optional(),
  companyName: z.string().max(200),
  companyAddress: z.string().max(2_000),
  companyEmail: z.string().max(320),
  companyPhone: z.string().max(50),
  clientName: z.string().max(200),
  clientAddress: z.string().max(2_000),
  clientEmail: z.string().max(320),
  clientPhone: z.string().max(50),
  invoiceNumber: z.string().max(100),
  issueDate: z.string().max(50),
  dueDate: z.string().max(50),
  items: z.array(invoiceItemSchema).max(500),
  currency: currencySchema,
  taxRate: z.coerce.number().finite().min(0).max(100),
  discount: z.coerce.number().finite().min(0).max(1_000_000_000),
  notes: htmlString,
  terms: htmlString,
  bankAddress: htmlString.optional(),
});

const blockTypeSchema = z.enum([
  'logo',
  'company-info',
  'client-info',
  'invoice-details',
  'items-table',
  'totals',
  'notes',
  'terms',
  'bank-details',
  'divider',
  'spacer',
  'custom-text',
  'header-split',
]);

const invoiceBlockSchema = z.object({
  id: z.string().min(1).max(100),
  type: blockTypeSchema,
  content: htmlString.optional(),
});

const invoiceSettingsSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  logoUrl: z.string().startsWith('data:image/').max(2_000_000).nullable(),
  fontFamily: z.string().max(200),
});

export const invoicePayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  data: invoiceDataSchema,
  layout: z.array(invoiceBlockSchema).max(100),
  settings: invoiceSettingsSchema,
});

export const publicInvoiceParamsSchema = z.object({
  username: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  id: z.string().uuid(),
});

export const parseBody = <T>(schema: z.Schema<T>, body: unknown) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { data: null, error: 'Invalid request body' } as const;
  }

  return { data: result.data, error: null } as const;
};
