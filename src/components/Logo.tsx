import logoUrl from '../assets/Invoice Gen Logo.webp';
import isoUrl from '../assets/Invoice Gen Iso.webp';

interface LogoProps {
  /** 'full' shows the wordmark logo; 'iso' shows the square isotype. */
  variant?: 'full' | 'iso';
  className?: string;
  alt?: string;
}

/**
 * Brand logo. Centralizes the asset so headers, navbars and the loading
 * screen all render the same image.
 */
export default function Logo({ variant = 'full', className, alt = 'InvoiceGen Pro' }: LogoProps) {
  return (
    <img
      src={variant === 'iso' ? isoUrl : logoUrl}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}
