'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Divider from '@mui/joy/Divider';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { config } from '@/config';
import { PersonasAPI } from '../../lib/api';
import { useAuth } from '@/contexts/auth/user-context';
import { toast } from '@/components/core/toaster';

//export const metadata = { title: `Persona Details | Dashboard | ${config.site.name}` } satisfies Metadata;

interface PersonaDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function PersonaDetailsPage({ params }: PersonaDetailsPageProps): React.JSX.Element {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const auth = useAuth();
  const queryClient = useQueryClient();

  // Fetch persona data
  const {
    data: persona,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['persona', resolvedParams.id],
    queryFn: () => PersonasAPI.getById(resolvedParams.id),
    enabled: !!resolvedParams.id && !!auth.user,
  });

  const deleteMutation = useMutation({
    mutationFn: () => PersonasAPI.delete(resolvedParams.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast.success('Persona deleted successfully');
      router.push('/strategy-forge/personas');
    },
    onError: (error) => {
      toast.error(
        `Failed to delete persona: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${persona?.name}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate();
    }
  };

  const handleEdit = () => {
    router.push(`/strategy-forge/personas/${resolvedParams.id}/edit`);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Typography>Loading persona...</Typography>
      </Box>
    );
  }

  if (error || !persona) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Typography color='danger'>
          {error
            ? `Error loading persona: ${error instanceof Error ? error.message : 'Unknown error'}`
            : 'Persona not found'}
        </Typography>
        <Button
          variant='outlined'
          startDecorator={<ArrowLeftIcon />}
          onClick={() => router.push('/strategy-forge/personas')}
          sx={{ mt: 2 }}
        >
          Back to Personas
        </Button>
      </Box>
    );
  }

  const renderHtmlContent = (content: string | null | undefined) => {
    if (!content) return <Typography color='neutral'>Not specified</Typography>;
    return (
      <Box
        sx={{
          '& p': { margin: 0 },
          '& ul': { margin: 0, paddingLeft: 2 },
          '& ol': { margin: 0, paddingLeft: 2 },
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        {/* Header */}
        <div>
          <Button
            variant='outlined'
            startDecorator={<ArrowLeftIcon />}
            onClick={() => router.back()}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
          <Stack
            direction='row'
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
                {persona.name}
              </Typography>
              <Typography level='body-md' sx={{ mt: 1 }}>
                Persona Details
              </Typography>
            </div>
            <Stack direction='row' spacing={1}>
              <Button startDecorator={<PencilSimpleIcon />} onClick={handleEdit}>
                Edit
              </Button>
              <Button
                color='danger'
                variant='solid'
                startDecorator={<TrashIcon />}
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                loading={deleteMutation.isPending}
                sx={{ color: 'white' }}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        </div>

        {/* Basic Information */}
        <Card>
          <CardContent>
            <Typography level='title-md' sx={{ mb: 2 }}>
              Basic Information
            </Typography>
            <Stack spacing={2}>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Name:
                </Typography>
                <Typography>{persona.name}</Typography>
              </Stack>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Titles:
                </Typography>
                <Typography>{persona.titles || 'Not specified'}</Typography>
              </Stack>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Department:
                </Typography>
                <Typography>{persona.department || 'Not specified'}</Typography>
              </Stack>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Manager:
                </Typography>
                <Chip size='sm' color={persona.is_manager ? 'success' : 'neutral'} variant='soft'>
                  {persona.is_manager ? 'Yes' : 'No'}
                </Chip>
              </Stack>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Decision Maker:
                </Typography>
                <Chip size='sm' color={persona.is_decider ? 'primary' : 'neutral'} variant='soft'>
                  {persona.is_decider ? 'Yes' : 'No'}
                </Chip>
              </Stack>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Experience:
                </Typography>
                <Typography>{persona.experience_years || 'Not specified'}</Typography>
              </Stack>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Education:
                </Typography>
                <Typography>{persona.education_levels || 'Not specified'}</Typography>
              </Stack>
              {persona.job_responsibilities && (
                <div>
                  <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                    Job Responsibilities:
                  </Typography>
                  <Typography level='body-sm'>{persona.job_responsibilities}</Typography>
                </div>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Pain Points & Goals */}
        <Card>
          <CardContent>
            <Typography level='title-md' sx={{ mb: 2 }}>
              Pain Points & Goals
            </Typography>
            <Stack spacing={3}>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Pain Points:
                </Typography>
                {renderHtmlContent(persona.pain_points_html)}
              </div>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Goals:
                </Typography>
                {renderHtmlContent(persona.goals_html)}
              </div>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Solution-Relevant Pain Points:
                </Typography>
                {renderHtmlContent(persona.solution_relevant_pain_points_html)}
              </div>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Solution-Relevant Goals:
                </Typography>
                {renderHtmlContent(persona.solution_relevant_goals_html)}
              </div>
            </Stack>
          </CardContent>
        </Card>

        {/* Current Solutions & Switching */}
        <Card>
          <CardContent>
            <Typography level='title-md' sx={{ mb: 2 }}>
              Current Solutions & Switching
            </Typography>
            <Stack spacing={3}>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Current Solutions:
                </Typography>
                {renderHtmlContent(persona.current_solutions_html)}
              </div>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Switching Costs:
                </Typography>
                {renderHtmlContent(persona.switching_costs_html)}
              </div>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Unsatisfied With:
                </Typography>
                {renderHtmlContent(persona.unsatisfied_with_html)}
              </div>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Ideal Outcome:
                </Typography>
                {renderHtmlContent(persona.ideal_outcome_html)}
              </div>
            </Stack>
          </CardContent>
        </Card>

        {/* Behavior & Characteristics */}
        <Card>
          <CardContent>
            <Typography level='title-md' sx={{ mb: 2 }}>
              Behavior & Characteristics
            </Typography>
            <Stack spacing={2}>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Buying Behavior:
                </Typography>
                <Typography>{persona.buying_behavior || 'Not specified'}</Typography>
              </div>
              <div>
                <Typography level='body-sm' sx={{ fontWeight: 'md', mb: 1 }}>
                  Digital Savviness:
                </Typography>
                <Typography>{persona.digital_savviness || 'Not specified'}</Typography>
              </div>
            </Stack>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardContent>
            <Typography level='title-md' sx={{ mb: 2 }}>
              Metadata
            </Typography>
            <Stack spacing={2}>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Created:
                </Typography>
                <Typography>{new Date(persona.created_at).toLocaleString()}</Typography>
              </Stack>
              <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
                <Typography level='body-sm' sx={{ minWidth: 120, fontWeight: 'md' }}>
                  Updated:
                </Typography>
                <Typography>{new Date(persona.updated_at).toLocaleString()}</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
