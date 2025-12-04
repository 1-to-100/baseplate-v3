'use client';

import * as React from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { usePathname } from 'next/navigation';

export interface SearchContextType {
  searchValue: string;
  setSearchValue: (value: string) => void;
  clearSearch: () => void;
}

const SearchContext = React.createContext<SearchContextType | undefined>(undefined);

export interface SearchProviderProps {
  children: React.ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps): React.JSX.Element {
  const [searchValue, setSearchValue] = React.useState<string>('');
  const pathname = usePathname();

  const clearSearch = React.useCallback(() => {
    setSearchValue('');
  }, []);

  React.useEffect(() => {
    setSearchValue('');
  }, [pathname]);

  const contextValue = React.useMemo<SearchContextType>(
    () => ({
      searchValue,
      setSearchValue,
      clearSearch,
    }),
    [searchValue, clearSearch]
  );

  return <SearchContext.Provider value={contextValue}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextType {
  const context = React.useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
