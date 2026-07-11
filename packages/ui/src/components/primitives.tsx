import * as React from 'react';
import { cn } from '../cn';

/* ---------------- Container ---------------- */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-container px-5 sm:px-6 lg:px-8', className)}>{children}</div>;
}

/* ---------------- Section ---------------- */
export function Section({
  className,
  tone = 'default',
  children,
}: {
  className?: string;
  tone?: 'default' | 'muted' | 'ink';
  children: React.ReactNode;
}) {
  const tones = {
    default: 'bg-white text-neutral-900',
    muted: 'bg-neutral-50 text-neutral-900',
    ink: 'bg-ink text-white',
  } as const;
  return <section className={cn('py-16 md:py-24', tones[tone], className)}>{children}</section>;
}

/* ---------------- Button (link or button) ---------------- */
type ButtonProps = {
  href?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

export function Button({ href, variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-btn font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
  const sizes = { md: 'h-11 px-5 text-sm', lg: 'h-13 px-7 text-base' } as const;
  const variants = {
    primary: 'bg-primary text-white shadow-cta hover:bg-primary-dark',
    secondary: 'bg-white text-ink border border-neutral-300 hover:border-primary hover:text-primary',
    ghost: 'text-white/90 border border-white/25 hover:bg-white/10',
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
    <div className={cn('rounded-card border border-neutral-200 bg-white p-6 shadow-card', className)}>{children}</div>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary',
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
    <div className="text-center sm:text-left">
      <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-sm text-neutral-600">{label}</div>
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
      className="group block rounded-card border border-neutral-200 bg-white p-6 shadow-card transition hover:border-primary/40 hover:shadow-cta"
    >
      <div className="text-xs font-bold uppercase tracking-widest text-accent-dark">{eyebrow}</div>
      <h3 className="mt-2 text-lg font-bold text-ink group-hover:text-primary">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">{outcome}</p>
      <span className="mt-4 inline-block text-sm font-semibold text-primary">Read case study →</span>
    </a>
  );
}
