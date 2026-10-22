import { Check, Copy, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import {
  forwardRef,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

// Later classes win over earlier conflicting ones (e.g. px-0 over px-3).
export function cn(...parts: (string | false | null | undefined)[]) {
  return twMerge(parts.filter(Boolean).join(' '));
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-90 active:opacity-80',
  accent: 'bg-accent text-accent-fg hover:brightness-110 active:brightness-95',
  secondary: 'border border-border-strong bg-surface text-fg shadow-sm hover:bg-muted active:bg-muted-strong',
  ghost: 'text-fg-muted hover:bg-muted hover:text-fg active:bg-muted-strong',
  danger: 'border border-border-strong bg-surface text-danger hover:soft-danger',
};
const SIZES: Record<Size, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-[13px] rounded-sm',
  md: 'h-8 gap-2 px-3 text-sm rounded-sm',
  lg: 'h-10 gap-2 px-4 text-sm rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,color,opacity,filter,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 pointer-coarse:min-h-11',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'icon'> & { label: string }>(function IconButton(
  { label, className, size = 'md', variant = 'ghost', children, ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      variant={variant}
      size={size}
      className={cn(size === 'sm' ? 'w-7 px-0' : size === 'lg' ? 'w-10 px-0' : 'w-8 px-0', 'pointer-coarse:min-w-11', className)}
      {...rest}
    >
      {children}
    </Button>
  );
});

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-8 w-full min-w-0 rounded-sm border border-input bg-surface px-2.5 text-sm text-fg shadow-sm placeholder:text-fg-subtle',
        'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25 pointer-coarse:h-11',
        'disabled:opacity-60 aria-[invalid=true]:border-danger',
        className,
      )}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-20 w-full rounded-sm border border-input bg-surface px-2.5 py-2 text-sm text-fg shadow-sm placeholder:text-fg-subtle',
        'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25',
        className,
      )}
      {...rest}
    />
  );
});

export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: string; error?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-[13px] text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------
type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-fg-muted',
  accent: 'soft-accent',
  success: 'soft-success',
  warning: 'soft-warning',
  danger: 'soft-danger',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-xs px-1.5 text-[12px] font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border-strong bg-surface px-1 font-mono text-[11px] text-fg-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />;
}

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface shadow-sm surface-highlight', className)} {...rest}>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
      <div className="mb-4 grid size-10 place-items-center rounded-lg border border-border bg-surface text-fg-muted shadow-sm">{icon}</div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-fg-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <p className="flex-1 text-fg-muted">
        <span className="font-medium text-danger">Couldn’t load this. </span>
        {message}
      </p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Avatar({ src, alt, size = 24, square = false }: { src?: string | null; alt: string; size?: number; square?: boolean }) {
  return (
    <img
      src={src || undefined}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={cn('shrink-0 bg-muted object-cover', square ? 'rounded-[25%]' : 'rounded-full')}
      style={{ width: size, height: size }}
    />
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-fg outline-none">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-8 items-center rounded-sm border border-border bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-full rounded-xs px-2.5 text-[13px] font-medium transition-colors pointer-coarse:px-3.5',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          window.getSelection()?.selectAllChildren(document.activeElement?.parentElement ?? document.body);
        }
      }}
      aria-label={copied ? 'Copied' : label}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm px-2 text-[12px] font-medium text-fg-muted hover:bg-muted hover:text-fg pointer-coarse:h-11',
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}

export function CodeBlock({ code, label, className }: { code: string; label?: string; className?: string }) {
  return (
    <div className={cn('group relative rounded-md border border-border bg-bg', className)}>
      {label && <div className="border-b border-border px-3 py-1.5 text-[12px] font-medium text-fg-subtle">{label}</div>}
      <pre className="overflow-x-auto p-3 pr-20 font-mono text-[12.5px] leading-5 text-fg scrollbar-thin" translate="no">
        <code>{code}</code>
      </pre>
      <CopyButton value={code} className={cn('absolute right-1.5', label ? 'top-9' : 'top-1.5')} />
    </div>
  );
}

export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  // Unique per instance: a gradient defined inside a display:none subtree
  // (e.g. the sidebar on phones) cannot be referenced by visible copies.
  const gradientId = `replex-mark-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B7CFF" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <path
        d="M11 23.5V8.5h6.25a4.75 4.75 0 0 1 0 9.5H11m6.5 0 4 4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.6" cy="23.1" r="2.1" fill="#fff" />
    </svg>
  );
}
