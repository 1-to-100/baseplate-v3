'use client';

import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Avatar from '@mui/joy/Avatar';
import IconButton from '@mui/joy/IconButton';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import Checkbox from '@mui/joy/Checkbox';
import { DotsThreeVertical, ArrowLeft, PencilSimple, Funnel } from '@phosphor-icons/react/dist/ssr';
import Pagination from '@/components/dashboard/layout/pagination';
import type { CompanyLeadsViewProps } from './types';

export default function CompanyLeadsView({
  company,
  breadcrumbs,
  people,
  totalCount,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onBackClick,
  onEditClick,
  onMenuOpen,
  onFilterClick,
  showEditButton = true,
  showMenuButton = true,
  selectedRows,
  handleRowCheckboxChange,
  handleSelectAllChange,
  handleMenuOpen,
  handleMenuClose,
  menuRowIndex,
  anchorEl,
  handleNavigation,
  handleOpenPersonPopover,
  handleEdit,
  handleDeletePerson,
  openPersonPopoverIdx,
  personPopoverAnchorEl,
  handleClosePersonPopover,
}: CompanyLeadsViewProps): React.JSX.Element {
  const allSelected = people.length > 0 && selectedRows.length === people.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < people.length;

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
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
                }}
              >
                {company.name}
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
          {showEditButton && onEditClick && (
            <Button
              variant='solid'
              color='primary'
              size='sm'
              startDecorator={<PencilSimple size={18} />}
              onClick={onEditClick}
            >
              Edit
            </Button>
          )}
          {onFilterClick && (
            <IconButton
              size='sm'
              onClick={onFilterClick}
              sx={{
                bgcolor: 'var(--joy-palette-background-level2)',
                '&:hover': {
                  bgcolor: 'var(--joy-palette-background-level3)',
                },
              }}
            >
              <Funnel size={20} />
            </IconButton>
          )}
          <Button
            variant='outlined'
            size='sm'
            startDecorator={<ArrowLeft size={18} />}
            onClick={onBackClick}
          >
            Back
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Box
        sx={{
          borderTop: '1px solid var(--joy-palette-divider)',
          mt: { xs: 3, md: 0 },
        }}
      >
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
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
                <th style={{ width: 50 }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAllChange}
                    sx={{ verticalAlign: 'middle' }}
                  />
                </th>
                <th style={{ width: 50 }}></th>
                <th>Name</th>
                <th>Title</th>
                <th>Email</th>
                <th>Phone</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <Typography>Loading...</Typography>
                  </td>
                </tr>
              ) : people.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <Typography sx={{ color: 'var(--joy-palette-text-secondary)' }}>
                      No contacts available
                    </Typography>
                  </td>
                </tr>
              ) : (
                people.map((person, index) => {
                  const email = Array.isArray(person.emails)
                    ? person.emails[0] || 'N/A'
                    : typeof person.emails === 'string'
                      ? person.emails
                      : 'N/A';
                  const title =
                    (Array.isArray(person.titles) ? person.titles[0] : person.titles?.[0]) || 'N/A';
                  const phone =
                    Array.isArray(person.phones) && person.phones.length > 0
                      ? person.phones[0]
                      : 'N/A';

                  return (
                    <tr key={person.id}>
                      <td>
                        <Checkbox
                          checked={selectedRows.includes(String(person.id))}
                          onChange={() => handleRowCheckboxChange(String(person.id))}
                          sx={{ verticalAlign: 'middle' }}
                        />
                      </td>
                      <td>
                        <Avatar
                          size='sm'
                          src={person.image || undefined}
                          sx={{ width: 32, height: 32 }}
                        >
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
                          {title}
                        </Typography>
                      </td>
                      <td>
                        <Typography
                          sx={{
                            fontSize: '14px',
                            color: 'var(--joy-palette-text-secondary)',
                          }}
                        >
                          {email}
                        </Typography>
                      </td>
                      <td>
                        <Typography
                          sx={{
                            fontSize: '14px',
                            color: 'var(--joy-palette-text-secondary)',
                          }}
                        >
                          {phone}
                        </Typography>
                      </td>
                      <td>
                        <IconButton
                          size='sm'
                          variant='plain'
                          onClick={(e) => handleMenuOpen(e, index)}
                          sx={{
                            minWidth: 0,
                            p: 0.5,
                            borderRadius: '50%',
                          }}
                        >
                          <DotsThreeVertical size={16} />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Box>

        {totalPages > 1 && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={onPageChange}
              disabled={isLoading}
            />
          </Box>
        )}
      </Box>
    </>
  );
}
