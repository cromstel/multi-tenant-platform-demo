'use client';

import { useMemo, useState } from 'react';

import type { DocSectionRow } from '@/app/auth/admin/docs/actions';

const ROLE_ORDER: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export function SearchableSectionList({
  sections,
}: {
  sections: DocSectionRow[];
}) {
  const [query, setQuery] = useState('');

  // Client-side keyword filter over title and body.
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(q) ||
        section.body.toLowerCase().includes(q)
    );
  }, [sections, query]);

  // Group filtered sections by role, ordered owner → admin → member.
  const grouped = useMemo(() => {
    const map = new Map<string, DocSectionRow[]>();
    for (const section of filtered) {
      const bucket = map.get(section.role) ?? [];
      bucket.push(section);
      map.set(section.role, bucket);
    }
    return [...map.entries()].sort(
      (a, b) => (ROLE_ORDER[a[0]] ?? 99) - (ROLE_ORDER[b[0]] ?? 99)
    );
  }, [filtered]);

  return (
    <section className="w-full xl:px-12 mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#005cb3] mb-1">
        Knowledge Base
      </h1>
      <p className="text-sm text-slate-600 mb-8">
        CITGROUP TENANCY SYSTEM documentation, organised by role. Use the
        search box below to filter sections by title or content.
      </p>

      <div className="max-w-lg mb-8">
        <label htmlFor="kb-search" className="sr-only">
          Search knowledge base sections
        </label>
        <input
          id="kb-search"
          type="search"
          placeholder="Search sections by title or body…"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          className="w-full rounded border border-[#0078E2]/30 bg-[#0078E2]/5 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0078E2] focus:outline-none focus:ring-1 focus:ring-[#0078E2]"
        />
      </div>

      {filtered.length === 0 ? (
        <section className="rounded-xl border border-[#0078E2]/20 bg-[#0078E2]/5 p-8 text-center">
          <p className="text-sm text-[#005cb3]">
            {query
              ? 'No sections match your search.'
              : 'No documentation sections are available yet.'}
          </p>
        </section>
      ) : (
        grouped.map(([role, roleSections]) => (
          <section key={role} className="mb-10">
            <h2 className="text-xl font-bold text-[#005cb3] mb-4">
              {ROLE_LABELS[role] ?? role}
            </h2>
            <div className="grid gap-4">
              {roleSections.map((section) => (
                <article
                  key={section.id}
                  className="rounded-xl border border-[#0078E2]/20 bg-white p-5 shadow-sm hover:border-[#0078E2]/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]"
                    >
                      {section.role}
                    </span>
                    <span
                      className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]"
                    >
                      Sort {section.sort_order}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#005cb3] mb-2">
                    {section.title}
                  </h3>
                  <div
                    className="text-sm leading-relaxed text-slate-700"
                    dangerouslySetInnerHTML={{ __html: section.body }}
                  />
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
