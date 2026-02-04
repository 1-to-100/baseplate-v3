'use client';

import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import CircularProgress from '@mui/joy/CircularProgress';
import Avatar from '@mui/joy/Avatar';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import type { KeyContactsSectionProps } from './types';

export default function KeyContactsSection({
  people,
  isLoading,
  onShowAllLeads,
  showAllLeadsButton = true,
}: KeyContactsSectionProps): React.JSX.Element {
  // Process people to extract relevant display data
  const processedPeople = React.useMemo(
    () =>
      people.slice(0, 5).map((p) => {
        const company =
          Array.isArray(p.companies) && p.companies.length > 0 ? p.companies[0] : undefined;
        // Handle emails which can be string or string[]
        const email = Array.isArray(p.emails)
          ? p.emails[0] || 'N/A'
          : typeof p.emails === 'string'
            ? p.emails
            : 'N/A';
        return {
          id: p.id,
          name: p.name || 'N/A',
          title: company?.title || (Array.isArray(p.titles) ? p.titles[0] : p.titles?.[0]) || 'N/A',
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
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size='sm' />
        </Box>
      ) : processedPeople.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography
            sx={{
              fontSize: '14px',
              color: 'var(--joy-palette-text-secondary)',
            }}
          >
            No contacts available
          </Typography>
        </Box>
      ) : (
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
            sx={{
              width: '100%',
              '& thead th': {
                bgcolor: 'var(--joy-palette-background-level1)',
                fontWeight: '600',
                fontSize: '12px',
                color: 'var(--joy-palette-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              },
              '& tbody tr': {
                '&:hover': {
                  bgcolor: 'var(--joy-palette-background-level1)',
                },
              },
              '& tbody td': {
                fontSize: '14px',
                py: 1.5,
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 50 }}></th>
                <th>Name</th>
                <th>Title</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {processedPeople.map((person) => (
                <tr key={person.id}>
                  <td>
                    <Avatar size='sm' sx={{ width: 32, height: 32 }}>
                      {person.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </td>
                  <td>
                    <Typography
                      sx={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: 'var(--joy-palette-text-primary)',
                      }}
                    >
                      {person.name}
                    </Typography>
                  </td>
                  <td>
                    <Typography
                      sx={{
                        fontSize: '14px',
                        color: 'var(--joy-palette-text-secondary)',
                      }}
                    >
                      {person.title}
                    </Typography>
                  </td>
                  <td>
                    <Typography
                      sx={{
                        fontSize: '14px',
                        color: 'var(--joy-palette-text-secondary)',
                      }}
                    >
                      {person.email}
                    </Typography>
                  </td>
                  <td>
                    <Typography
                      sx={{
                        fontSize: '14px',
                        color: 'var(--joy-palette-text-secondary)',
                      }}
                    >
                      {person.phone}
                    </Typography>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
