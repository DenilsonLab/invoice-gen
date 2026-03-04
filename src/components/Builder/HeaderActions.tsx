import React, { useEffect, useState } from 'react';
import { Printer, Download, Save, RefreshCw, FileText } from 'lucide-react';
import { useBuilder } from '../../context/BuilderContext';
import { generateDocx } from '../../utils/docxExport';
import { generatePdf } from '../../utils/pdfExport';
import { useParams, useNavigate } from 'react-router-dom';

export default function HeaderActions() {
  const { data, layout, settings, setData, setLayout, setSettings } = useBuilder();
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (id) {
      const loadInvoice = async () => {
        try {
          const res = await fetch(`/api/invoices/${id}`);
          if (res.ok) {
            const invoice = await res.json();
            setData(invoice.data);
            setLayout(invoice.layout);
            setSettings(invoice.settings);
          } else {
            alert('Error al cargar la factura.');
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Failed to load invoice', error);
        }
      };
      loadInvoice();
    }
  }, [id, setData, setLayout, setSettings, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const title = data.clientName ? `Factura - ${data.clientName}` : `Factura ${data.invoiceNumber}`;
      const payload = { title, data, layout, settings };

      let res;
      if (id) {
        res = await fetch(`/api/invoices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const savedInvoice = await res.json();
        if (!id) {
          navigate(`/builder/${savedInvoice.id}`, { replace: true });
        }
        alert('Factura guardada exitosamente.');
      } else {
        alert('Error al guardar la factura.');
      }
    } catch (error) {
      console.error('Failed to save invoice', error);
      alert('Error al guardar la factura.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDocx = async () => {
    try {
      await generateDocx(data, layout, settings);
    } catch (error) {
      console.error('Error generating DOCX:', error);
      alert('Hubo un error al generar el archivo DOCX.');
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await generatePdf(data);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el archivo PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        title="Guardar proyecto"
      >
        <Save size={16} />
        <span className="hidden sm:inline">{isSaving ? 'Guardando...' : 'Guardar'}</span>
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1"></div>

      <button 
        onClick={handleExportDocx}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
        title="Descargar Word"
      >
        <FileText size={16} />
        <span className="hidden sm:inline">Word</span>
      </button>

      <button 
        onClick={handleExportPdf}
        disabled={isExportingPdf}
        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
        title="Descargar PDF"
      >
        <Download size={16} />
        <span className="hidden sm:inline">{isExportingPdf ? 'Generando...' : 'PDF'}</span>
      </button>

      <button 
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        title="Imprimir"
      >
        <Printer size={16} />
        <span className="hidden sm:inline">Imprimir</span>
      </button>
    </div>
  );
}
