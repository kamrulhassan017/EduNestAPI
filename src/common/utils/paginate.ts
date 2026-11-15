import { PaginatedResult } from '../interfaces/api-response.interface';

/**
 * Builds a paginated result. Typical use in a service:
 *
 *   const [items, total] = await this.repo.findAndCount({
 *     skip: (query.page - 1) * query.limit,
 *     take: query.limit,
 *   });
 *   return paginate(items, total, query.page, query.limit);
 *
 * The response interceptor turns it into { success, message, data: items, meta }.
 */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
  };
}

export function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.items) &&
    v.meta !== null &&
    typeof v.meta === 'object' &&
    'total' in v.meta &&
    Object.keys(v).length === 2
  );
}
