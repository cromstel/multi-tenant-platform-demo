import { redis } from '@/lib/redis';
import FloatingBarClient from '@/components/floating-bar-client';

export default async function FloatingBar() {
  const links = (await redis.get<Record<string, string>>('social_links')) || {};
  return <FloatingBarClient links={links} />;
}
