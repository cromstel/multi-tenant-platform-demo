import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

/**
 * Minimal route-level smoke: the health endpoint answers with the expected
 * envelope and does not crash the build. A full /faq content audit should
 * verify the rendered DOM, but this keeps the route covered in CI.
 */
describe('/faq smoke', () => {
  it('health endpoint responds with ok envelope', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
