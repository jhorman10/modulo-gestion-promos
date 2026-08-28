import type { UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodSchema } from 'zod';

export interface UseFormValidationReturn<T extends FieldValues> extends UseFormReturn<T> {
  getFieldError: (name: Path<T>) => string | undefined;
  hasFieldError: (name: Path<T>) => boolean;
}

/**
 * Custom hook wrapping react-hook-form with Zod resolver.
 * Provides typed form handling with built-in error helpers.
 */
export function useFormValidation<T extends FieldValues>(
  schema: ZodSchema<T>,
  defaultValues?: Partial<T>
): UseFormValidationReturn<T> {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    defaultValues: defaultValues as any,
    mode: 'onChange',
  });

  const getFieldError = (name: Path<T>): string | undefined => {
    const error = form.formState.errors[name];
    return error?.message as string | undefined;
  };

  const hasFieldError = (name: Path<T>): boolean => {
    return !!form.formState.errors[name];
  };

  return {
    ...form,
    getFieldError,
    hasFieldError,
  } as UseFormValidationReturn<T>;
}
