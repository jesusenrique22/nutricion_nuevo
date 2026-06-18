export const DEFAULT_PAGE_SIZE = 10;

export type ListPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
