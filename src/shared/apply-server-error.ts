import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/api/api-error';

export function applyServerError<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  isField: (field: string) => field is FieldPath<TFieldValues>,
  genericMessage: string,
): void {
  if (!isApiError(error)) {
    setError('root.server', { message: genericMessage });
    return;
  }
  const { info } = error;
  switch (info.type) {
    case 'ValidationException': {
      const entries = Object.entries(info.fields).flatMap(([field, [message]]) =>
        message === undefined ? [] : [{ field, message }],
      );
      let rootMessage: string | undefined;
      for (const { field, message } of entries) {
        if (isField(field)) setError(field, { message });
        else rootMessage ??= message;
      }
      rootMessage ??= entries.length === 0 ? info.message : undefined;
      if (rootMessage !== undefined) setError('root.server', { message: rootMessage });
      return;
    }
    case 'BadRequestException':
    case 'AuthenticationException':
    case 'NotFoundException':
    case 'TokenMismatchException':
    case 'NetworkError':
    case 'SchemaMismatch':
    case 'UnknownError':
      setError('root.server', { message: genericMessage });
      return;
    default:
      info satisfies never;
  }
}
