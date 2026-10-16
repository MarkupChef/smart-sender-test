import { z } from 'zod';

// Wire contract (data-model.md). Types come only from z.infer (Principle VII).

export const userSchema = z.object({
  id: z.int(),
  email: z.email(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string(),
});

export const webhookSchema = z.object({
  id: z.int(),
  name: z.string(),
  url: z.string(),
  active: z.boolean(),
  created_at: z.string(),
});

export const webhookListSchema = z.object({
  data: z.array(webhookSchema),
  paging: z.object({
    pages: z.object({ current: z.int().min(1), last: z.int().min(1) }),
    results: z.object({ total: z.int().min(0), limitation: z.int().min(1) }),
  }),
});

export const errorTypeSchema = z.enum([
  'BadRequestException',
  'AuthenticationException',
  'NotFoundException',
  'TokenMismatchException',
  'ValidationException',
]);

export const errorEnvelopeSchema = z.object({
  error: z.object({
    type: errorTypeSchema,
    message: z.string(),
    // External null is normalised to undefined at the boundary.
    payload: z
      .record(z.string(), z.array(z.string()))
      .nullish()
      .transform((payload) => payload ?? undefined),
  }),
});

export const loginResponseSchema = z.object({ device_session_token: z.string() });

export const loginInputSchema = z.object({
  email: z.email('Введіть коректний email'),
  password: z.string().min(1, 'Введіть пароль'),
});

function isHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const { protocol } = new URL(value);
  return protocol === 'http:' || protocol === 'https:';
}

export const webhookInputSchema = z.object({
  name: z.string().trim().min(1, 'Введіть назву'),
  url: z.string().trim().refine(isHttpUrl, 'Введіть коректний URL (http:// або https://)'),
});

export type User = z.infer<typeof userSchema>;
export type Webhook = z.infer<typeof webhookSchema>;
export type WebhookList = z.infer<typeof webhookListSchema>;
export type ErrorType = z.infer<typeof errorTypeSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type WebhookInput = z.infer<typeof webhookInputSchema>;
