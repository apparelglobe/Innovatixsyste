/** Innovatix enterprise design system tokens (F1 foundation). */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand
        ink: '#0A1024',            // near-black navy (headers/footer)
        primary: {
          DEFAULT: '#4F46E5',      // indigo 600 — technology + trust
          dark: '#3730A3',
          light: '#6366F1',
        },
        accent: {
          DEFAULT: '#06B6D4',      // cyan — AI / precision
          dark: '#0E7490',
        },
        // Neutral slate ramp
        neutral: {
          50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1',
          400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155',
          800: '#1E293B', 900: '#0F172A',
        },
        success: '#16A34A', warning: '#D97706', danger: '#DC2626',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { btn: '0.625rem', card: '1rem', pill: '9999px' },
      boxShadow: {
        card: '0 1px 2px rgba(10,16,36,0.04), 0 8px 24px rgba(10,16,36,0.06)',
        cta: '0 8px 24px rgba(79,70,229,0.25)',
      },
      maxWidth: { container: '1200px' },
      screens: { xs: '380px' },
    },
  },
};
