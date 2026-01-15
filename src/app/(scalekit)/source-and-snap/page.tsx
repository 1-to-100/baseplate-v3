'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import Link from '@mui/joy/Link';
import { Camera as CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { Images as ImagesIcon } from '@phosphor-icons/react/dist/ssr/Images';
import { Bug as BugIcon } from '@phosphor-icons/react/dist/ssr/Bug';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { paths } from '@/paths';
import { useRouter } from 'next/navigation';

export default function SourceAndSnapPage(): React.JSX.Element {
  const router = useRouter();

  const pages = [
    {
      title: 'New Capture',
      description:
        'Create a new web screenshot capture request by entering a URL and selecting capture options.',
      href: paths.sourceAndSnap.capture,
      icon: CameraIcon,
      color: 'primary' as const,
    },
    {
      title: 'Captures',
      description:
        'View and manage all capture requests. Track job status, view completed captures, and manage your capture history.',
      href: paths.sourceAndSnap.captures.list,
      icon: ImagesIcon,
      color: 'neutral' as const,
    },
  ];

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={4}>
        {/* Header */}
        <Stack spacing={1}>
          <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
            Source & Snap
          </Typography>
          <Typography level='body-lg' color='neutral'>
            Capture full-page screenshots and associated source assets from any public URL.
            Standardize your brand documentation with consistent device profiles and metadata.
          </Typography>
        </Stack>

        {/* Feature Cards */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <Card
                key={page.href}
                variant='outlined'
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 'md',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => router.push(page.href)}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 'sm',
                        bgcolor: `${page.color}.100`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={24} style={{ color: `var(--joy-palette-${page.color}-600)` }} />
                    </Box>
                    <Stack spacing={1}>
                      <Typography level='title-lg'>{page.title}</Typography>
                      <Typography level='body-sm' color='neutral'>
                        {page.description}
                      </Typography>
                    </Stack>
                    <Button
                      variant='soft'
                      color={page.color}
                      endDecorator={<ArrowRightIcon size={16} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(page.href);
                      }}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Open
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        {/* Quick Links */}
        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={2}>
              <Typography level='title-md'>Quick Links</Typography>
              <Stack direction='row' spacing={2} flexWrap='wrap'>
                <Link
                  href={paths.sourceAndSnap.capture}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(paths.sourceAndSnap.capture);
                  }}
                >
                  Create New Capture
                </Link>
                <Link
                  href={paths.sourceAndSnap.captures.list}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(paths.sourceAndSnap.captures.list);
                  }}
                >
                  View All Captures
                </Link>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
