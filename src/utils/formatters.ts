import i18n from '../i18n';

export const formatCurrency = (amount: number, currency: string) => {
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  // Agregar T00:00:00 para evitar el offset UTC que desplaza el día en zonas horarias negativas
  const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};
