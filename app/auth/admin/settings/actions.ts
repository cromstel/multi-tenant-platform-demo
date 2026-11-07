'use server';

import { redis } from '@/lib/redis';
import { getAdminSession } from '@/app/auth/admin/login/actions';

export type SettingsState = {
  error?: string;
  success?: string;
};

async function requireAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  return Boolean(session);
}

function isValidUrl(value: string): boolean {
  return value.startsWith('https://') || value.startsWith('mailto:');
}

export async function updateSocialLinksAction(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!(await requireAdmin())) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const whatsapp = (formData.get('whatsapp') as string) || '';
  const email = (formData.get('email') as string) || '';
  const linkedin = (formData.get('linkedin') as string) || '';
  const facebook = (formData.get('facebook') as string) || '';

  const links: Record<string, string> = {};
  const fields = [
    { key: 'whatsapp', value: whatsapp },
    { key: 'email', value: email },
    { key: 'linkedin', value: linkedin },
    { key: 'facebook', value: facebook },
  ];

  for (const f of fields) {
    if (f.value.trim() === '') {
      links[f.key] = '';
    } else if (!isValidUrl(f.value.trim())) {
      return { error: `Invalid URL for ${f.key}: must start with https:// or mailto:` };
    } else {
      links[f.key] = f.value.trim();
    }
  }

  await redis.set('social_links', links);
  return { success: 'Social links updated.' };
}
