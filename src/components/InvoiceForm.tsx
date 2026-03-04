import React from 'react';
import { InvoiceData, InvoiceItem } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
}

export default function InvoiceForm({ data, onChange }: InvoiceFormProps) {
  const { layout } = useBuilder();

  const hasBlock = (types: string[]) => layout.some(b => types.includes(b.type));

  const showCompany = hasBlock(['company-info', 'header-split']);
  const showClient = hasBlock(['client-info']);
  const showDetails = hasBlock(['invoice-details', 'header-split']);
  const showItems = hasBlock(['items-table']);
  const showTotals = hasBlock(['totals']);
  const showNotes = hasBlock(['notes']);
  const showTerms = hasBlock(['terms']);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const handleQuillChange = (name: string, value: string) => {
    onChange({ ...data, [name]: value });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: parseFloat(value) || 0 });
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: string | number) => {
    const newItems = data.items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...data, items: newItems });
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      price: 0,
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const removeItem = (id: string) => {
    onChange({ ...data, items: data.items.filter(item => item.id !== id) });
  };

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'code'],
      ['code-block']
    ],
  };

  return (
    <div className="space-y-8">

      {/* Company Details */}
      {showCompany && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Detalles de tu Empresa</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Título del Documento</label>
              <input type="text" name="documentTitle" value={data.documentTitle || 'Factura'} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Nombre de la Empresa</label>
              <input type="text" name="companyName" value={data.companyName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Email</label>
              <input type="email" name="companyEmail" value={data.companyEmail} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Teléfono</label>
              <input type="tel" name="companyPhone" value={data.companyPhone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Dirección</label>
              <textarea name="companyAddress" value={data.companyAddress} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm resize-none" />
            </div>
          </div>
        </section>
      )}

      {showCompany && (showClient || showDetails || showItems || showTotals || showNotes || showTerms) && <hr className="border-gray-100" />}

      {/* Client Details */}
      {showClient && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Detalles del Cliente</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Nombre del Cliente</label>
              <input type="text" name="clientName" value={data.clientName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Email del Cliente</label>
              <input type="email" name="clientEmail" value={data.clientEmail} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Teléfono del Cliente</label>
              <input type="tel" name="clientPhone" value={data.clientPhone || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Dirección del Cliente</label>
              <textarea name="clientAddress" value={data.clientAddress} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm resize-none" />
            </div>
          </div>
        </section>
      )}

      {showClient && (showDetails || showItems || showTotals || showNotes || showTerms) && <hr className="border-gray-100" />}

      {/* Invoice Details */}
      {showDetails && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Detalles de la Factura</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Número de Factura</label>
              <input type="text" name="invoiceNumber" value={data.invoiceNumber} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Fecha de Emisión</label>
              <input type="date" name="issueDate" value={data.issueDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Fecha de Vencimiento</label>
              <input type="date" name="dueDate" value={data.dueDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
            </div>
          </div>
        </section>
      )}

      {showDetails && (showItems || showTotals || showNotes || showTerms) && <hr className="border-gray-100" />}

      {/* Items */}
      {showItems && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Artículos</h3>
          </div>

          <div className="space-y-4">
            {data.items.map((item) => (
              <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-3 relative">
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Eliminar artículo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="pr-8">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Descripción</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    placeholder="Descripción del artículo"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Cantidad</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      placeholder="Cant."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">Precio</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Precio"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addItem}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus size={16} />
            Agregar Artículo
          </button>
        </section>
      )}

      {showItems && (showTotals || showNotes || showTerms) && <hr className="border-gray-100" />}

      {/* Totals & Settings */}
      {(showTotals || showNotes || showTerms) && (
        <section>
          <div className="grid grid-cols-1 gap-8">
            {(showNotes || showTerms) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Notas y Términos</h3>
                {showNotes && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Notas Adicionales</label>
                    <ReactQuill
                      theme="snow"
                      value={data.notes}
                      onChange={(value) => handleQuillChange('notes', value)}
                      modules={quillModules}
                      className="bg-white rounded-lg"
                    />
                  </div>
                )}
                {showTerms && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Términos y Condiciones</label>
                    <ReactQuill
                      theme="snow"
                      value={data.terms}
                      onChange={(value) => handleQuillChange('terms', value)}
                      modules={quillModules}
                      className="bg-white rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}

            {showTotals && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Configuración de Totales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Moneda</label>
                    <select name="currency" value={data.currency} onChange={handleChange as any} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm bg-white">
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="MXN">MXN ($)</option>
                      <option value="ARS">ARS ($)</option>
                      <option value="COP">COP ($)</option>
                      <option value="CLP">CLP ($)</option>
                      <option value="PEN">PEN (S/)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Impuesto (%)</label>
                    <input type="number" name="taxRate" value={data.taxRate} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Descuento</label>
                    <input type="number" name="discount" value={data.discount} onChange={handleNumberChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {!showCompany && !showClient && !showDetails && !showItems && !showTotals && !showNotes && !showTerms && (
        <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-sm">
          Agrega bloques al lienzo para habilitar los campos de datos.
        </div>
      )}

    </div>
  );
}
