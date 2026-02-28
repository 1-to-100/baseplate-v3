'use client';

import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Avatar from '@mui/joy/Avatar';
import IconButton from '@mui/joy/IconButton';
import Button from '@mui/joy/Button';
import {
  DotsThreeVertical,
  ArrowsClockwise,
  PencilSimple,
  Funnel,
} from '@phosphor-icons/react/dist/ssr';
import type { CompanyDetailsHeaderProps } from './types';

export default function CompanyDetailsHeader({
  company,
  breadcrumbs,
  onEditClick,
  onMenuOpen,
  onRefreshClick,
  showEditButton = true,
  showMenuButton = true,
  showFilterButton = false,
  onFilterClick,
}: CompanyDetailsHeaderProps): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Box sx={{ mb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            mb: 1,
          }}
        >
          <Avatar src={company.logo} alt={company.name} sx={{ width: 48, height: 48 }}>
            {company.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontSize: '28px',
                fontWeight: '600',
                color: 'var(--joy-palette-text-primary)',
                mb: 1,
                whiteSpace: 'wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto',
              }}
            >
              {company.name.slice(0, 80)}
            </Typography>
          </Box>
        </Box>
        {breadcrumbs}
      </Box>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          mb: 3,
          justifyContent: 'flex-end',
          ml: { xs: 'auto', lg: 'unset' },
        }}
      >
        {showMenuButton && onMenuOpen && (
          <IconButton
            size='sm'
            onClick={onMenuOpen}
            sx={{
              bgcolor: 'var(--joy-palette-background-level2)',
              '&:hover': {
                bgcolor: 'var(--joy-palette-background-level3)',
              },
            }}
          >
            <DotsThreeVertical size={20} />
          </IconButton>
        )}
        <IconButton
          size='sm'
          onClick={onRefreshClick}
          disabled={!onRefreshClick}
          sx={{
            bgcolor: 'var(--joy-palette-background-level2)',
            '&:hover': {
              bgcolor: 'var(--joy-palette-background-level3)',
            },
          }}
        >
          <ArrowsClockwise size={18} />
        </IconButton>
        {showFilterButton && onFilterClick && (
          <Box
            component='button'
            onClick={onFilterClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              border: '1px solid var(--joy-palette-divider)',
              borderRadius: '20px',
              color: 'var(--joy-palette-text-primary)',
              bgcolor: 'var(--joy-palette-background-surface)',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              width: { xs: '100%', sm: 'auto' },
              mb: { xs: 1, sm: 0 },
              '&:hover': {
                background: 'var(--joy-palette-background-mainBg)',
              },
            }}
          >
            <Funnel size={16} />
            Filters
          </Box>
        )}
        {showEditButton && onEditClick && (
          <Button
            size='sm'
            startDecorator={<PencilSimple size={16} />}
            onClick={onEditClick}
            sx={{
              bgcolor: 'var(--joy-palette-primary-600)',
              color: 'white',
              '&:hover': {
                bgcolor: 'var(--joy-palette-primary-700)',
              },
              width: { xs: 38, sm: 'auto' },
              height: { xs: 38, sm: 'auto' },
              minWidth: { xs: 38, sm: 'auto' },
              '& .MuiButton-startDecorator': {
                margin: { xs: 0, sm: '0 8px 0 0' },
              },
            }}
          >
            <Box
              component='span'
              sx={{
                display: { xs: 'none', sm: 'inline' },
              }}
            >
              Edit
            </Box>
          </Button>
        )}
      </Box>
    </Box>
  );
}
