import { z } from 'zod';

export const SEARCH_MAX_LENGTH = 100;

export const listSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  search: z
    .union([z.string(), z.number(), z.boolean()])
    .transform((value) => String(value).trim().slice(0, SEARCH_MAX_LENGTH))
    .default('')
    .catch(''),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

export const listSearchDefaults = { page: 1, search: '' } satisfies ListSearch;
