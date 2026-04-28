import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { InvoiceData } from '../types';
import i18n from '../i18n';

export const generatePdf = async (data: InvoiceData) => {
  const element = document.getElementById('invoice-canvas');

  if (!element) {
    throw new Error('No se encontró el elemento de la factura para exportar.');
  }

  // Configuración del nombre del archivo
  const t = i18n.t;
  const defaultFilename = `${data.documentTitle || t('invoice.defaultTitle')}_${data.invoiceNumber || t('invoice.draft')}`;
  const filename = data.invoiceName ? `${data.invoiceName.replace(/\s+/g, '-')}.pdf` : `${defaultFilename.replace(/\s+/g, '-')}.pdf`;

  try {
    // Generar imagen PNG del elemento
    // Usamos un factor de escala para mejorar la calidad
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2, // Mayor resolución
      style: {
        boxShadow: 'none',
        margin: '0',
        transform: 'none',
      }
    });

    // Crear PDF (A4, portrait, mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Dimensiones A4 en mm
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Dimensiones del elemento original
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;

    // Calcular el ratio para mantener la proporción
    const ratio = Math.min(pdfWidth / elementWidth, pdfHeight / elementHeight);

    // Dimensiones finales en el PDF
    const imgWidth = elementWidth * ratio;
    const imgHeight = elementHeight * ratio;

    // Centrar horizontalmente si es necesario
    const marginX = (pdfWidth - imgWidth) / 2;
    // Margen superior
    const marginY = 0;

    // Añadir imagen al PDF
    pdf.addImage(dataUrl, 'PNG', marginX, marginY, imgWidth, imgHeight);

    // Descargar el PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    throw error;
  }
};
