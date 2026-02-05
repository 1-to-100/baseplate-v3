'use client';

import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Link from '@mui/joy/Link';
import IconButton from '@mui/joy/IconButton';
import { Bug } from '@phosphor-icons/react/dist/ssr';
import type { CompanyOverviewSectionProps } from './types';

const formatRevenue = (revenue?: number, currency?: string) => {
  if (!revenue) return 'N/A';
  const currencySymbol = currency === 'USD' ? '$' : currency || '$';
  if (revenue >= 1000000000) {
    return `~${currencySymbol}${(revenue / 1000000000).toFixed(1)}B`;
  }
  if (revenue >= 1000000) {
    return `~${currencySymbol}${(revenue / 1000000).toFixed(1)}M`;
  }
  return `${currencySymbol}${revenue.toLocaleString()}`;
};

export default function CompanyOverviewSection({
  company,
  onDebugClick,
  showDebugButton = true,
}: CompanyOverviewSectionProps): React.JSX.Element {
  const headquarters = [company.region, company.country]
    .filter(Boolean)
    .map((s) => s?.slice(0, 100))
    .join(', ');

  return (
    <Box
      sx={{
        mb: 4,
        borderBottom: '1px solid var(--joy-palette-divider)',
        pb: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: '18px',
            fontWeight: '500',
            color: 'var(--joy-palette-text-primary)',
          }}
        >
          Company Overview
        </Typography>
        {showDebugButton && onDebugClick && (
          <IconButton
            size='sm'
            onClick={onDebugClick}
            sx={{
              bgcolor: 'var(--joy-palette-background-level2)',
              '&:hover': {
                bgcolor: 'var(--joy-palette-background-level3)',
              },
            }}
          >
            <Bug size={18} />
          </IconButton>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mb: 0.5,
              }}
            >
              Industry
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'var(--joy-palette-text-primary)' }}>
              {company.categories && company.categories.length > 0
                ? company.categories.join(', ')
                : 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mb: 0.5,
              }}
            >
              Founded
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'var(--joy-palette-text-primary)' }}>
              N/A
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mb: 0.5,
              }}
            >
              Revenue
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'var(--joy-palette-text-primary)' }}>
              {formatRevenue(company.revenue, company.currencyCode)}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mb: 0.5,
              }}
            >
              Website
            </Typography>
            {company.website ? (
              <Link
                href={company.website}
                target='_blank'
                rel='noopener noreferrer'
                sx={{
                  fontSize: '14px',
                  color: 'var(--joy-palette-primary-600)',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {company.website}
              </Link>
            ) : (
              <Typography sx={{ fontSize: '14px', color: 'var(--joy-palette-text-secondary)' }}>
                N/A
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mb: 0.5,
              }}
            >
              Headquarters
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'var(--joy-palette-text-primary)' }}>
              {headquarters || 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mb: 0.5,
              }}
            >
              Employees
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'var(--joy-palette-text-primary)' }}>
              {company.employees ? company.employees.toLocaleString() : 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mb: 0.5,
              }}
            >
              Company Type
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'var(--joy-palette-text-primary)' }}>
              {company.type || 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: '300',
                color: 'var(--joy-palette-text-secondary)',
                mb: 0.5,
              }}
            >
              Emails
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'var(--joy-palette-text-primary)' }}>
              {company.email || 'N/A'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
