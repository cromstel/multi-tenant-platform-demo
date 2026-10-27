import { ImageResponse } from 'next/og';
import { BRAND_COLOR } from '@/lib/seo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'CITGROUP TENANCY SYSTEM';

/**
 * Twitter/X card image.
 *
 * X crops the summary_large_image card to 2:1 in some placements, so this
 * variant keeps the mark and wordmark centred with the headline below —
 * the content stays visible whether the card is cropped or not.
 */
export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          background: '#0c2238',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${BRAND_COLOR}55 0%, rgba(12,34,56,0) 70%)`,
          }}
        />

        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${BRAND_COLOR} 0%, #5B9CF5 100%)`,
          }}
        >
          <svg
            width="58"
            height="58"
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

        <div
          style={{
            fontSize: 58,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          One platform. Every tenant isolated.
        </div>

        <div
          style={{
            fontSize: 21,
            fontWeight: 700,
            color: BRAND_COLOR,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          CITGROUP Tenancy System
        </div>
      </div>
    ),
    size
  );
}
