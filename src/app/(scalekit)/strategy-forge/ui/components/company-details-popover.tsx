'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Box from '@mui/joy/Box';
import Avatar from '@mui/joy/Avatar';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Link from '@mui/joy/Link';
import Popper from '@mui/material/Popper';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { DotsThreeVertical as DotsIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import { ArrowUpRight, Lightbulb } from '@phosphor-icons/react/dist/ssr';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { useRouter } from 'next/navigation';
import { paths } from '@/paths';
import type { CompanyItem } from '../../lib/types/company';
import { getCompanyById } from '../../lib/api/companies';
import EditCompanyModal from '@/components/dashboard/modals/EditCompanyModal';
import AddCompanyToListModal from '@/components/dashboard/modals/AddCompanyToListModal';

interface CompanyDetailsPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  companyId: number;
  company_id?: string;
  /** When provided, "Full Profile" navigates to segment company page (Segments > Segment Name > Company) */
  segmentId?: string;
}

export default function CompanyDetailsPopover({
  open,
  onClose,
  anchorEl,
  companyId,
  company_id,
  segmentId,
}: CompanyDetailsPopoverProps) {
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);
  const router = useRouter();
  const menuRef = React.useRef<HTMLDivElement>(null);

  const {
    data: company,
    isLoading: companyLoading,
    error: companyError,
  } = useQuery({
    queryKey: ['company', company_id || companyId, 'popover'],
    queryFn: async () => {
      if (!company_id) {
        throw new Error('company_id is required to fetch company details');
      }
      return getCompanyById(company_id);
    },
    enabled: !!company_id && open,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleMenuClose();
      }
    };

    if (menuAnchorEl) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      if (menuAnchorEl) {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [menuAnchorEl]);

  useEffect(() => {
    if (!open) {
      setEditModalOpen(false);
      setAddToListModalOpen(false);
    }
  }, [open]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleEdit = () => {
    setEditModalOpen(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    handleMenuClose();
  };

  const handleAddToList = () => {
    setAddToListModalOpen(true);
    handleMenuClose();
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
  };

  const handleAddToListModalClose = () => {
    setAddToListModalOpen(false);
  };

  const handleViewProfile = (company: CompanyItem) => {
    const companyIdStr = company.company_id ?? String(company.id);
    const url =
      segmentId && companyIdStr
        ? paths.strategyForge.segments.companyDetails(segmentId, companyIdStr)
        : paths.strategyForge.companies.details(companyIdStr);
    router.push(url);
    onClose();
  };

  const formatEmployees = (employees?: number) => {
    if (!employees) return 'N/A';
    if (employees >= 1000) {
      return `${(employees / 1000).toFixed(0)}.${((employees % 1000) / 100).toFixed(0)}.000`;
    }
    return employees.toString();
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'N/A';
    return '+1 (875) 567 000';
  };

  const menuItemStyle = {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '400',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'var(--joy-palette-text-primary)',
    '&:hover': { backgroundColor: 'var(--joy-palette-background-mainBg)' },
    gap: '14px',
  };

  if (!open || !anchorEl) {
    return null;
  }

  return (
    <>
      <Sheet
        data-popover='true'
        sx={{
          position: 'fixed',
          top: { xs: '25%', sm: '16%', lg: '21%' },
          right: { xs: '5%', sm: '25px', lg: '48px' },
          width: { xs: '90%', sm: 600 },
          maxWidth: '90vw',
          height: '65vh',
          borderRadius: '8px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
          overflow: 'auto',
          zIndex: 1300,
          border: '1px solid var(--joy-palette-divider)',
        }}
      >
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction='row'
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: { xs: 1, sm: 2 },
              borderBottom: '1px solid var(--joy-palette-divider)',
              paddingBottom: { xs: 1, sm: 2 },
            }}
          >
            <Typography
              level='title-lg'
              sx={{ fontSize: { xs: '18px', sm: '22px', md: '24px' } }}
              fontWeight='600'
            >
              Company Details
            </Typography>
            <Button variant='plain' size='sm' onClick={onClose} sx={{ p: { xs: 0.5, sm: 1 } }}>
              <XIcon fontSize='16px' weight='bold' />
            </Button>
          </Stack>

          <Stack
            direction='column'
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{
              width: '100%',
              paddingBottom: { xs: 1, sm: 2 },
              mb: { xs: 1, sm: 0 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: '8px', sm: '16px' },
                  flexDirection: { xs: 'row', sm: 'row' },
                }}
              >
                {companyLoading ? (
                  <Avatar
                    sx={{
                      width: { xs: 48, sm: 64 },
                      height: { xs: 48, sm: 64 },
                      borderRadius: '8px',
                      backgroundColor: 'background.level1',
                      color: 'text.primary',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularProgress size='sm' />
                  </Avatar>
                ) : companyError || !company ? (
                  <Avatar
                    sx={{
                      width: { xs: 48, sm: 64 },
                      height: { xs: 48, sm: 64 },
                      borderRadius: '8px',
                      backgroundColor: 'background.level1',
                      color: 'text.primary',
                      fontWeight: '600',
                    }}
                  >
                    ?
                  </Avatar>
                ) : company.logo ? (
                  <Avatar
                    src={company.logo}
                    sx={{
                      width: { xs: 48, sm: 64 },
                      height: { xs: 48, sm: 64 },
                      borderRadius: '8px',
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: { xs: 48, sm: 64 },
                      height: { xs: 48, sm: 64 },
                      borderRadius: '8px',
                      backgroundColor: 'background.level1',
                      color: 'text.primary',
                      fontWeight: '600',
                    }}
                  >
                    {company.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                )}
                <Stack alignItems={{ xs: 'center', sm: 'flex-start' }}>
                  <Typography
                    level='body-lg'
                    sx={{
                      fontSize: { xs: '16px', sm: '18px' },
                      color: 'var(--joy-palette-text-primary)',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                      maxWidth: '100%',
                      overflowWrap: 'break-word',
                      textOverflow: 'ellipsis',
                    }}
                    fontWeight='600'
                  >
                    {company?.name ? `${company.name.slice(0, 45)}...` : ''}
                  </Typography>
                  <Typography
                    level='body-sm'
                    sx={{
                      color: 'var(--joy-palette-text-secondary)',
                      fontSize: { xs: '12px', sm: '14px' },
                    }}
                  >
                    {company?.categories?.[0] || ''}
                  </Typography>
                </Stack>
              </Box>

              <Stack direction='row' spacing={1}>
                <Button
                  variant='plain'
                  size='sm'
                  endDecorator={<ArrowUpRight fontSize='18px' />}
                  sx={{
                    color: 'primary.500',
                    fontSize: { xs: '12px', sm: '14px' },
                    px: { xs: 1, sm: 1.5 },
                  }}
                  onClick={() => company && handleViewProfile(company)}
                >
                  Full Profile
                </Button>
                <Button
                  variant='plain'
                  size='sm'
                  sx={{
                    color: '#636B74',
                    background: 'transparent',
                    p: 0,
                    '&:hover': {
                      background: 'transparent',
                      opacity: '0.8',
                    },
                  }}
                  onClick={handleMenuOpen}
                >
                  <DotsIcon weight='bold' size={18} color='var(--joy-palette-text-secondary)' />
                </Button>
              </Stack>
            </Box>

            {company?.last_scoring_results ? (
              <Box
                sx={{
                  bgcolor: 'var(--joy-palette-background-navActiveBg)',
                  borderRadius: 2,
                  p: 1,
                  mt: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Lightbulb size={20} color='var(--joy-palette-warning-600)' />
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: 'var(--joy-palette-text-primary)',
                  }}
                >
                  Fit score: {company?.last_scoring_results?.score}/10 —{' '}
                  {company?.last_scoring_results?.short_description}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  bgcolor: 'var(--joy-palette-background-navActiveBg)',
                  borderRadius: 2,
                  p: 1,
                  mt: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Lightbulb size={20} color='var(--joy-palette-warning-600)' />
                <Typography
                  sx={{
                    fontSize: '14px',
                    color: 'var(--joy-palette-text-primary)',
                  }}
                >
                  This company has not been scored yet. Check back later or refresh to update.
                </Typography>
              </Box>
            )}
          </Stack>

          <Popper
            open={Boolean(menuAnchorEl)}
            anchorEl={menuAnchorEl}
            placement='bottom-start'
            style={{
              minWidth: '120px',
              borderRadius: '8px',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
              backgroundColor: 'var(--joy-palette-background-surface)',
              zIndex: 1301,
              border: '1px solid var(--joy-palette-divider)',
            }}
          >
            <Box ref={menuRef}>
              <Box
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleEdit();
                }}
                sx={menuItemStyle}
              >
                <PencilIcon fontSize='16px' />
                Edit
              </Box>
              <Box
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleAddToList();
                }}
                sx={menuItemStyle}
              >
                <PlusIcon fontSize='16px' />
                Add to list
              </Box>
              <Box
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleDelete();
                }}
                sx={{
                  ...menuItemStyle,
                  color: 'var(--joy-palette-danger-500)',
                  '&:hover': {
                    backgroundColor: 'var(--joy-palette-danger-50)',
                  },
                }}
              >
                <TrashIcon fontSize='16px' />
                Delete
              </Box>
            </Box>
          </Popper>

          <Stack spacing={{ xs: 1, sm: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Industry
              </Typography>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: 'var(--joy-palette-text-primary)',
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                {companyLoading
                  ? '...'
                  : companyError
                    ? 'Error'
                    : company?.categories?.[0] || 'N/A'}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Employees
              </Typography>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: 'var(--joy-palette-text-primary)',
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                {companyLoading ? '...' : companyError ? 'Error' : company?.employees}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Company phone
              </Typography>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: 'var(--joy-palette-text-primary)',
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                {companyLoading ? '...' : formatPhoneNumber(company?.phone)}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Company email
              </Typography>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: 'var(--joy-palette-text-primary)',
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                {companyLoading ? '...' : company?.email || 'N/A'}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Company website
              </Typography>

              <Link
                href={
                  company?.website?.startsWith('http')
                    ? company?.website
                    : `https://${company?.website}`
                }
                target='_blank'
                sx={{
                  fontSize: '14px',
                  color: 'var(--joy-palette-primary-600)',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {company?.website || 'N/A'}
              </Link>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                borderBottom: '1px solid var(--joy-palette-divider)',
                paddingBottom: { xs: 1, sm: 2 },
              }}
            >
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Location
              </Typography>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: 'var(--joy-palette-text-primary)',
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                {companyLoading ? '...' : companyError ? 'Error' : company?.address || 'N/A'}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Typography
                level='body-sm'
                fontWeight='300'
                sx={{
                  color: '#636B74',
                  width: { xs: '100%', sm: '100px' },
                  fontSize: { xs: '12px', sm: '14px' },
                }}
              >
                Lists
              </Typography>
              <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                {companyLoading ? (
                  <CircularProgress size='sm' />
                ) : companyError ? (
                  <Typography
                    level='body-sm'
                    sx={{
                      color: 'var(--joy-palette-danger-500)',
                      fontSize: { xs: '10px', sm: '12px' },
                    }}
                  >
                    Error loading lists
                  </Typography>
                ) : (
                  <>
                    {company?.lists?.map((list) => (
                      <Chip
                        key={list.id}
                        size='sm'
                        variant='soft'
                        sx={{ fontSize: { xs: '10px', sm: '12px' } }}
                      >
                        {list.name.slice(0, 60)}
                      </Chip>
                    ))}
                  </>
                )}
              </Stack>
            </Stack>

            {companyLoading && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 2,
                  mt: 2,
                  borderTop: '1px solid var(--joy-palette-divider)',
                }}
              >
                <Stack direction='row' spacing={2} alignItems='center'>
                  <CircularProgress size='sm' />
                  <Typography
                    level='body-sm'
                    sx={{
                      color: 'var(--joy-palette-text-secondary)',
                      fontSize: { xs: '12px', sm: '14px' },
                    }}
                  >
                    Loading company data...
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      </Sheet>

      <EditCompanyModal
        open={editModalOpen}
        onClose={handleEditModalClose}
        company={company || null}
      />

      <AddCompanyToListModal
        open={addToListModalOpen}
        onClose={handleAddToListModalClose}
        companyIds={company ? [company.id] : []}
      />
    </>
  );
}
