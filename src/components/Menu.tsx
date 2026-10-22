import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { cn } from './ui.tsx';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hint?: string;
}

interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void; id: string; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode;
  items: (MenuItem | 'separator')[];
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
  header?: ReactNode;
}

export function Menu({ trigger, items, align = 'end', side = 'bottom', header }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        (root.current?.querySelector('[aria-haspopup]') as HTMLElement | null)?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onListKey = (e: ReactKeyboardEvent) => {
    const nodes = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
    const i = nodes.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nodes[(i + 1) % nodes.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nodes[(i - 1 + nodes.length) % nodes.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      nodes[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      nodes[nodes.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id, 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={list}
            role="menu"
            aria-labelledby={id}
            onKeyDown={onListKey}
            initial={{ opacity: 0, scale: 0.97, y: side === 'bottom' ? -4 : 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${side === 'bottom' ? 'top' : 'bottom'} ${align === 'end' ? 'right' : 'left'}` }}
            className={cn(
              'absolute z-40 min-w-52 rounded-lg border border-border bg-elevated p-1 shadow-lg surface-highlight',
              align === 'end' ? 'right-0' : 'left-0',
              side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
            )}
          >
            {header && <div className="border-b border-border px-2 pb-2 pt-1.5 mb-1">{header}</div>}
            {items.map((item, i) =>
              item === 'separator' ? (
                <div key={`sep-${i}`} role="separator" className="-mx-1 my-1 h-px bg-border" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    'flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm outline-none pointer-coarse:h-11',
                    item.danger ? 'text-danger focus:soft-danger hover:soft-danger' : 'text-fg hover:bg-muted focus:bg-muted',
                  )}
                >
                  {item.icon && <span className="text-fg-muted [&>svg]:size-4">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.hint && <span className="text-[12px] text-fg-subtle">{item.hint}</span>}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
