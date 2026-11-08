import type { Metadata } from 'next';

import { getDocSections } from '@/app/auth/admin/docs/actions';
import type { DocSectionRow } from '@/app/auth/admin/docs/actions';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { pageMetadata } from '@/lib/seo';
import { SearchableSectionList } from './searchable-section-list';

export const metadata: Metadata = pageMetadata({
  title: 'Knowledge Base',
  description:
    'CITGROUP TENANCY SYSTEM knowledge base — documentation sections organised by role (owner, admin, member). Public reference for tenants and operators.',
  path: '/kb',
  keywords: [
    'CITGROUP knowledge base',
    'documentation',
    'tenant docs',
    'multi-tenant platform',
  ],
});

export default async function KnowledgeBasePage() {
  // Public Server Component — no auth required. Fetches all documentation
  // sections from the MySQL-backed `docs_sections` table.
  const sections: DocSectionRow[] = await getDocSections();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <ScrollProgress />

      <main className="flex-1">
        {/* Max-width container keeps line length readable; the client
            component owns the internal two-column layout (TOC sidebar +
            content) and all interactivity. */}
        <div className="mx-auto px-4 py-8 xl:px-12 max-w-7xl">
          <SearchableSectionList sections={sections} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
