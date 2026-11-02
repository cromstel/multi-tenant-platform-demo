import { redis } from '@/lib/redis';
import { requireAdminSession } from '@/app/auth/admin/login/actions';
import { updateSocialLinksAction } from './actions';

const DEFAULTS = {
  whatsapp: 'https://wa.me/1234567890',
  email: 'mailto:hello@example.com',
  linkedin: 'https://linkedin.com/company/example',
  facebook: 'https://facebook.com/example',
};

export default async function SocialSettingsPage() {
  await requireAdminSession();

  const links = ((await redis.get<Record<string, string>>('social_links')) || {}) as Record<
    string,
    string
  >;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Social Links</h1>

      <form
        // @ts-expect-error server action form type
        action={updateSocialLinksAction}
        className="flex flex-col gap-5"
        method="POST"
      >
        <InputField label="WhatsApp URL" value={links.whatsapp ?? DEFAULTS.whatsapp} name="whatsapp" />
        <InputField label="Email" value={links.email ?? DEFAULTS.email} name="email" />
        <InputField label="LinkedIn URL" value={links.linkedin ?? DEFAULTS.linkedin} name="linkedin" />
        <InputField label="Facebook URL" value={links.facebook ?? DEFAULTS.facebook} name="facebook" />
        <button type="submit" className="w-fit rounded bg-[#005cb3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#004A94]">Save links</button>
      </form>
    </div>
  );
}

function InputField({ label, value, name }: { label: string; value: string; name: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        type="text"
        name={name}
        defaultValue={value}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-describedby={`hint-${name}`}
      />
      <p id={`hint-${name}`} className="mt-1 text-xs text-gray-500">
        Starts with <code>https://</code> or <code>mailto:</code>. Leave blank to clear.
      </p>
    </label>
  );
}
