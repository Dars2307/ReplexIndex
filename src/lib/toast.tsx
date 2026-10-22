import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((all) => all.filter((t) => t.id !== id));

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId++;
    setToasts((all) => [...all.slice(-2), { ...t, id }]);
    setTimeout(() => dismiss(id), t.action ? 7000 : 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.14 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-elevated p-3 pr-2 shadow-lg surface-highlight"
            >
              {t.tone === 'error' ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-fg-muted">{t.description}</p>}
              </div>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="rounded-md px-2 py-1 text-[13px] font-medium text-link hover:bg-muted"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="grid size-7 place-items-center rounded-md text-fg-subtle hover:bg-muted hover:text-fg"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
