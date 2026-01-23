'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import Table from '@mui/joy/Table';
import Avatar from '@mui/joy/Avatar';
import Chip from '@mui/joy/Chip';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { ArrowsCounterClockwise as ArrowsCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsCounterClockwise';

import { paths } from '@/paths';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import Pagination from '@/components/dashboard/layout/pagination';
import { getSegmentById } from '../lib/api/segments';
import { ListStatus } from '../lib/types/list';

interface PageProps {
  params: Promise<{
    segmentId: string;
  }>;
}

const ITEMS_PER_PAGE = 50;

export default function SegmentDetailsPage({ params }: PageProps): React.JSX.Element {
  const router = useRouter();
  const [segmentId, setSegmentId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Handle async params
  React.useEffect(() => {
    params.then((resolvedParams) => {
      setSegmentId(resolvedParams.segmentId);
    });
  }, [params]);

  // Fetch segment data
  const {
    data: segmentData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['segment', segmentId, currentPage],
    queryFn: () =>
      getSegmentById(segmentId!, {
        page: currentPage,
        perPage: ITEMS_PER_PAGE,
      }),
    enabled: !!segmentId,
  });

  const segment = segmentData?.segment;
  const companies = segmentData?.companies || [];
  const meta = segmentData?.meta;

  const filters = (segment?.filters || {}) as {
    country?: string;
    location?: string;
    employees?: string | string[];
    categories?: string[];
    technographics?: string[];
  };

  const employeesDisplay = Array.isArray(filters.employees)
    ? filters.employees[0]
    : filters.employees;

  if (isLoading) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress size='md' />
        </Box>
      </Box>
    );
  }

  if (error || !segment) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Alert color='danger'>
            <Typography level='body-md'>
              {error instanceof Error ? error.message : 'Segment not found'}
            </Typography>
          </Alert>
          <Button
            variant='outlined'
            startDecorator={<ArrowLeftIcon size={20} />}
            onClick={() => router.push(paths.dashboard.segments.list)}
          >
            Back to Segments
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={4}>
        {/* Header */}
        <Stack spacing={2}>
          <Stack
            direction='row'
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography fontSize={{ xs: 'xl2', sm: 'xl3' }} level='h1'>
              {segment.name}
            </Typography>
            <Button
              variant='solid'
              color='primary'
              onClick={() => router.push(paths.dashboard.segments.edit(segment.list_id))}
            >
              Edit
            </Button>
          </Stack>
          <Breadcrumbs separator={<BreadcrumbsSeparator />}>
            <BreadcrumbsItem href={paths.dashboard.overview} type='start' />
            <BreadcrumbsItem href={paths.dashboard.segments.list}>Segments</BreadcrumbsItem>
            <BreadcrumbsItem type='end'>{segment.name}</BreadcrumbsItem>
          </Breadcrumbs>
        </Stack>

        {/* Segment Information Header Row */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            alignItems: 'center',
            pb: 2,
            borderBottom: '1px solid var(--joy-palette-divider)',
          }}
        >
          <Typography level='body-xs'>
            Total:{' '}
            <Box component='span' sx={{ fontWeight: 500, color: '#0B0D0E' }}>
              {meta?.total.toLocaleString() || 0}
            </Box>
          </Typography>
          {filters.country && (
            <Typography level='body-xs'>
              Country:{' '}
              <Box component='span' sx={{ fontWeight: 500, color: '#0B0D0E' }}>
                {filters.country}
              </Box>
            </Typography>
          )}
          {employeesDisplay && (
            <Typography level='body-xs'>
              Company size:{' '}
              <Box component='span' sx={{ fontWeight: 500, color: '#0B0D0E' }}>
                {employeesDisplay}
              </Box>
            </Typography>
          )}
          {filters.categories && filters.categories.length > 0 && (
            <Typography level='body-xs'>
              Industry:{' '}
              <Box component='span' sx={{ fontWeight: 500, color: '#0B0D0E' }}>
                {filters.categories.join(', ')}
              </Box>
            </Typography>
          )}
        </Box>

        {/* Companies Table */}
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography level='title-lg'>
                  {meta?.total.toLocaleString() || 0} companies found
                </Typography>
              </Stack>

              {companies.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography level='body-md' sx={{ color: 'text.secondary' }}>
                    No companies found in this segment.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table
                      aria-label='companies table'
                      sx={{
                        width: '100%',
                        '& thead th': {
                          bgcolor: 'var(--joy-palette-background-level1)',
                          fontWeight: '600',
                        },
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: 60 }}>Logo</th>
                          <th>Company Name</th>
                          <th style={{ width: 150 }}>Location</th>
                          <th style={{ width: 120 }}>Employees</th>
                          <th style={{ width: 200 }}>Industry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((company) => (
                          <tr key={company.company_id}>
                            <td>
                              <Avatar
                                src={company.logo || undefined}
                                alt={company.display_name || company.legal_name || 'Company'}
                                sx={{ width: 40, height: 40 }}
                              >
                                {(company.display_name || company.legal_name || 'C')
                                  .charAt(0)
                                  .toUpperCase()}
                              </Avatar>
                            </td>
                            <td>
                              <Box>
                                <Typography level='body-md' fontWeight={500}>
                                  {company.display_name || company.legal_name || 'Unknown'}
                                </Typography>
                                {company.domain && (
                                  <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
                                    {company.domain}
                                  </Typography>
                                )}
                              </Box>
                            </td>
                            <td>
                              <Typography level='body-sm'>
                                {[company.country, company.region].filter(Boolean).join(', ') ||
                                  '-'}
                              </Typography>
                            </td>
                            <td>
                              <Typography level='body-sm'>
                                {company.employees ? company.employees.toLocaleString() : '-'}
                              </Typography>
                            </td>
                            <td>
                              <Typography level='body-sm'>
                                {company.categories && company.categories.length > 0
                                  ? company.categories.slice(0, 2).join(', ')
                                  : '-'}
                              </Typography>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Box>
                  {meta && meta.lastPage > 1 && (
                    <Pagination
                      totalPages={meta.lastPage}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      disabled={isLoading}
                    />
                  )}
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
