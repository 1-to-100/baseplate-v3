import { useSearch } from '@/contexts/search-context';
import { useDebounce } from './use-debounce';
import { useEffect } from 'react';

export function useGlobalSearch() {
  const { searchValue, setSearchValue, clearSearch } = useSearch();
  const debouncedSearchValue = useDebounce(searchValue, 300);

  return {
    searchValue,
    debouncedSearchValue,
    setSearchValue,
    clearSearch,
  };
}
