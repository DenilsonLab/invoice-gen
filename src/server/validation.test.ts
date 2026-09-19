import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  profileSchema,
  invoicePayloadSchema,
  publicInvoiceParamsSchema,
  googleUserInfoSchema,
  parseBody,
} from './validation.js';

const validInvoicePayload = () => ({
  title: 'Invoice INV-0001',
  data: {
    companyName: 'Acme',
    companyAddress: 'Street 1',
    companyEmail: 'billing@acme.com',
    companyPhone: '555',
    clientName: 'Client',
    clientAddress: 'Ave 2',
    clientEmail: 'client@x.com',
    clientPhone: '666',
    invoiceNumber: 'INV-0001',
    issueDate: '2026-01-01',
    dueDate: '2026-01-15',
    items: [{ id: '1', description: 'Work', quantity: 2, price: 100 }],
    currency: 'USD',
    taxRate: 10,
    discount: 0,
    notes: '<p>thanks</p>',
    terms: '<p>net 15</p>',
  },
  layout: [{ id: 'b1', type: 'items-table' }],
  settings: {
    brandColor: '#2563eb',
    logoUrl: null,
    fontFamily: 'Inter',
  },
});

describe('registerSchema', () => {
  it('accepts a valid registration and normalizes email', () => {
    const r = registerSchema.safeParse({ email: '  User@Example.COM ', password: 'password1', firstName: 'A', lastName: 'B' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe('user@example.com');
  });

  it('rejects short passwords', () => {
    expect(registerSchema.safeParse({ email: 'a@b.com', password: 'short', firstName: 'A', lastName: 'B' }).success).toBe(false);
  });

  it('rejects invalid emails', () => {
    expect(registerSchema.safeParse({ email: 'not-an-email', password: 'password1', firstName: 'A', lastName: 'B' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts any non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });
  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  const base = {
    firstName: 'A', lastName: 'B', username: 'user_1', preferredCurrency: 'USD',
    companyName: 'Acme', companyEmail: '', companyPhone: '', companyAddress: '', bankAddress: '',
  };

  it('accepts a valid profile without a logo', () => {
    expect(profileSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a data:image companyLogo and allows null', () => {
    expect(profileSchema.safeParse({ ...base, companyLogo: 'data:image/png;base64,AAAA' }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, companyLogo: null }).success).toBe(true);
  });

  it('rejects a companyLogo that is not a data:image URI', () => {
    expect(profileSchema.safeParse({ ...base, companyLogo: 'https://evil/x.png' }).success).toBe(false);
  });

  it('rejects usernames with invalid characters', () => {
    expect(profileSchema.safeParse({ ...base, username: 'has space' }).success).toBe(false);
  });

  it('rejects an unsupported currency', () => {
    expect(profileSchema.safeParse({ ...base, preferredCurrency: 'JPY' }).success).toBe(false);
  });
});

describe('invoicePayloadSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(invoicePayloadSchema.safeParse(validInvoicePayload()).success).toBe(true);
  });

  it('sanitizes rich-text fields via transform', () => {
    const payload = validInvoicePayload();
    payload.data.notes = '<p>ok</p><script>alert(1)</script>';
    const r = invoicePayloadSchema.safeParse(payload);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.data.notes).toBe('<p>ok</p>');
  });

  it('rejects an invalid brandColor', () => {
    const payload = validInvoicePayload();
    payload.settings.brandColor = 'blue';
    expect(invoicePayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects a logoUrl that is not a data:image URI', () => {
    const payload = validInvoicePayload();
    (payload.settings as any).logoUrl = 'https://evil/x.png';
    expect(invoicePayloadSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects an unknown block type', () => {
    const payload = validInvoicePayload();
    (payload.layout as any)[0].type = 'not-a-block';
    expect(invoicePayloadSchema.safeParse(payload).success).toBe(false);
  });
});

describe('publicInvoiceParamsSchema', () => {
  it('accepts a valid username and uuid', () => {
    expect(publicInvoiceParamsSchema.safeParse({ username: 'acme_1', id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }).success).toBe(true);
  });
  it('rejects a non-uuid id', () => {
    expect(publicInvoiceParamsSchema.safeParse({ username: 'acme', id: 'nope' }).success).toBe(false);
  });
});

describe('googleUserInfoSchema', () => {
  it('defaults missing names to empty strings', () => {
    const r = googleUserInfoSchema.safeParse({ id: 'g1', email: 'a@b.com' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.given_name).toBe('');
      expect(r.data.family_name).toBe('');
    }
  });
  it('rejects a missing email', () => {
    expect(googleUserInfoSchema.safeParse({ id: 'g1' }).success).toBe(false);
  });
});

describe('parseBody', () => {
  it('returns data on success and null error', () => {
    const r = parseBody(loginSchema, { email: 'a@b.com', password: 'x' });
    expect(r.error).toBeNull();
    expect(r.data).not.toBeNull();
  });
  it('returns a generic error on failure and null data', () => {
    const r = parseBody(loginSchema, { email: 'bad' });
    expect(r.data).toBeNull();
    expect(r.error).toBe('Invalid request body');
  });
});
