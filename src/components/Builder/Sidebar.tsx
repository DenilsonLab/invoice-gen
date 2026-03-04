import React, { useState } from 'react';
import { useBuilder } from '../../context/BuilderContext';
import DraggableItem from './DraggableItem';
import { 
  Building2, User, FileText, Table, Calculator, 
  AlignLeft, Type, Minus, ArrowDownUp, Image as ImageIcon,
  Palette, Settings2
} from 'lucide-react';
import InvoiceForm from '../InvoiceForm';

export default function Sidebar() {
  const { settings, setSettings, data, setData } = useBuilder();
  const [activeTab, setActiveTab] = useState<'elements' | 'data' | 'design'>('elements');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full lg:w-[350px] xl:w-[400px] flex-shrink-0 bg-white border-r border-gray-200 h-[calc(100vh-4rem)] overflow-y-auto print:hidden flex flex-col">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
        <button 
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'elements' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('elements')}
        >
          Elementos
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('data')}
        >
          Datos
        </button>
        <button 
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'design' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('design')}
        >
          Diseño
        </button>
      </div>

      <div className="p-6 flex-grow overflow-y-auto">
        
        {/* Elements Tab */}
        {activeTab === 'elements' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bloques Estructurales</h3>
              <div className="grid grid-cols-1 gap-2">
                <DraggableItem type="header-split" label="Cabecera Dividida" icon={<AlignLeft size={16} />} />
                <DraggableItem type="company-info" label="Info. Empresa" icon={<Building2 size={16} />} />
                <DraggableItem type="client-info" label="Info. Cliente" icon={<User size={16} />} />
                <DraggableItem type="invoice-details" label="Detalles Factura" icon={<FileText size={16} />} />
                <DraggableItem type="items-table" label="Tabla de Artículos" icon={<Table size={16} />} />
                <DraggableItem type="totals" label="Totales" icon={<Calculator size={16} />} />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Elementos Adicionales</h3>
              <div className="grid grid-cols-1 gap-2">
                <DraggableItem type="logo" label="Logo Independiente" icon={<ImageIcon size={16} />} />
                <DraggableItem type="notes" label="Notas" icon={<AlignLeft size={16} />} />
                <DraggableItem type="terms" label="Términos" icon={<AlignLeft size={16} />} />
                <DraggableItem type="custom-text" label="Texto Libre" icon={<Type size={16} />} />
                <DraggableItem type="divider" label="Separador" icon={<Minus size={16} />} />
                <DraggableItem type="spacer" label="Espacio" icon={<ArrowDownUp size={16} />} />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">
                Arrastra estos elementos hacia el lienzo de la derecha para construir tu factura.
              </p>
            </div>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <InvoiceForm data={data} onChange={setData} />
          </div>
        )}

        {/* Design Tab */}
        {activeTab === 'design' && (
          <div className="space-y-8">
            
            {/* Logo Upload */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <ImageIcon size={16} className="text-gray-400" />
                Logo de la Empresa
              </h3>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para subir</span> o arrastra</p>
                    <p className="text-xs text-gray-500">PNG, JPG o SVG (Max. 2MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
              </div>
              {settings.logoUrl && (
                <div className="mt-4 flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <img src={settings.logoUrl} alt="Logo preview" className="h-10 object-contain" />
                  <button 
                    onClick={() => setSettings({ ...settings, logoUrl: null })}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </section>

            <hr className="border-gray-100" />

            {/* Brand Color */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Palette size={16} className="text-gray-400" />
                Color de Marca
              </h3>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  value={settings.brandColor}
                  onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
                  className="w-12 h-12 p-1 rounded-lg cursor-pointer border border-gray-200"
                />
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={settings.brandColor}
                    onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-mono uppercase"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                {['#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#9333ea', '#000000', '#475569'].map(color => (
                  <button
                    key={color}
                    onClick={() => setSettings({ ...settings, brandColor: color })}
                    className={`w-6 h-6 rounded-full border-2 ${settings.brandColor === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'} transition-transform`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Typography */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Type size={16} className="text-gray-400" />
                Tipografía
              </h3>
              <select 
                value={settings.fontFamily}
                onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm bg-white"
              >
                <option value="Inter, sans-serif">Inter (Moderno)</option>
                <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica (Clásico)</option>
                <option value="'Georgia', serif">Georgia (Elegante)</option>
                <option value="'Courier New', Courier, monospace">Courier (Técnico)</option>
              </select>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
