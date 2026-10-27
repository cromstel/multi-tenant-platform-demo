import { describe, expect, it } from 'vitest';

import {
  absoluteUrl,
  contactPageSchema,
  faqSchema,
  organizationSchema,
  pageMetadata,
  siteUrl,
  softwareApplicationSchema,
  structuredData,
  websiteSchema,
} from '@/lib/seo';

describe('siteUrl', () => {
  it('builds an http origin for localhost', () => {
    const original = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'localhost:3030';
    expect(siteUrl()).toBe('http://localhost:3030');
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = original;
  });

  it('builds an https origin for a real domain', () => {
    const original = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'tenancy.citgroup.com';
    expect(siteUrl()).toBe('https://tenancy.citgroup.com');
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = original;
  });

  it('strips a trailing slash', () => {
    const original = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'tenancy.citgroup.com/';
    expect(siteUrl()).toBe('https://tenancy.citgroup.com');
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = original;
  });

  it('respects an explicit scheme', () => {
    const original = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'https://custom.example.com';
    expect(siteUrl()).toBe('https://custom.example.com');
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = original;
  });
});

describe('absoluteUrl', () => {
  it('joins the origin and a path', () => {
    expect(absoluteUrl('/contact')).toBe(`${siteUrl()}/contact`);
  });

  it('adds a missing leading slash', () => {
    expect(absoluteUrl('contact')).toBe(`${siteUrl()}/contact`);
  });

  it('defaults to the root', () => {
    expect(absoluteUrl()).toBe(`${siteUrl()}/`);
  });
});

describe('pageMetadata', () => {
  it('does not append the site name — the layout template owns that', () => {
    const metadata = pageMetadata({ title: 'Contact & Support' });
    expect(metadata.title).toBe('Contact & Support');
  });

  it('sets a self-referencing canonical', () => {
    const metadata = pageMetadata({ title: 'Contact', path: '/contact' });
    expect(metadata.alternates?.canonical).toBe(`${siteUrl()}/contact`);
  });

  it('indexes by default', () => {
    const metadata = pageMetadata({ title: 'Public' });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it('noindexes when asked', () => {
    const metadata = pageMetadata({ title: 'Private', noIndex: true });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it('includes the social card image', () => {
    const metadata = pageMetadata({ title: 'Public' });
    const openGraph = metadata.openGraph as {
      images: Array<{ url: string; width: number }>;
    };
    expect(openGraph.images[0].url).toBe(`${siteUrl()}/opengraph-image`);
    expect(openGraph.images[0].width).toBe(1200);
  });

  it('omits keywords when none are supplied', () => {
    const metadata = pageMetadata({ title: 'Public' });
    expect(metadata.keywords).toBeUndefined();
  });

  it('passes keywords through', () => {
    const metadata = pageMetadata({ title: 'Public', keywords: ['a', 'b'] });
    expect(metadata.keywords).toEqual(['a', 'b']);
  });
});

describe('structured data', () => {
  it('serialises to valid JSON', () => {
    const json = structuredData(organizationSchema());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('accepts an array of entities', () => {
    const json = structuredData([organizationSchema(), websiteSchema()]);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it('gives the organisation a stable @id', () => {
    const schema = organizationSchema();
    expect(schema['@id']).toBe(`${siteUrl()}/#organization`);
  });

  it('links the website to the organisation', () => {
    const schema = websiteSchema();
    expect(schema.publisher).toEqual({ '@id': `${siteUrl()}/#organization` });
  });

  it('maps FAQ entries to Question and Answer', () => {
    const schema = faqSchema([{ q: 'Why?', a: 'Because.' }]);
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
    expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });

  it('describes the application with a feature list', () => {
    const schema = softwareApplicationSchema();
    expect(schema.featureList.length).toBeGreaterThan(0);
  });

  it('describes the contact page', () => {
    const schema = contactPageSchema();
    expect(schema['@type']).toBe('ContactPage');
    expect(schema.url).toBe(`${siteUrl()}/contact`);
  });
});
