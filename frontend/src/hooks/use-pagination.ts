import * as React from 'react';

export interface PaginationItem {
  onClick: (event: React.MouseEvent) => void;
  type: PaginationItemType;
  page: number | null;
  selected?: boolean;
  disabled?: boolean;
  'aria-current'?: 'true';
}

export type PaginationItemType = 'first' | 'previous' | 'page' | 'start-ellipsis' | 'end-ellipsis' | 'next' | 'last';

export interface PaginationHookProps {
  boundaryCount?: number;
  count?: number;
  defaultPage?: number;
  disabled?: boolean;
  hideNextButton?: boolean;
  hidePrevButton?: boolean;
  onChange?: (event: React.MouseEvent, value: number | null) => void;
  page?: number;
  showFirstButton?: boolean;
  showLastButton?: boolean;
  siblingCount?: number;
}

// https://github.com/mui/material-ui/blob/master/packages/mui-material/src/usePagination/usePagination.js
export function usePagination({
  boundaryCount = 1,
  count = 1,
  defaultPage = 1,
  disabled = false,
  hideNextButton = false,
  hidePrevButton = false,
  onChange: handleChange,
  page: pageProp,
  showFirstButton = false,
  showLastButton = false,
  siblingCount = 1,
  ...props
}: PaginationHookProps): { items: PaginationItem[] } {
  const [page, setPage] = React.useState<number>(pageProp || defaultPage);

  React.useEffect((): void => {
    setPage(pageProp || defaultPage);
  }, [defaultPage, pageProp]);

  const handleClick = (event: React.MouseEvent, value: number | null): void => {
    if (!value) {
      return;
    }

    if (!pageProp) {
      setPage(value);
    }

    if (handleChange) {
      handleChange(event, value);
    }
  };

  // https://dev.to/namirsab/comment/2050
  const range = (start: number, end: number): number[] => {
    const length = end - start + 1;
    return Array.from({ length }, (_, i) => start + i);
  };

  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count);

  const siblingsStart = Math.max(
    Math.min(
      // Natural start
      page - siblingCount,
      // Lower boundary when page is high
      count - boundaryCount - siblingCount * 2 - 1
    ),
    // Greater than startPages
    boundaryCount + 2
  );

  const siblingsEnd = Math.min(
    Math.max(
      // Natural end
      page + siblingCount,
      // Upper boundary when page is low
      boundaryCount + siblingCount * 2 + 2
    ),
    // Less than endPages
      endPages?.[0] !== undefined ? endPages[0] - 2 : count - 1
  );

  // Basic list of items to render
  // e.g. itemList = ['first', 'previous', 1, 'ellipsis', 4, 5, 6, 'ellipsis', 10, 'next', 'last']
  const itemList = [
    ...(showFirstButton ? ['first'] : []),
    ...(hidePrevButton ? [] : ['previous']),
    ...startPages,

    // Start ellipsis
    ...(siblingsStart > boundaryCount + 2
      ? ['start-ellipsis']
      : boundaryCount + 1 < count - boundaryCount
        ? [boundaryCount + 1]
        : []),

    // Sibling pages
    ...range(siblingsStart, siblingsEnd),

    // End ellipsis
    ...(siblingsEnd < count - boundaryCount - 1
      ? ['end-ellipsis']
      : count - boundaryCount > boundaryCount
        ? [count - boundaryCount]
        : []),

    ...endPages,
    ...(hideNextButton ? [] : ['next']),
    ...(showLastButton ? ['last'] : []),
  ] as (number | Omit<PaginationItemType, 'page'>)[];

  // Map the button type to its page number
  const buttonPage = (type: Omit<PaginationItemType, 'page'>): number | null => {
    switch (type) {
      case 'first':
        return 1;
      case 'previous':
        return page - 1;
      case 'next':
        return page + 1;
      case 'last':
        return count;
      default:
        return null;
    }
  };

  // Convert the basic item list to PaginationItem props objects
  const items = itemList.map((item) => {
    return typeof item === 'number'
      ? {
          onClick: (event: React.MouseEvent): void => {
            handleClick(event, item);
          },
          type: 'page',
          page: item,
          selected: item === page,
          disabled,
          'aria-current': item === page ? 'true' : undefined,
        }
      : {
          onClick: (event: React.MouseEvent): void => {
            handleClick(event, buttonPage(item));
          },
          type: item,
          page: buttonPage(item),
          selected: false,
          disabled:
            disabled ||
            (!item.includes('ellipsis') && (item === 'next' || item === 'last' ? page >= count : page <= 1)),
        };
  }) as PaginationItem[];

  return { items, ...props };
}
