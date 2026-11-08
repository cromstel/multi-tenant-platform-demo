'use client';

import Link from 'next/link';
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

const ROLE_ICONS: Record<string, string> = {
  owner: '👑',
  admin: '🛡️',
  member: '👤',
};

export function SearchableSectionList({
  sections,
}: {
  sections: DocSectionRow[];
}) {
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

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

  // Apply role filter
  const roleFiltered = useMemo(() => {
    if (selectedRole === 'all') return filtered;
    return filtered.filter((s) => s.role === selectedRole);
  }, [filtered, selectedRole]);

  // Group filtered sections by role, ordered owner → admin → member.
  const grouped = useMemo(() => {
    const map = new Map<string, DocSectionRow[]>();
    for (const section of roleFiltered) {
      const bucket = map.get(section.role) ?? [];
      bucket.push(section);
      map.set(section.role, bucket);
    }
    return [...map.entries()].sort(
      (a, b) => (ROLE_ORDER[a[0]] ?? 99) - (ROLE_ORDER[b[0]] ?? 99)
    );
  }, [roleFiltered]);

  // Calculate total reading time estimate (~200 words per minute)
  const totalWords = useMemo(() => {
    return roleFiltered.reduce((acc, s) => {
      const words = s.body.replace(/<[^>]*>/g, ' ').split(/\s+/).length;
      return acc + words;
    }, 0);
  }, [roleFiltered]);
  const readingTime = Math.max(1, Math.ceil(totalWords / 200));

  const roleOptions = [
    { value: 'all', label: 'All sections' },
    { value: 'owner', label: 'Owner', color: 'text-blue-700' },
    { value: 'admin', label: 'Admin', color: 'text-emerald-700' },
    { value: 'member', label: 'Member', color: 'text-violet-700' },
  ];

  return (
    <section className="w-full xl:px-12 mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-10">
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/" className="hover:text-[#005cb3] transition-colors">
            Home
          </Link>
          <span className="mx-1">/</span>
          <span className="text-[#005cb3]">Knowledge Base</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#005cb3] mb-3">
          Knowledge Base
        </h1>
        <p className="text-base text-slate-600 mb-4 max-w-2xl">
          CITGROUP TENANCY SYSTEM documentation, organised by role. Use the
          search box below to filter sections by title or content.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]">
            <span className="mr-1">{ROLE_ICONS[selectedRole] ?? '📚'}</span>
            {ROLE_LABELS[selectedRole] ?? selectedRole}
          </span>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-white text-slate-700">
            {readingTime} min read
          </span>
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-white text-slate-700">
            {roleFiltered.length} sections
          </span>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 max-w-lg">
          <label htmlFor="kb-search" className="sr-only">
            Search knowledge base sections
          </label>
          <input
            id="kb-search"
            type="search"
            placeholder="Search sections by title or body…"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            className="w-full rounded border border-[#0078E2]/30 bg-[#0078E2]/5 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0078E2] focus:outline-none focus:ring-1 focus:ring-[#0078E2]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedRole(option.value)}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedRole === option.value
                  ? 'bg-[#0078E2] text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              } ${option.color}`}
            >
              {ROLE_ICONS[option.value] ?? '📄'} {option.label}
            </button>
          ))}
        </div>
      </div>

      {roleFiltered.length === 0 ? (
        <section className="rounded-xl border border-[#0078E2]/20 bg-[#0078E2]/5 p-12 text-center">
          <p className="text-sm text-[#005cb3]">
            {query
              ? `No sections match "${query}". Try a different search term.`
              : 'No documentation sections are available yet.'}
          </p>
        </section>
      ) : (
        grouped.map(([role, roleSections]) => (
          <section key={role} className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-xl font-bold text-[#005cb3]">
                {ROLE_LABELS[role] ?? role}
              </h2>
              <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]`}>
                {roleSections.length} {roleSections.length === 1 ? 'section' : 'sections'}
              </span>
            </div>
            <div className="grid gap-4">
              {roleSections.map((section) => (
                <article
                  key={section.id}
                  className="rounded-xl border border-[#0078E2]/20 bg-white p-6 shadow-sm hover:border-[#0078E2]/40 transition-colors group hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between mb-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]`}
                    >
                      {section.role}
                    </span>
                    <span
                      className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]"
                    >
                      Sort {section.sort_order}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#005cb3] mb-3">
                    {section.title}
                  </h3>
                  <div
                    className="prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: section.body }}
                  />
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Updated {new Date(section.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-xs text-slate-500">
                      ID: {section.id}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
