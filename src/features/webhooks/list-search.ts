import { z } from 'zod';

export const listSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  search: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().trim().max(100))
    .default('')
    .catch(''),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

export const listSearchDefaults = { page: 1, search: '' } satisfies ListSearch;
