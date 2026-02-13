'use client';

import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import CircularProgress from '@mui/joy/CircularProgress';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import type { KeyContactsSectionProps } from './types';

export default function KeyContactsSection({
  people,
  isLoading,
  onShowAllLeads,
  showAllLeadsButton = true,
}: KeyContactsSectionProps): React.JSX.Element {
  const processedPeople = React.useMemo(
    () =>
      people.slice(0, 5).map((p) => {
        const company =
          Array.isArray(p.companies) && p.companies.length > 0 ? p.companies[0] : undefined;
        const email = Array.isArray(p.emails)
          ? p.emails[0] || 'N/A'
          : (p.emails as string) || 'N/A';
        return {
          id: p.id,
          name: p.name || 'N/A',
          title: company?.title || (Array.isArray(p.titles) ? p.titles[0] : undefined) || 'N/A',
          email,
          phone: Array.isArray(p.phones) && p.phones.length > 0 ? p.phones[0] : 'N/A',
        };
      }),
    [people]
  );

  return (
    <Box>
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
          Key Contacts
        </Typography>
        {showAllLeadsButton && processedPeople.length > 0 && onShowAllLeads && (
          <Button
            variant='plain'
            size='sm'
            endDecorator={<ArrowRight size={16} color='var(--joy-palette-primary-300)' />}
            onClick={onShowAllLeads}
            sx={{
              fontSize: '14px',
              fontWeight: '500',
              textTransform: 'none',
            }}
          >
            All leads
          </Button>
        )}
      </Box>
      <Box
        sx={{
          overflowX: 'auto',
          width: '100%',
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'var(--joy-palette-background-level1)',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'var(--joy-palette-background-level3)',
            borderRadius: 4,
            '&:hover': {
              bgcolor: 'var(--joy-palette-background-level4)',
            },
          },
        }}
      >
        <Table
          aria-label='key contacts table'
          sx={{
            minWidth: 800,
            width: '100%',
            tableLayout: 'fixed',
            '& th, & td': {
              px: { xs: 1, sm: 2 },
            },
            '& tbody td': {
              color: 'var(--joy-palette-text-secondary)',
              fontWeight: 300,
            },
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '20%' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: '600' }}>Name</Typography>
              </th>
              <th style={{ textAlign: 'left', width: '30%' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: '600' }}>Title</Typography>
              </th>
              <th style={{ textAlign: 'left', width: '20%' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: '600' }}>Phone number</Typography>
              </th>
              <th style={{ textAlign: 'left', width: '30%' }}>
                <Typography sx={{ fontSize: '14px', fontWeight: '600' }}>Email</Typography>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      py: 2,
                    }}
                  >
                    <CircularProgress size='sm' />
                  </Box>
                </td>
              </tr>
            ) : processedPeople.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <Typography
                    sx={{
                      fontSize: '14px',
                      textAlign: 'center',
                      py: 2,
                    }}
                  >
                    No key contacts yet
                  </Typography>
                </td>
              </tr>
            ) : (
              processedPeople.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Typography sx={{ fontSize: '14px' }}>{lead.name}</Typography>
                  </td>
                  <td>
                    <Typography sx={{ fontSize: '14px' }}>{lead.title}</Typography>
                  </td>
                  <td>
                    <Typography sx={{ fontSize: '14px' }}>{lead.phone}</Typography>
                  </td>
                  <td>
                    <Typography
                      sx={{
                        fontSize: '14px',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {lead.email}
                    </Typography>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Box>
    </Box>
  );
}
