import type { Metadata } from 'next';

/**
 * Central SEO configuration.
 *
 * Every public page builds its metadata from these helpers so the title
 * format, canonical URL and social-card defaults stay consistent. The site
 * URL is derived from `NEXT_PUBLIC_ROOT_DOMAIN` — the same value the proxy
 * and the tenant URLs use — so there is a single source of truth.
 */

export const SITE_NAME = 'CITGROUP TENANCY SYSTEM';
export const SITE_SHORT_NAME = 'CITGROUP';
export const SITE_DESCRIPTION =
  'Multi-tenant SaaS platform with subdomain-based tenant isolation. Deploy once, isolate every customer, scale independently.';

export const BRAND_COLOR = '#0078E2';
export const TWITTER_HANDLE = '@citgroup';

/** Absolute origin, e.g. `https://platforms.example.com`. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();

  if (!configured) {
    // Local development — the port has to be included, browsers read it from
    // the hostname.
    return 'http://localhost:3030';
  }

  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }

  const isLocal = configured.includes('localhost') || configured.includes('127.0.0.1');
  // The trailing slash has to go here too — `tenancy.example.com/` would
  // otherwise produce `https://tenancy.example.com/`, and every canonical
  // URL built from it would carry a double slash.
  return `${isLocal ? 'http' : 'https'}://${configured.replace(/\/+$/, '')}`;
}

/** Absolute URL for a path on this site. */
export function absoluteUrl(path = '/'): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Builds page metadata with the shared defaults already applied.
 *
 * Pass only what differs — the canonical URL, robots directives and
 * social-card fields are filled in here.
 *
 * The title is returned **without** the site-name suffix. The root layout
 * owns `title.template`, so appending it here too would produce
 * "Page | CITGROUP TENANCY SYSTEM | CITGROUP TENANCY SYSTEM".
 */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = '/',
  keywords = [],
  noIndex = false,
  type = 'website',
}: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: 'website' | 'article';
}): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = title;

  return {
    title: fullTitle,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type,
      url,
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      locale: 'en_US',
      images: [
        {
          url: absoluteUrl('/opengraph-image'),
          width: 1200,
          height: 630,
          alt: `${fullTitle} — ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      images: [absoluteUrl('/opengraph-image')],
    },
  };
}

/**
 * JSON-LD structured data.
 *
 * Rendered as a `<script type="application/ld+json">` tag. Search engines use
 * it to understand the page type — organisation, website, FAQ list, contact
 * point — beyond what the markup alone says.
 */
export function structuredData(
  data: Record<string, unknown> | Record<string, unknown>[]
): string {
  return JSON.stringify(data);
}

/** The organisation/brand entity, referenced by every other entity. */
export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl()}/#organization`,
    name: SITE_NAME,
    alternateName: 'CITGROUP Tenancy System',
    url: siteUrl(),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon.svg'),
      width: 64,
      height: 64,
    },
    description: SITE_DESCRIPTION,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@citgroup.example',
      availableLanguage: ['en'],
    },
  };
}

/** The website entity, with a search action for the sitemap. */
export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${siteUrl()}/#website`,
    url: siteUrl(),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': `${siteUrl()}/#organization` },
    inLanguage: 'en',
  };
}

/** The landing page, described as a software application. */
export function softwareApplicationSchema() {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl()}/#app`,
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: SITE_DESCRIPTION,
    url: siteUrl(),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier — create a tenant to get started',
    },
    featureList: [
      'Subdomain-based tenant isolation',
      'Automatic tenant provisioning',
      'MySQL-backed relational storage',
      'Rate-limited authentication',
      'Admin analytics dashboard',
    ],
  };
}

/** An FAQ list. The `mainEntity` entries must match the visible questions. */
export function faqSchema(
  faqs: Array<{ q: string; a: string }>
) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

/** A contact page, described as a `ContactPage` with contact channels. */
export function contactPageSchema() {
  return {
    '@type': 'ContactPage',
    '@id': `${siteUrl()}/contact#contactpage`,
    url: absoluteUrl('/contact'),
    name: `Contact & Support | ${SITE_NAME}`,
    description:
      'Reach the CITGROUP TENANCY SYSTEM support team for technical help, sales enquiries, billing questions, or partnership opportunities.',
    about: { '@id': `${siteUrl()}/#organization` },
  };
}

/** The company page, described as an `AboutPage` about the organisation. */
export function aboutPageSchema() {
  return {
    '@type': 'AboutPage',
    '@id': `${siteUrl()}/about#aboutpage`,
    url: absoluteUrl('/about'),
    name: `About | ${SITE_NAME}`,
    description:
      'Why CITGROUP TENANCY SYSTEM exists: isolation by default, one source of truth, and infrastructure that scales without leaking tenant data.',
    about: { '@id': `${siteUrl()}/#organization` },
    mainEntity: { '@id': `${siteUrl()}/#organization` },
  };
}
