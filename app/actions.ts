'use server';

import { redis } from '@/lib/redis';
import { isValidIcon, sanitizeSubdomain } from '@/lib/subdomains';
import { getSession } from '@/lib/auth';
import { CREATE_LIMIT, consume } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { rootDomain, protocol } from '@/lib/utils';

export type CreateSubdomainState = {
  error?: string;
  success?: boolean;
  subdomain?: string;
  icon?: string;
};

export type DeleteSubdomainState = {
  error?: string;
  success?: string;
};

export async function createSubdomainAction(
  _prevState: CreateSubdomainState,
  formData: FormData
): Promise<CreateSubdomainState> {
  // Tenant creation is intentionally public, but unthrottled it lets an
  // automated client exhaust the namespace. Every attempt is counted, so the
  // limit reflects requests rather than outcomes.
  const limit = await consume('create', CREATE_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Too many subdomains created from your network. Try again in about ${
        Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))
      } minutes.`
    };
  }

  const subdomain = formData.get('subdomain') as string;
  const icon = formData.get('icon') as string;

  if (!subdomain || !icon) {
    return { success: false, error: 'Subdomain and icon are required' };
  }

  if (!isValidIcon(icon)) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'Please enter a valid emoji (maximum 10 characters)'
    };
  }

  const sanitizedSubdomain = sanitizeSubdomain(subdomain);

  if (!sanitizedSubdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const subdomainAlreadyExists = await redis.get(
    `subdomain:${sanitizedSubdomain}`
  );
  if (subdomainAlreadyExists) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  await redis.set(`subdomain:${sanitizedSubdomain}`, {
    emoji: icon,
    createdAt: Date.now()
  });

  redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}`);
}

export async function deleteSubdomainAction(
  _prevState: DeleteSubdomainState,
  formData: FormData
): Promise<DeleteSubdomainState> {
  // Authorise inside the action, not just on the page that renders its form.
  // A Server Action is reachable by direct POST regardless of what the page
  // checks, so this is the check that actually protects the data.
  const session = await getSession();
  if (!session) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const rawSubdomain = formData.get('subdomain');

  if (typeof rawSubdomain !== 'string' || !rawSubdomain) {
    return { error: 'A subdomain is required' };
  }

  await redis.del(`subdomain:${sanitizeSubdomain(rawSubdomain)}`);
  revalidatePath('/admin');
  return { success: 'Domain deleted successfully' };
}
