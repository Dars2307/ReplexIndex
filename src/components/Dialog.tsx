import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './ui.tsx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Hide the visible header (e.g. command palette). The title is still announced. */
  bare?: boolean;
  position?: 'center' | 'top';
}

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', bare, position = 'center' }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => {
      const el = panel.current;
      if (!el) return;
      const target = el.querySelector<HTMLElement>('[data-autofocus]') || el.querySelector<HTMLElement>(FOCUSABLE) || el;
      target.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-50 flex justify-center p-4', position === 'top' ? 'items-start pt-[12vh]' : 'items-end sm:items-center')}>
          <motion.div
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className={cn(
              'relative flex max-h-[min(85vh,720px)] w-full flex-col overflow-hidden rounded-xl border border-border bg-elevated shadow-lg surface-highlight outline-none',
              'overscroll-contain',
              size === 'sm' && 'max-w-md',
              size === 'md' && 'max-w-lg',
              size === 'lg' && 'max-w-2xl',
            )}
          >
            {bare ? (
              <h2 id={titleId} className="sr-only">
                {title}
              </h2>
            ) : (
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <h2 id={titleId} className="text-base font-semibold text-fg">
                    {title}
                  </h2>
                  {description && (
                    <p id={descId} className="mt-1 text-fg-muted">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-sm text-fg-subtle hover:bg-muted hover:text-fg pointer-coarse:size-11"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            )}
            <div className={cn('min-h-0 flex-1 overflow-y-auto scrollbar-thin', !bare && 'px-5 py-4')}>{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface/50 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
