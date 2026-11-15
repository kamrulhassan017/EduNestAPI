export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Shape of every successful response. */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta: PaginationMeta | null;
}

/** Shape of every error response (produced by AllExceptionsFilter). */
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/** What a service returns for a paginated list; the interceptor unwraps it. */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
