import { ImageResponse } from 'next/og';
import { BRAND_COLOR } from '@/lib/seo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'CITGROUP TENANCY SYSTEM — multi-tenant SaaS platform';

/**
 * Social share image.
 *
 * Rendered at build time and served from `/opengraph-image`. It is the card
 * that appears when the site is shared on LinkedIn, X, Slack or in an email
 * client, so it carries the brand mark, the name and the one-line pitch.
 */
export default function OpenGraphImage() {
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
          background: '#0c2238',
          position: 'relative',
        }}
      >
        {/* Brand glow */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: 180,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${BRAND_COLOR}55 0%, rgba(12,34,56,0) 70%)`,
          }}
        />

        {/* Mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${BRAND_COLOR} 0%, #5B9CF5 100%)`,
            }}
          >
            <svg
              width="46"
              height="46"
              viewBox="0 0 64 64"
              fill="none"
              stroke="#ffffff"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 32 L32 14 L50 32" />
              <path d="M20 29 V48 H44 V29" />
              <path d="M32 48 V38" />
              <path d="M26 38 H38" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              }}
            >
              CITGROUP
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: BRAND_COLOR,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                lineHeight: 1.4,
              }}
            >
              Tenancy System
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 900 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
            }}
          >
            One platform. Every tenant isolated.
          </div>
          <div
            style={{
              fontSize: 26,
              color: '#93c5fd',
              marginTop: 22,
              lineHeight: 1.4,
            }}
          >
            Subdomain-based multi-tenancy with MySQL-backed data isolation.
          </div>
        </div>

        {/* Footer chips */}
        <div style={{ display: 'flex', gap: 14 }}>
          {['Subdomain isolation', 'Automatic provisioning', 'Admin analytics'].map(
            (chip) => (
              <div
                key={chip}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  borderRadius: 9999,
                  border: '1px solid rgba(255,255,255,0.16)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#bfdbfe',
                  fontSize: 20,
                  fontWeight: 500,
                }}
              >
                {chip}
              </div>
            )
          )}
        </div>
      </div>
    ),
    size
  );
}
