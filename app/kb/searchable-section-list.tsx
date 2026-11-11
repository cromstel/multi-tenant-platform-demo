'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  BookOpen,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Search,
  X,
} from 'lucide-react';

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

// Distinct badge styling per role. Text colours meet 4.5:1 on white
// (WCAG 1.4.3) — semantic colours are one step darker per project convention.
const ROLE_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; text: string }
> = {
  owner: {
    label: 'Owner',
    bg: 'bg-[#0078E2]/10',
    border: 'border-[#0078E2]/20',
    text: 'text-[#005cb3]',
  },
  admin: {
    label: 'Admin',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
  },
  member: {
    label: 'Member',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    text: 'text-violet-700',
  },
};

const WORDS_PER_MINUTE = 200;
const DEBOUNCE_MS = 300;

const roleOptions = [
  { value: 'all', label: 'All sections', icon: '📚' },
  { value: 'owner', label: 'Owner', icon: '👑' },
  { value: 'admin', label: 'Admin', icon: '🛡️' },
  { value: 'member', label: 'Member', icon: '👤' },
];

const wordCount = (body: string) =>
  body.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;

const readingTimeFor = (body: string) =>
  Math.max(1, Math.ceil(wordCount(body) / WORDS_PER_MINUTE));

export function SearchableSectionList({
  sections,
}: {
  sections: DocSectionRow[];
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Debounced keyword filter so results don't re-render on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Client-side keyword filter over title and body.
  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return sections;
    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(q) ||
        section.body.toLowerCase().includes(q)
    );
  }, [sections, debouncedQuery]);

  // Apply role filter.
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

  // Aggregate reading time estimate for the currently visible set.
  const totalWords = useMemo(
    () => roleFiltered.reduce((acc, s) => acc + wordCount(s.body), 0),
    [roleFiltered]
  );
  const readingTime = Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));

  // Scroll-spy: highlights the TOC entry whose section is currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;
        // Pick the section highest on screen so the active match is stable.
        const best = intersecting.reduce((a, b) =>
          (a.boundingClientRect.y ?? 0) < (b.boundingClientRect.y ?? 0)
            ? a
            : b
        );
        const target = best.target as HTMLElement;
        const id = target.dataset.sectionId;
        if (id) setActiveSectionId(Number(id));
      },
      { rootMargin: '-96px 0% -75% 0%', threshold: 0 }
    );
    document.querySelectorAll('[data-section-id]').forEach((el) =>
      observer.observe(el as HTMLDivElement)
    );
    return () => observer.disconnect();
  }, [roleFiltered]);

  const scrollToSection = useCallback((id: number) => {
    const el = document.getElementById(`kb-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSectionId(id);
    }
  }, []);

  const sectionAnchor = (id: number) => `#kb-section-${id}`;

  const hasResults = roleFiltered.length > 0;
  const activeLabel = ROLE_LABELS[selectedRole] ?? selectedRole;

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileDrawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  const roleChipClasses = (active: boolean) =>
    active
      ? 'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border bg-[#005cb3] text-white transition-colors hover:bg-[#004A94]'
      : 'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50';

  const tocLinkClasses = (active: boolean) =>
    active
      ? 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-[#0078E2]/10 text-[#005cb3]'
      : 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#005cb3]';

  const tocGroup = (
    role: string,
    roleSections: DocSectionRow[],
    drawer: boolean
  ) => (
    <div key={role} className={drawer ? 'mb-5' : 'mb-6'}>
      <h3
        className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2"
      >
        {ROLE_LABELS[role] ?? role}
      </h3>
      <ul className="space-y-1.5">
        {roleSections.map((section) => {
          const active = activeSectionId === section.id;
          return (
            <li key={section.id}>
              <Link
                href={sectionAnchor(section.id)}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection(section.id);
                  if (drawer) setMobileDrawerOpen(false);
                }}
                className={tocLinkClasses(active)}
              >
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                {section.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (!hasResults) {
    return (
      <section className="rounded-xl border border-[#0078E2]/20 bg-[#0078E2]/5 p-16 text-center">
        <BookOpen
          className="mx-auto h-12 w-12 text-[#0078E2]/30 mb-4"
          aria-hidden="true"
        />
        <h3 className="text-lg font-semibold text-[#005cb3] mb-2">
          {debouncedQuery ? `No results for "${debouncedQuery}"` : 'No documentation sections available yet.'}
        </h3>
        <p className="text-sm text-slate-600 max-w-xs mx-auto">
          {debouncedQuery
            ? 'Try a different search term, or broaden your query.'
            : 'Documentation sections will appear here once they are published.'}
        </p>
        {debouncedQuery && (
          <button
            onClick={() => setQuery('')}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#005cb3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004A94] active:scale-[0.98]"
          >
            Clear search
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="w-full">
      {/* Skip link for keyboard users. */}
      <a
        href="#kb-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#005cb3] focus:text-white focus:rounded"
      >
        Skip to content
      </a>

      {/* Hero */}
      <div className="mb-10">
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link
            href="/"
            className="hover:text-[#005cb3] transition-colors"
          >
            Home
          </Link>
          <span className="mx-1">/</span>
          <span className="text-[#005cb3]">Knowledge Base</span>
        </nav>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#005cb3] mb-3">
          Knowledge Base
        </h1>
        <p className="text-base text-slate-600 mb-6 max-w-2xl">
          CITGROUP TENANCY SYSTEM documentation, organised by role. Use the
          search box below to filter sections by title or content.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]"
          >
            <span className="mr-1.5">{ROLE_ICONS[selectedRole] ?? '📚'}</span>
            {activeLabel}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-white text-slate-600"
          >
            <Clock className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {readingTime} min read
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-white text-slate-600"
          >
            {roleFiltered.length} {roleFiltered.length === 1 ? 'section' : 'sections'}
          </span>
        </div>
      </div>

      {/* Search + role filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-8">
          <label htmlFor="kb-search" className="sr-only">
            Search knowledge base sections by title or body
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="kb-search"
              type="search"
              placeholder="Search sections by title or body…"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              className="w-full rounded-xl border border-[#0078E2]/30 bg-[#0078E2]/5 pl-10 pr-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#0078E2] focus:outline-none focus:ring-1 focus:ring-[#0078E2]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#005cb3] transition-colors"
                aria-label="Clear search"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Searches titles and content. Results update as you type.
          </p>
        </div>
        <div className="lg:col-span-4">
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((option) => {
              const active = selectedRole === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedRole(option.value)}
                  aria-pressed={active}
                  className={roleChipClasses(active)}
                >
                  {option.icon} {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile nav trigger opens the collapsible drawer containing the TOC. */}
      <button
        className="lg:hidden mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        onClick={() => setMobileDrawerOpen(true)}
        // The accessible name has to contain the visible "Sections" text
        // (WCAG 2.5.3 Label in Name), so it extends the label rather than
        // replacing it.
        aria-label="Open Sections navigation"
        aria-expanded={mobileDrawerOpen}
      >
        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
        Sections
      </button>

      <div id="kb-content" className="xl:grid xl:grid-cols-12 xl:gap-12">
        {/* Desktop sticky TOC sidebar. */}
        <aside className="hidden xl:block xl:col-span-4">
          <div className="sticky top-24">
            <h2 className="font-semibold text-[#005cb3] mb-4 tracking-tight">
              Contents
            </h2>
            <nav aria-label="Table of contents">
              {grouped.map(([role, roleSections]) =>
                tocGroup(role, roleSections, false)
              )}
            </nav>
          </div>
        </aside>

        {/* Section cards (content area). `min-w-0` lets the grid track shrink
            below the content's intrinsic width — without it the track is
            sized by the widest article and the page overflows sideways. */}
        <div className="xl:col-span-8 min-w-0">
          {grouped.map(([role, roleSections]) => (
            <section
              key={role}
              id={`kb-role-${role}`}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-bold text-[#005cb3]">
                  {ROLE_LABELS[role] ?? role}
                </h2>
                <span
                  className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]"
                >
                  {roleSections.length} {roleSections.length === 1 ? 'section' : 'sections'}
                </span>
              </div>
              <div className="grid gap-5">
                {roleSections.map((section) => {
                  const config = ROLE_CONFIG[section.role];
                  const rt = readingTimeFor(section.body);
                  return (
                    <article
                      key={section.id}
                      id={`kb-section-${section.id}`}
                      data-section-id={String(section.id)}
                      className={`
                        rounded-xl border border-[#0078E2]/20 bg-white p-6
                        transition-all duration-200
                        hover:border-[#0078E2]/30 hover:shadow-sm
                        group
                      `}
                    >
                      <div className="flex flex-wrap items-center justify-between mb-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.border} ${config.text}`}
                        >
                          {ROLE_ICONS[section.role]} {section.role}
                        </span>
                        <span
                          className="ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-white text-slate-600"
                        >
                          <Clock className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {rt} min read
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#005cb3] mb-3">
                        {section.title}
                      </h3>
                      <div
                        className="kb-prose prose prose-sm prose-slate max-w-none text-slate-700 leading-relaxed mb-4"
                        dangerouslySetInnerHTML={{ __html: section.body }}
                      />
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-600">
                          Updated{' '}
                          {new Date(section.updated_at).toLocaleDateString(
                            'en-US',
                            { month: 'short', day: 'numeric', year: 'numeric' }
                          )}
                        </span>
                        <span className="text-slate-600">ID: {section.id}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Mobile collapsible drawer with TOC. */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-full max-w-xs bg-white border-r border-slate-200 shadow-xl"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-[#005cb3]">Contents</h2>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav
              className="p-4 overflow-y-auto max-h-[calc(100vh-160px)]"
              aria-label="Table of contents"
            >
              {grouped.map(([role, roleSections]) =>
                tocGroup(role, roleSections, true)
              )}
            </nav>
          </div>
        </div>
      )}
    </section>
  );
}
