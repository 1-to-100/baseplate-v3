'use client';

import * as React from 'react';
import Input from '@mui/joy/Input';
import Typography from '@mui/joy/Typography';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { useSearch } from '@/contexts/search-context';

interface SearchInputProps {
  onSearch: (value: string) => void;
  style?: React.CSSProperties;
}

export default function SearchInput({ onSearch, style }: SearchInputProps) {
  const [error, setError] = React.useState(false);
  const { searchValue, setSearchValue } = useSearch();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value.length <= 300) {
      setSearchValue(value);
      setError(false);
      onSearch(value);
    } else {
      setError(true);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSearchValue('');
      onSearch('');
      setError(false);
    }
  };

  return (
    <div>
      <Input
        startDecorator={<SearchIcon />}
        placeholder='Search'
        value={searchValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={style}
        sx={{
          width: { xs: '100%', sm: '200px', md: '300px' },
          display: { sm: 'flex' },
          bgcolor: 'var(--NavItem-active-background)',
          borderRadius: '20px',
          border: '1px solid var(--joy-palette-divider)',
          '&:hover': {
            background: 'var(--joy-palette-background-level1)',
          },
          '& .MuiInput-input': {
            padding: '0px 0px',
            fontSize: '14px',
            color: 'var(--joy-palette-neutral-out)',
          },
          '& .MuiInput-startDecorator': {
            color: 'var(--joy-palette-neutral-out)',
            marginLeft: '2px',
          },
        }}
      />
      {error && (
        <Typography color='danger' sx={{ mt: 1, fontSize: '14px' }}>
          Search input is too long. Please shorten your query.
        </Typography>
      )}
    </div>
  );
}
