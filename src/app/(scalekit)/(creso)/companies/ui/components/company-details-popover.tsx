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
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { ArrowSquareOut as ExternalLinkIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { useRouter } from 'next/navigation';
import { paths } from '@/paths';
import type { CompanyItem } from '../../lib/types/company';
import { getCompanyById } from '../../../segments/lib/api/companies';

interface CompanyDetailsPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  companyId: number;
  onEdit?: (company: CompanyItem) => void;
  onAddToList?: (company: CompanyItem) => void;
}

export default function CompanyDetailsPopover({
  open,
  onClose,
  anchorEl,
  companyId,
  onEdit,
  onAddToList,
}: CompanyDetailsPopoverProps) {
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addToListModalOpen, setAddToListModalOpen] = useState(false);

  const {
    data: company,
    isLoading: companyLoading,
    error: companyError,
  } = useQuery({
    queryKey: ['company', companyId, 'popover'],
    queryFn: async () => {
      // Note: This is a simplified implementation
      // In production, you would need to map numeric ID to company_id
      // For now, we'll return a placeholder structure
      // TODO: Implement proper ID mapping or use company_id directly
      return {
        id: companyId,
        name: 'Company',
        description: undefined,
        website: undefined,
        homepageUri: undefined,
        logo: undefined,
        country: undefined,
        region: undefined,
        employees: undefined,
        categories: undefined,
        technologies: undefined,
        phone: undefined,
        email: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as CompanyItem;
    },
    enabled: !!companyId && open,
  });

  useEffect(() => {
    if (!open) {
      setEditModalOpen(false);
      setAddToListModalOpen(false);
    }
  }, [open]);

  const handleViewProfile = () => {
    if (company) {
      router.push(paths.creso.companies.details(String(company.id)));
      onClose();
    }
  };

  const handleEdit = () => {
    if (company && onEdit) {
      onEdit(company);
    }
    onClose();
  };

  const handleAddToList = () => {
    if (company && onAddToList) {
      onAddToList(company);
    }
    onClose();
  };

  const handleViewWebsite = () => {
    if (company?.website) {
      const url = company.website.startsWith('http')
        ? company.website
        : `https://${company.website}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const formatEmployees = (employees?: number) => {
    if (!employees) return 'N/A';
    return employees.toLocaleString();
  };

  if (!open || !anchorEl) {
    return null;
  }

  return (
    <Sheet
      data-popover='true'
      sx={{
        position: 'fixed',
        top: { xs: '25%', sm: '16%', lg: '21%' },
        right: { xs: '5%', sm: '25px', lg: '48px' },
        width: { xs: '90%', sm: 600 },
        maxWidth: '90vw',
        maxHeight: '65vh',
        borderRadius: '8px',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        overflow: 'auto',
        zIndex: 1300,
        border: '1px solid var(--joy-palette-divider)',
        bgcolor: 'var(--joy-palette-background-surface)',
      }}
    >
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        {/* Header */}
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
            sx={{ fontSize: { xs: '18px', sm: '22px' } }}
            fontWeight={600}
          >
            Company Details
          </Typography>
          <Button variant='plain' size='sm' onClick={onClose} sx={{ minWidth: 'auto', p: 0.5 }}>
            <XIcon size={20} />
          </Button>
        </Stack>

        {companyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size='md' />
          </Box>
        ) : companyError || !company ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography level='body-md' color='danger'>
              Failed to load company details
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Company Header */}
            <Stack direction='row' spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Avatar src={company.logo} alt={company.name} sx={{ width: 64, height: 64 }}>
                {company.name?.charAt(0)?.toUpperCase() || 'C'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography level='title-md' fontWeight={600} sx={{ mb: 0.5 }}>
                  {company.name}
                </Typography>
                {company.description && (
                  <Typography level='body-sm' sx={{ color: 'text.secondary', mb: 1 }}>
                    {company.description.slice(0, 150)}
                    {company.description.length > 150 ? '...' : ''}
                  </Typography>
                )}
                <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {company.categories && company.categories.length > 0 && (
                    <Chip size='sm' variant='soft'>
                      {company.categories[0]}
                    </Chip>
                  )}
                  {company.employees && (
                    <Chip size='sm' variant='soft'>
                      {formatEmployees(company.employees)} employees
                    </Chip>
                  )}
                </Stack>
              </Box>
            </Stack>

            {/* Company Details */}
            <Stack spacing={2}>
              {company.country && (
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.secondary', mb: 0.5 }}>
                    Location
                  </Typography>
                  <Typography level='body-sm'>
                    {[company.country, company.region].filter(Boolean).join(', ') || 'N/A'}
                  </Typography>
                </Box>
              )}

              {company.website && (
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.secondary', mb: 0.5 }}>
                    Website
                  </Typography>
                  <Button
                    variant='plain'
                    size='sm'
                    endDecorator={<ExternalLinkIcon size={16} />}
                    onClick={handleViewWebsite}
                    sx={{ p: 0, justifyContent: 'flex-start' }}
                  >
                    {company.website}
                  </Button>
                </Box>
              )}

              {company.phone && (
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.secondary', mb: 0.5 }}>
                    Phone
                  </Typography>
                  <Typography level='body-sm'>{company.phone}</Typography>
                </Box>
              )}

              {company.email && (
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.secondary', mb: 0.5 }}>
                    Email
                  </Typography>
                  <Typography level='body-sm'>{company.email}</Typography>
                </Box>
              )}

              {company.technologies && company.technologies.length > 0 && (
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.secondary', mb: 0.5 }}>
                    Technologies
                  </Typography>
                  <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {company.technologies.slice(0, 5).map((tech, idx) => (
                      <Chip key={idx} size='sm' variant='outlined'>
                        {tech}
                      </Chip>
                    ))}
                    {company.technologies.length > 5 && (
                      <Chip size='sm' variant='outlined'>
                        +{company.technologies.length - 5} more
                      </Chip>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>

            {/* Actions */}
            <Stack
              direction='row'
              spacing={2}
              sx={{ pt: 2, borderTop: '1px solid var(--joy-palette-divider)' }}
            >
              <Button
                variant='outlined'
                size='sm'
                startDecorator={<EyeIcon size={16} />}
                onClick={handleViewProfile}
                sx={{ flex: 1 }}
              >
                View Profile
              </Button>
              {onEdit && (
                <Button
                  variant='outlined'
                  size='sm'
                  startDecorator={<PencilIcon size={16} />}
                  onClick={handleEdit}
                  sx={{ flex: 1 }}
                >
                  Edit
                </Button>
              )}
              {onAddToList && (
                <Button
                  variant='outlined'
                  size='sm'
                  startDecorator={<PlusIcon size={16} />}
                  onClick={handleAddToList}
                  sx={{ flex: 1 }}
                >
                  Add to List
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </Box>
    </Sheet>
  );
}
