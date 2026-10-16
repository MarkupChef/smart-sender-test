import type { ZodError } from 'zod';
import { errorEnvelopeSchema } from './schemas';

export type ApiErrorInfo =
  | { type: 'BadRequestException'; message: string }
  | { type: 'AuthenticationException'; message: string }
  | { type: 'NotFoundException'; message: string }
  | { type: 'TokenMismatchException'; message: string }
  | { type: 'ValidationException'; message: string; fields: Record<string, string[]> }
  | { type: 'NetworkError'; message: string }
  | { type: 'SchemaMismatch'; message: string; issues: ZodError['issues'] }
  | { type: 'UnknownError'; status: number; message: string };

export class ApiError extends Error {
  readonly info: ApiErrorInfo;

  constructor(info: ApiErrorInfo) {
    super(info.message);
    this.name = 'ApiError';
    this.info = info;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = errorEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return new ApiError({
      type: 'UnknownError',
      status: response.status,
      message: `Unexpected response (HTTP ${String(response.status)}).`,
    });
  }

  const { type, message, payload } = parsed.data.error;
  switch (type) {
    case 'ValidationException':
      return new ApiError({ type, message, fields: payload ?? {} });
    case 'BadRequestException':
    case 'AuthenticationException':
    case 'NotFoundException':
    case 'TokenMismatchException':
      return new ApiError({ type, message });
    default:
      return type satisfies never;
  }
}
