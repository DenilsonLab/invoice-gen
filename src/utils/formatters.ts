export const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  // Agregar T00:00:00 para evitar el offset UTC que desplaza el día en zonas horarias negativas
  const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};
