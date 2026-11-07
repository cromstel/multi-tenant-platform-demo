import type { Metadata } from 'next';

import { requireAdminSession } from '@/app/auth/admin/login/actions';
import {
  createDocSectionAction,
  deleteDocSectionAction,
  getDocSections,
  type DocSectionRow,
  updateDocSectionAction,
} from './actions';

export const metadata: Metadata = {
  title: 'Documentation Sections',
  description:
    'Manage documentation sections for CITGROUP TENANCY SYSTEM',
  // The admin area is not a public page — keep it out of search indexes.
  robots: { index: false, follow: false },
};

type RoleBadgeProps = { role: string };

function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-[#0078E2]/30 bg-[#0078E2]/10 text-[#005cb3]"
    >
      {role}
    </span>
  );
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function DocsPage() {
  // Require admin authentication — page-level check for the UI.
  await requireAdminSession();

  const sections: DocSectionRow[] = await getDocSections();

  async function handleCreateDocSection(formData: FormData): Promise<void> {
    await createDocSectionAction({}, formData);
  }

  async function handleUpdateDocSection(formData: FormData): Promise<void> {
    await updateDocSectionAction({}, formData);
  }

  async function handleDeleteDocSection(formData: FormData): Promise<void> {
    await deleteDocSectionAction({}, formData);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full xl:px-12 mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#005cb3]">
            Documentation Sections
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage documentation sections tiered by role (owner, admin,
            member). Sections are surfaced to SAM\u2019s knowledge base.
          </p>
        </div>

        {/* Add section form */}
        <form
          action={handleCreateDocSection}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          method="POST"
        >
          <label className="block flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Role</span>
            <select
              name="role"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#0078E2] focus:outline-none focus:ring-1 focus:ring-[#0078E2]"
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </label>
          <label className="block flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              name="title"
              type="text"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#0078E2] focus:outline-none focus:ring-1 focus:ring-[#0078E2]"
            />
          </label>
          <label className="block flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Body</span>
            <textarea
              name="body"
              rows={3}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#0078E2] focus:outline-none focus:ring-1 focus:ring-[#0078E2]"
            />
          </label>
          <label className="block flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Sort order</span>
            <input
              name="sort_order"
              type="number"
              min="0"
              defaultValue="0"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#0078E2] focus:outline-none focus:ring-1 focus:ring-[#0078E2]"
            />
          </label>
          <button
            type="submit"
            className="rounded-none bg-[#005cb3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#004A94] transition-colors"
          >
            Add section
          </button>
        </form>

        {/* Sections list */}
        <div className="rounded-none border border-gray-200 bg-white shadow-sm">
          {sections.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center">
              <p className="text-sm text-slate-500">
                No documentation sections yet. Add one above.
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Title
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Body
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sort
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Updated
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sections.map((section) => (
                  <tr
                    key={section.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <RoleBadge role={section.role} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {section.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {section.body.slice(0, 140)}
                      {section.body.length > 140 ? '\u2026' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {section.sort_order}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(section.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(section.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Edit form */}
                      <form
                        action={handleUpdateDocSection}
                        className="mb-2"
                        method="POST"
                      >
                        <input type="hidden" name="id" value={String(section.id)} />
                        <input
                          name="role"
                          defaultValue={section.role}
                          className="w-full text-xs rounded border border-gray-300 px-2 py-1 mb-1"
                        />
                        <input
                          name="title"
                          defaultValue={section.title}
                          className="w-full text-xs rounded border border-gray-300 px-2 py-1 mb-1"
                          required
                        />
                        <textarea
                          name="body"
                          defaultValue={section.body}
                          className="w-full text-xs rounded border border-gray-300 px-2 py-1 mb-1"
                          rows={2}
                          required
                        />
                        <input
                          name="sort_order"
                          type="number"
                          min="0"
                          defaultValue={String(section.sort_order)}
                          className="w-24 text-xs rounded border border-gray-300 px-2 py-1 mb-1"
                        />
                        <button
                          type="submit"
                          className="w-full rounded bg-[#0078E2]/10 border border-[#0078E2]/30 text-[#005cb3] text-xs px-3 py-1.5 hover:bg-[#0078E2]/20"
                        >
                          Update
                        </button>
                      </form>
                      {/* Delete form */}
                      <form
                        action={handleDeleteDocSection}
                        onSubmit={(event) => {
                          if (
                            !window.confirm(
                              'Delete this documentation section?'
                            )
                          ) {
                            event.preventDefault();
                          }
                        }}
                        method="POST"
                      >
                        <input type="hidden" name="id" value={String(section.id)} />
                        <button
                          type="submit"
                          className="rounded-none text-xs text-red-600 hover:text-red-700 underline underline-offset-4"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
