export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface PaginationResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const total = items.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize

  return {
    items: items.slice(start, end),
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

export function getPaginationQuery(page: number, pageSize: number) {
  return {
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
  }
}
