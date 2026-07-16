import * as React from 'react';
import { cn } from '../cn';

/* ---------------- Container ---------------- */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-container px-5 sm:px-6 lg:px-8', className)}>{children}</div>;
}

/* ---------------- Section (alternating light / dark) ----------------
 * Dark tones: default = base navy · surface = raised panel · gradient = brand glow.
 * Light tones: light = white · lightAlt = subtle gray — for the mid-page bands.
 * Legacy tone names kept ('muted'→surface, 'ink'→base) so older pages don't break. */
export function Section({
  className,
  tone = 'default',
  children,
}: {
  className?: string;
  tone?: 'default' | 'surface' | 'gradient' | 'light' | 'lightAlt' | 'muted' | 'ink';
  children: React.ReactNode;
}) {
  const tones = {
    default: 'bg-base text-neutral-300',
    surface: 'bg-surface text-neutral-300',
    gradient: 'bg-base bg-hero-glow text-neutral-300',
    light: 'bg-white text-neutral-600',
    lightAlt: 'bg-neutral-50 text-neutral-600',
    muted: 'bg-surface text-neutral-300', // legacy alias
    ink: 'bg-base text-neutral-300', // legacy alias
  } as const;
  return <section className={cn('py-16 md:py-24', tones[tone], className)}>{children}</section>;
}

/* ---------------- Eyebrow (section kicker) ---------------- */
export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('text-xs font-semibold uppercase tracking-[0.16em] text-primary-light', className)}>
      {children}
    </div>
  );
}

/* ---------------- Button (link or button) ---------------- */
type ButtonProps = {
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  // Allow data-* passthrough (e.g. data-cta for analytics delegation).
  [dataAttr: `data-${string}`]: string | undefined;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

export function Button({ href, variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-btn font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-base';
  const sizes = { md: 'h-11 px-5 text-sm', lg: 'h-[3.25rem] px-7 text-base' } as const;
  const variants = {
    primary: 'bg-primary text-white shadow-cta hover:bg-primary-dark',
    secondary: 'border border-line-strong bg-white/[0.02] text-white hover:border-primary/60 hover:bg-white/[0.05]',
    ghost: 'text-neutral-300 hover:text-white hover:bg-white/[0.05]',
  } as const;
  const cls = cn(base, sizes[size], variants[variant], className);
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return <span className={cls}>{children}</span>;
}

/* ---------------- Card ---------------- */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-card border border-line bg-surface p-6 text-neutral-300 shadow-card', className)}>
      {children}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-light',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Metric (trust/stat tile) ---------------- */
export function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 text-center sm:text-left">
      <div className="break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl">{value}</div>
      <div className="mt-1 text-sm text-neutral-400">{label}</div>
    </div>
  );
}

/* ---------------- CaseStudyCard ---------------- */
export function CaseStudyCard({
  eyebrow,
  title,
  outcome,
  href,
}: {
  eyebrow: string;
  title: string;
  outcome: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group block rounded-card border border-line bg-surface p-6 shadow-card transition hover:border-primary/40"
    >
      <div className="text-xs font-bold uppercase tracking-widest text-primary-light">{eyebrow}</div>
      <h3 className="mt-2 text-lg font-bold text-white group-hover:text-primary-light">{title}</h3>
      <p className="mt-2 text-sm text-neutral-400">{outcome}</p>
      <span className="mt-4 inline-block text-sm font-semibold text-primary-light">Read case study →</span>
    </a>
  );
}
