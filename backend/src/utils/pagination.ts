import { z } from 'zod';

/**
 * Calculates pagination metadata
 * @param page - Current page (1-based, defaults to 1)
 * @param size - Items per page (defaults to 10, max 100)
 * @param total - Total number of items
 * @returns Pagination metadata object
 */
export function calculatePagination(
  page: number = 1,
  size: number = 10,
  total: number
): {
  total: number;
  page: number;
  size: number;
  total_pages: number;
} {
  // Clamp page to minimum 1
  const currentPage = Math.max(1, Math.floor(page));

  // Clamp size between 1 and 100
  const pageSize = Math.max(1, Math.min(100, Math.floor(size)));

  // Calculate total pages
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    total,
    page: currentPage,
    size: pageSize,
    total_pages: totalPages,
  };
}

/**
 * Zod schema for pagination query parameters
 * Coerces string values to numbers and applies defaults
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  size: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
