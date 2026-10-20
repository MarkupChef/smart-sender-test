import { z } from 'zod';
import { ROUTES } from '@/shared/routes';

function toSafeRedirect(redirect: string | undefined): string | undefined {
  if (redirect === undefined || !URL.canParse(redirect, window.location.origin)) return undefined;
  const target = new URL(redirect, window.location.origin);
  if (target.origin !== window.location.origin || target.pathname === ROUTES.login)
    return undefined;
  return target.pathname + target.search + target.hash;
}

export const loginSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined).transform(toSafeRedirect),
  reason: z.literal('expired').optional().catch(undefined),
});
