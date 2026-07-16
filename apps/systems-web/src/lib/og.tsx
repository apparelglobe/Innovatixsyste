/**
 * Shared Open Graph / social-image generator (dark Innovatix system). Used by
 * the route-level opengraph-image / twitter-image files. Renders at 1200×630 via
 * next/og (Satori). CLAIMS INTEGRITY: no unsupported customer logos, metrics,
 * partnership marks, or certification badges appear in any social image.
 */
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

type OgOpts = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

/** Truncate at a word boundary with an ellipsis (avoids mid-word cuts). */
function clamp(text: string | undefined, max = 120): string | undefined {
  if (!text) return undefined;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function renderOgImage({ eyebrow, title, subtitle: rawSubtitle }: OgOpts): ImageResponse {
  const subtitle = clamp(rawSubtitle, 120);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: '#0A0F1C',
          backgroundImage:
            'radial-gradient(circle at 100% 0%, rgba(37,99,235,0.38), transparent 55%), radial-gradient(circle at 0% 100%, rgba(29,78,216,0.18), transparent 50%)',
          fontFamily: 'sans-serif',
          color: '#fff',
        }}
      >
        {/* brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              fontSize: '26px',
              fontWeight: 800,
              color: '#fff',
            }}
          >
            iX
          </div>
          <div style={{ display: 'flex', fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            <span>Innovatix&nbsp;</span>
            <span style={{ color: '#60A5FA' }}>Systems</span>
          </div>
        </div>

        {/* headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '980px' }}>
          {eyebrow ? (
            <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#60A5FA' }}>
              {eyebrow}
            </div>
          ) : null}
          <div style={{ fontSize: title.length > 48 ? '58px' : '68px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1.5px' }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ fontSize: '28px', lineHeight: 1.35, color: '#94A3B8', maxWidth: '900px' }}>{subtitle}</div>
          ) : null}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', height: '6px', width: '160px', borderRadius: '999px', background: 'linear-gradient(90deg, #2563EB, #1D4ED8)' }} />
          <div style={{ fontSize: '22px', color: '#64748B' }}>innovatixsystems.com</div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
