import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Apple touch icon.
 *
 * iOS does not read the SVG favicon, so it needs a raster PNG at exactly
 * 180x180. The mark matches `app/icon.svg` — a white tenancy glyph on the
 * CITGROUP blue gradient, with no padding (iOS masks the corners itself).
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0078E2 0%, #5B9CF5 100%)',
        }}
      >
        <svg
          width="118"
          height="118"
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
    ),
    size
  );
}
