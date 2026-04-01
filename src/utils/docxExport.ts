import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { InvoiceData, InvoiceBlock, InvoiceSettings } from '../types';
import { formatCurrency, formatDate } from './formatters';
import i18n from '../i18n';

export const generateDocx = async (data: InvoiceData, layout: InvoiceBlock[], settings: InvoiceSettings) => {
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
                      new Paragraph({
                        children: [new TextRun({ text: data.companyName || t('invoice.companyNamePlaceholder'), bold: true, size: 36, color: settings.brandColor.replace('#', '') })],
                      }),
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
                          new TextRun({ text: `${t('invoice.numberAbbr')} `, color: "666666" }),
                          new TextRun({ text: data.invoiceNumber, bold: true }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: `${t('invoice.dateAbbr')} `, color: "666666" }),
                          new TextRun({ text: formatDate(data.issueDate), bold: true }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: `${t('invoice.dueAbbr')} `, color: "666666" }),
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
            children: [new TextRun({ text: data.companyName || t('invoice.companyNamePlaceholder'), bold: true, size: 32, color: settings.brandColor.replace('#', '') })],
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
            children: [new TextRun({ text: data.clientName || t('invoice.clientNamePlaceholder'), bold: true, size: 24 })],
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
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: t('invoice.qtyAbbr'), bold: true })] })], shading: { fill: "F3F4F6" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
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
            new Paragraph({ text: notesText })
          );
        }
        break;
      }

      case 'terms': {
        const termsText = stripHtml(data.terms);
        if (termsText) {
          children.push(
            new Paragraph({ children: [new TextRun({ text: t('form.terms'), bold: true })], spacing: { before: 200, after: 100 } }),
            new Paragraph({ text: termsText })
          );
        }
        break;
      }

      case 'bank-details': {
        const bankText = stripHtml(data.bankAddress || '');
        if (bankText) {
          children.push(
            new Paragraph({ children: [new TextRun({ text: t('form.bankDetails'), bold: true })], spacing: { before: 200, after: 100 } }),
            new Paragraph({ text: bankText })
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
        if (block.content) {
          children.push(new Paragraph({ text: block.content, spacing: { before: 100, after: 100 } }));
        }
        break;

      case 'logo':
        // Note: docx image embedding requires arraybuffer or base64. 
        // For simplicity, we just put a placeholder text if there's a logo, 
        // as parsing base64 to buffer for docx is complex.
        if (settings.logoUrl) {
          children.push(new Paragraph({ text: `[${i18n.t('invoice.logoPlaceholder')}]`, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }));
        }
        break;
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }]
  });

  const blob = await Packer.toBlob(doc);
  const docTitle = data.documentTitle || t('invoice.defaultTitle');
  saveAs(blob, `${docTitle}_${data.invoiceNumber || 'Borrador'}.docx`);
};
