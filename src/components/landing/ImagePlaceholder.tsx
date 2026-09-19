import type { FC } from 'react';
import { ImageIcon } from 'lucide-react';

interface ImagePlaceholderProps {
  /** A short label describing what image goes here (shown to you, the author). */
  label: string;
  /** Optional recommended dimensions hint, e.g. "1200×800". */
  hint?: string;
  /** If provided, renders this image instead of the placeholder. */
  src?: string;
  alt?: string;
  className?: string;
}

/**
 * A labelled image slot for the landing page.
 *
 * While you don't have final artwork, this renders a clean dashed placeholder
 * describing the intended image. To use a real image later, pass `src` (e.g.
 * import it from src/assets or reference a file in /public) and the placeholder
 * disappears automatically.
 */
const ImagePlaceholder: FC<ImagePlaceholderProps> = ({ label, hint, src, alt, className }) => {
  if (src) {
    return <img src={src} alt={alt ?? label} className={className} loading="lazy" />;
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-200 bg-white/60 p-6 text-center ${className ?? ''}`}
      role="img"
      aria-label={label}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
        <ImageIcon size={20} />
      </span>
      <span className="text-sm font-semibold text-brand-900">{label}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
};

export default ImagePlaceholder;
