import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ToastType = 'success' | 'error' | 'info';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
}

interface NotifyOptions {
  type?: ToastType;
  message: string;
  /** Auto-dismiss delay in ms. Defaults to 4000. */
  duration?: number;
}

interface DialogContextType {
  /** Opens a confirmation dialog. Resolves true if confirmed, false otherwise. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Shows a transient toast notification. */
  notify: (options: NotifyOptions) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface Toast extends Required<Pick<NotifyOptions, 'message'>> {
  id: number;
  type: ToastType;
  duration: number;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const toastIcon = {
  success: <CheckCircle2 size={18} className="text-green-600" />,
  error: <XCircle size={18} className="text-red-600" />,
  info: <Info size={18} className="text-blue-600" />,
};

const toastStyles = {
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((options: NotifyOptions) => {
    const id = toastId.current++;
    const toast: Toast = {
      id,
      message: options.message,
      type: options.type ?? 'info',
      duration: options.duration ?? 4000,
    };
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => dismissToast(id), toast.duration);
  }, [dismissToast]);

  const resolveConfirm = useCallback((value: boolean) => {
    setConfirmState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  // Close the confirm dialog on Escape; focus the confirm button when it opens.
  useEffect(() => {
    if (!confirmState) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveConfirm(false);
    };
    window.addEventListener('keydown', onKeyDown);
    confirmButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmState, resolveConfirm]);

  return (
    <DialogContext.Provider value={{ confirm, notify }}>
      {children}

      {createPortal(
        <>
          {/* Confirm dialog */}
          <AnimatePresence>
            {confirmState && (
              <motion.div
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => resolveConfirm(false)}
                  aria-hidden="true"
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={confirmState.title || t('dialog.confirmTitle')}
                  className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                  initial={{ scale: 0.95, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${confirmState.danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      <AlertTriangle size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-gray-900">{confirmState.title || t('dialog.confirmTitle')}</h2>
                      <p className="mt-1 text-sm text-gray-600">{confirmState.message}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => resolveConfirm(false)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      {confirmState.cancelLabel || t('dialog.cancel')}
                    </button>
                    <button
                      ref={confirmButtonRef}
                      type="button"
                      onClick={() => resolveConfirm(true)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${confirmState.danger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
                    >
                      {confirmState.confirmLabel || t('dialog.confirm')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toasts */}
          <div className="fixed right-4 top-4 z-[110] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
            <AnimatePresence initial={false}>
              {toasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  layout
                  role="status"
                  aria-live="polite"
                  className={`flex items-start gap-3 rounded-xl border p-4 text-sm shadow-lg ${toastStyles[toast.type]}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="mt-0.5 shrink-0">{toastIcon[toast.type]}</span>
                  <p className="min-w-0 flex-1 break-words">{toast.message}</p>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={t('dialog.dismiss')}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>,
        document.body
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
