import { saveAs } from 'file-saver';
import { InvoiceData, InvoiceBlock, InvoiceSettings } from '../types';
import { formatCurrency, formatDate } from './formatters';
import i18n from '../i18n';

// docx only supports these raster formats for embedding. SVG needs a fallback
// image, which we don't have, so it is excluded and rendered as a placeholder.
type DocxImageType = 'png' | 'jpg' | 'gif' | 'bmp';

const MIME_TO_DOCX_TYPE: Record<string, DocxImageType> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
};

// Max logo size inside the document, in points (docx transformation units).
const MAX_LOGO_WIDTH = 160;
const MAX_LOGO_HEIGHT = 80;

/** Parse a `data:image/...;base64,...` URI into its docx type and raw bytes. */
const parseImageDataUrl = (dataUrl: string): { type: DocxImageType; bytes: Uint8Array } | null => {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;

  const [, mime, isBase64, payload] = match;
  const docxType = MIME_TO_DOCX_TYPE[mime.toLowerCase()];
  if (!docxType || !isBase64) return null;

  try {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { type: docxType, bytes };
  } catch {
    return null;
  }
};

/** Load the image to get its natural dimensions, then scale to fit the logo box. */
const getScaledLogoSize = (dataUrl: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const fallback = { width: MAX_LOGO_WIDTH, height: MAX_LOGO_HEIGHT };
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return resolve(fallback);
      const ratio = Math.min(MAX_LOGO_WIDTH / w, MAX_LOGO_HEIGHT / h, 1);
      resolve({ width: Math.round(w * ratio), height: Math.round(h * ratio) });
    };
    img.onerror = () => resolve(fallback);
    img.src = dataUrl;
  });

interface DecodedLogo {
  type: DocxImageType;
  bytes: Uint8Array;
  width: number;
  height: number;
}

/** Decode a logo data URI into embeddable bytes + scaled size, or null. */
const buildLogoImage = async (logoUrl: string): Promise<DecodedLogo | null> => {
  const parsed = parseImageDataUrl(logoUrl);
  if (!parsed) return null;

  const { width, height } = await getScaledLogoSize(logoUrl);
  return { type: parsed.type, bytes: parsed.bytes, width, height };
};

export const generateDocx = async (data: InvoiceData, layout: InvoiceBlock[], settings: InvoiceSettings) => {
  // Lazy load docx library only when needed (reduces initial bundle by ~1MB)
  const docxModule = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, ImageRun } = docxModule;
  const t = i18n.t;
  const children: any[] = [];

  // Elimina etiquetas HTML del contenido generado por Quill para texto plano
  const stripHtml = (html: string): string => {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  };

  const createSpacer = () => new Paragraph({ text: "", spacing: { before: 200, after: 200 } });

  // Build a paragraph from plain text, turning newlines into real line breaks.
  // docx ignores "\n" inside a paragraph's text, so each line becomes a TextRun
  // and subsequent lines get a leading break.
  const paragraphFromText = (text: string, options: Record<string, any> = {}) => {
    const lines = text.split('\n');
    const runs = lines.map((line, i) =>
      new TextRun(i === 0 ? { text: line } : { text: line, break: 1 })
    );
    return new Paragraph({ children: runs, ...options });
  };

  // Decode the logo once. A fresh ImageRun instance must be created per usage
  // (docx does not allow reusing the same run in multiple places), so we cache
  // the decoded bytes/size and expose a factory.
  const logoImage = settings.logoUrl ? await buildLogoImage(settings.logoUrl) : null;
  const makeLogoRun = () =>
    logoImage
      ? new ImageRun({ type: logoImage.type, data: logoImage.bytes, transformation: { width: logoImage.width, height: logoImage.height } })
      : null;

  for (const block of layout) {
    switch (block.type) {
      case 'header-split':
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      // Match the on-screen renderer: show the logo instead of
                      // the company name when a logo is set.
                      (() => {
                        const logoRun = makeLogoRun();
                        return logoRun
                          ? new Paragraph({ children: [logoRun] })
                          : new Paragraph({
                              children: [new TextRun({ text: data.companyName || t('invoice.defaultCompanyName'), bold: true, size: 36, color: settings.brandColor.replace('#', '') })],
                            });
                      })(),
                      new Paragraph({ text: data.companyAddress || '', spacing: { before: 100 } }),
                      new Paragraph({ text: data.companyEmail || '' }),
                      new Paragraph({ text: data.companyPhone || '' }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: noBorders,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: (data.documentTitle || t('invoice.defaultTitle')).toUpperCase(), bold: true, size: 48, color: "CCCCCC" })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        spacing: { before: 200 },
                        children: [
                          new TextRun({ text: `${t('invoice.number')} `, color: "666666" }),
                          new TextRun({ text: data.invoiceNumber, bold: true }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: `${t('invoice.date')} `, color: "666666" }),
                          new TextRun({ text: formatDate(data.issueDate), bold: true }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: `${t('invoice.dueDate')} `, color: "666666" }),
                          new TextRun({ text: formatDate(data.dueDate), bold: true }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
        break;

      case 'company-info':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: data.companyName || t('invoice.defaultCompanyName'), bold: true, size: 32, color: settings.brandColor.replace('#', '') })],
          }),
          new Paragraph({ text: data.companyAddress || '', spacing: { before: 100 } }),
          new Paragraph({ text: data.companyEmail || '' }),
          new Paragraph({ text: data.companyPhone || '' })
        );
        break;

      case 'client-info':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: t('invoice.billTo').toUpperCase(), bold: true, size: 20, color: "888888" })],
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: data.clientName || t('invoice.defaultClientName'), bold: true, size: 24 })],
          }),
          new Paragraph({ text: data.clientAddress || '', spacing: { before: 100 } }),
          new Paragraph({ text: data.clientEmail || '' }),
          new Paragraph({ text: data.clientPhone || '' })
        );
        break;

      case 'invoice-details':
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorders,
                    children: [
                      new Paragraph({ children: [new TextRun({ text: t('form.invoiceNumber').toUpperCase(), bold: true, size: 20, color: "888888" })] }),
                      new Paragraph({ children: [new TextRun({ text: data.invoiceNumber, bold: true })], spacing: { before: 50 } }),
                    ]
                  }),
                  new TableCell({
                    borders: noBorders,
                    children: [
                      new Paragraph({ children: [new TextRun({ text: t('form.issueDate').toUpperCase(), bold: true, size: 20, color: "888888" })] }),
                      new Paragraph({ children: [new TextRun({ text: formatDate(data.issueDate), bold: true })], spacing: { before: 50 } }),
                    ]
                  }),
                  new TableCell({
                    borders: noBorders,
                    children: [
                      new Paragraph({ children: [new TextRun({ text: t('form.dueDate').toUpperCase(), bold: true, size: 20, color: "888888" })] }),
                      new Paragraph({ children: [new TextRun({ text: formatDate(data.dueDate), bold: true })], spacing: { before: 50 } }),
                    ]
                  }),
                ]
              })
            ]
          })
        );
        break;

      case 'items-table':
        const tableRows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('form.description'), bold: true })] })], shading: { fill: "F3F4F6" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: t('invoice.qty'), bold: true })] })], shading: { fill: "F3F4F6" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: t('form.price'), bold: true })] })], shading: { fill: "F3F4F6" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: t('invoice.total'), bold: true })] })], shading: { fill: "F3F4F6" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            ],
          })
        ];

        data.items.forEach(item => {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: item.description || '-' })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: item.quantity.toString() })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: formatCurrency(item.price, data.currency) })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
                new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency((Number(item.quantity) || 0) * (Number(item.price) || 0), data.currency), bold: true })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
              ]
            })
          );
        });

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          })
        );
        break;

      case 'totals':
        const subtotal = (data.items || []).reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
        const taxAmount = subtotal * ((Number(data.taxRate) || 0) / 100);
        const total = subtotal + taxAmount - (Number(data.discount) || 0);

        const totalsRows = [
          new TableRow({
            children: [
              new TableCell({ borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: t('invoice.subtotal') })] }),
              new TableCell({ borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: formatCurrency(subtotal, data.currency) })] }),
            ]
          })
        ];

        if (data.taxRate > 0) {
          totalsRows.push(
            new TableRow({
              children: [
                new TableCell({ borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: `${t('invoice.tax')} (${data.taxRate}%)` })] }),
                new TableCell({ borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: formatCurrency(taxAmount, data.currency) })] }),
              ]
            })
          );
        }

        if (data.discount > 0) {
          totalsRows.push(
            new TableRow({
              children: [
                new TableCell({ borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: t('form.discount') })] }),
                new TableCell({ borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `-${formatCurrency(data.discount, data.currency)}`, color: "FF0000" })] })] }),
              ]
            })
          );
        }

        totalsRows.push(
          new TableRow({
            children: [
              new TableCell({ borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: t('invoice.total'), bold: true, size: 28 })] })], margins: { top: 200 } }),
              new TableCell({ borders: noBorders, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatCurrency(total, data.currency), bold: true, size: 28 })] })], margins: { top: 200 } }),
            ]
          })
        );

        children.push(
          new Table({
            width: { size: 50, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.RIGHT,
            borders: noBorders,
            rows: totalsRows,
          })
        );
        break;

      case 'notes': {
        const notesText = stripHtml(data.notes);
        if (notesText) {
          children.push(
            new Paragraph({ children: [new TextRun({ text: t('form.additionalNotes'), bold: true })], spacing: { before: 200, after: 100 } }),
            paragraphFromText(notesText)
          );
        }
        break;
      }

      case 'terms': {
        const termsText = stripHtml(data.terms);
        if (termsText) {
          children.push(
            new Paragraph({ children: [new TextRun({ text: t('form.terms'), bold: true })], spacing: { before: 200, after: 100 } }),
            paragraphFromText(termsText)
          );
        }
        break;
      }

      case 'bank-details': {
        const bankText = stripHtml(data.bankAddress || '');
        if (bankText) {
          children.push(
            new Paragraph({ children: [new TextRun({ text: t('form.bankDetails'), bold: true })], spacing: { before: 200, after: 100 } }),
            paragraphFromText(bankText)
          );
        }
        break;
      }

      case 'divider':
        children.push(
          new Paragraph({
            border: { bottom: { color: "EEEEEE", space: 1, style: BorderStyle.SINGLE, size: 6 } },
            spacing: { before: 200, after: 200 }
          })
        );
        break;

      case 'spacer':
        children.push(createSpacer());
        break;

      case 'custom-text':
        const customText = stripHtml(block.content || '');
        if (customText) {
          children.push(paragraphFromText(customText, { spacing: { before: 100, after: 100 } }));
        }
        break;

      case 'logo': {
        if (!settings.logoUrl) break;

        const embedded = makeLogoRun();
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            // Fall back to a text placeholder when the logo can't be embedded
            // (e.g. SVG, which docx requires a raster fallback for, or a
            // malformed data URI).
            children: [
              embedded ?? new TextRun({ text: `[${t('invoice.logoPlaceholder')}]` }),
            ],
          })
        );
        break;
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }]
  });

  const blob = await Packer.toBlob(doc);
  const defaultFilename = `${data.documentTitle || t('invoice.defaultTitle')}_${data.invoiceNumber || t('invoice.draft')}`;
  const filename = data.invoiceName ? `${data.invoiceName.replace(/\s+/g, '-')}.docx` : `${defaultFilename.replace(/\s+/g, '-')}.docx`;
  saveAs(blob, filename);
};
