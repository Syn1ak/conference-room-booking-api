/** One page of a longer list. */
export interface IPage<T> {
  items: T[];
  /** The page number, starting at 1. */
  page: number;
  pageSize: number;
  totalCount: number;
}
