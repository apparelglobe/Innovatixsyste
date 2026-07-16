/**
 * Innovatix enterprise design system — dark-first tokens.
 * Palette locked to the brand guide: deep-navy surfaces, a single blue accent
 * family, slate neutrals, Inter type. Built for a Stripe/Vercel/Linear feel:
 * flat, high-contrast, generous whitespace, no glossy/3D, WCAG-AA.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        // ── Brand blue (CTAs, links, highlights) ──
        primary: { DEFAULT: '#2563EB', dark: '#1D4ED8', light: '#3B82F6' },
        // Accent kept in the same blue family (brand has no second hue).
        accent: { DEFAULT: '#3B82F6', dark: '#60A5FA' },
        // ── Dark surfaces ──
        base: '#0A0F1C', // primary background
        surface: '#0F172A', // cards / raised sections
        elevated: '#111827', // elevated surface (menus, popovers)
        ink: '#0A0F1C', // legacy alias → primary background
        line: 'rgba(148,163,184,0.14)', // hairline border on dark
        'line-strong': 'rgba(148,163,184,0.24)',
        // ── Slate ramp (Slate #0F172A / Steel #334155 / Light Gray #94A3B8 / White #F8FAFC) ──
        neutral: {
          50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1',
          400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155',
          800: '#1E293B', 900: '#0F172A',
        },
        success: '#16A34A', warning: '#D97706', danger: '#DC2626',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // Brand type scale (H1 56/64, H2 40/48, H3 32/40, Body 16/26, Small 14/22).
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['2.75rem', { lineHeight: '1.08', letterSpacing: '-0.02em', fontWeight: '700' }],
        h2: ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '600' }],
        h3: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.7' }],
      },
      borderRadius: { btn: '0.625rem', card: '0.875rem', pill: '9999px' },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 32px rgba(0,0,0,0.30)',
        cta: '0 10px 30px rgba(37,99,235,0.30)',
        pop: '0 20px 50px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg,#2563EB,#1D4ED8)',
        'hero-glow': 'radial-gradient(60% 55% at 50% 0%, rgba(37,99,235,0.16) 0%, rgba(10,15,28,0) 70%)',
        'grid-faint':
          'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
      },
      backgroundSize: { grid: '56px 56px' },
      maxWidth: { container: '1200px', prose: '68ch' },
      screens: { xs: '380px' },
    },
  },
};
