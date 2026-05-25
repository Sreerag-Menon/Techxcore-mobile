/**
 * Generic API response shapes returned by all backend endpoints.
 */

/** Standard single-item API response wrapper */
export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

/** Paginated list response wrapper */
export interface PaginatedResponse<T> {
  status: boolean;
  message: string;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Shape of error payloads from the API */
export interface ApiError {
  status: boolean;
  message: string;
  error?: string;
  statusCode?: number;
}
