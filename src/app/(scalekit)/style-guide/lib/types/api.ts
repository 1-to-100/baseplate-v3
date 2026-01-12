/**
 * Generic API result wrapper for Visual OS APIs
 */
export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
    };

export type Id = string;

export type ListParams = {
  limit?: number;
  offset?: number;
  search?: string;
  orderBy?: { column: string; ascending?: boolean };
};
