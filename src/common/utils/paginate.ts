import { PaginatedResult } from '../interfaces/api-response.interface';

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

export function isPaginatedResult(
  value: unknown,
): value is PaginatedResult<unknown> {
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
