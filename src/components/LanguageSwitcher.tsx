import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm">
      <Globe size={16} className="text-gray-400" />
      <select
        value={i18n.language.startsWith('en') ? 'en' : 'es'}
        onChange={handleLanguageChange}
        className="bg-transparent border-none outline-none cursor-pointer focus:ring-0 text-gray-700 font-medium font-sans"
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
