'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { config } from '@/config';
import { PersonaCreationDialog } from '../../lib/components/persona-creation-dialog';

//export const metadata = { title: `Create Persona | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function CreatePersonaPage(): React.JSX.Element {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleSuccess = () => {
    router.push('/strategy-forge/personas');
  };

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        <div>
          <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
            <Stack direction='row' spacing={2} alignItems='center'>
              <Button
                variant='outlined'
                color='neutral'
                startDecorator={<ArrowLeftIcon size={16} />}
                onClick={() => router.push('/strategy-forge/personas')}
              >
                Back to Personas
              </Button>
              <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
                Create Persona
              </Typography>
            </Stack>
          </Stack>
        </div>

        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Stack spacing={3} alignItems='center'>
            <Typography level='h3' color='neutral'>
              Create a New Persona
            </Typography>
            <Typography level='body-lg' color='neutral'>
              Use AI to generate a comprehensive persona based on job role and company context
            </Typography>
            <Button
              variant='solid'
              color='primary'
              size='lg'
              startDecorator={<PlusIcon size={20} />}
              onClick={() => setIsDialogOpen(true)}
            >
              Start Creating Persona
            </Button>
          </Stack>
        </Box>
      </Stack>

      <PersonaCreationDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </Box>
  );
}
