import type { ComponentProps } from 'react';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

interface FormFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  error: string | undefined;
}

export function FormField({ id, label, error, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        {...inputProps}
      />
      {error !== undefined && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
