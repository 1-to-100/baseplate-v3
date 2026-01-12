'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Checkbox from '@mui/joy/Checkbox';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';

import { config } from '@/config';
import { PersonasAPI } from '../../../lib/api';
import { personaFormSchema, type PersonaFormData } from '../../../lib/schemas/persona';
import { useAuth } from '@/contexts/auth/user-context';
import { toast } from '@/components/core/toaster';

//export const metadata = { title: `Edit Persona | Dashboard | ${config.site.name}` } satisfies Metadata;

interface EditPersonaPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPersonaPage({ params }: EditPersonaPageProps): React.JSX.Element {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PersonaFormData>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: {
      name: '',
      titles: '',
      department: '',
      job_responsibilities: '',
      is_manager: false,
      experience_years: '',
      education_levels: '',
      pain_points_html: '',
      goals_html: '',
      solution_relevant_pain_points_html: '',
      solution_relevant_goals_html: '',
      current_solutions_html: '',
      switching_costs_html: '',
      unsatisfied_with_html: '',
      ideal_outcome_html: '',
      buying_behavior: '',
      digital_savviness: '',
      is_decider: false,
    },
  });

  // Reset form when persona data is loaded
  React.useEffect(() => {
    if (persona) {
      reset({
        name: persona.name,
        titles: persona.titles || '',
        department: persona.department || '',
        job_responsibilities: persona.job_responsibilities || '',
        is_manager: persona.is_manager,
        experience_years: persona.experience_years || '',
        education_levels: persona.education_levels || '',
        pain_points_html: persona.pain_points_html || '',
        goals_html: persona.goals_html || '',
        solution_relevant_pain_points_html: persona.solution_relevant_pain_points_html || '',
        solution_relevant_goals_html: persona.solution_relevant_goals_html || '',
        current_solutions_html: persona.current_solutions_html || '',
        switching_costs_html: persona.switching_costs_html || '',
        unsatisfied_with_html: persona.unsatisfied_with_html || '',
        ideal_outcome_html: persona.ideal_outcome_html || '',
        buying_behavior: persona.buying_behavior || '',
        digital_savviness: persona.digital_savviness || '',
        is_decider: persona.is_decider,
      });
    }
  }, [persona, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: PersonaFormData) => {
      if (!auth.user?.id) {
        throw new Error('User not authenticated');
      }
      return PersonasAPI.update({ persona_id: resolvedParams.id, ...data }, auth.user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persona', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast.success('Persona updated successfully');
    },
    onError: (error) => {
      toast.error(
        `Failed to update persona: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
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

  const onSubmit = async (data: PersonaFormData) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${persona?.name}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate();
    }
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
          <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
            Edit Persona
          </Typography>
          <Typography level='body-md' sx={{ mt: 1 }}>
            Update the persona information for {persona.name}
          </Typography>
        </div>

        {/* Form */}
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                {/* Basic Information */}
                <div>
                  <Typography level='title-md' sx={{ mb: 2 }}>
                    Basic Information
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl error={!!errors.name}>
                      <FormLabel>Name *</FormLabel>
                      <Controller
                        name='name'
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder='Enter persona name'
                            error={!!errors.name}
                          />
                        )}
                      />
                      {errors.name && (
                        <Typography level='body-xs' color='danger'>
                          {errors.name.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.titles}>
                      <FormLabel>Titles</FormLabel>
                      <Controller
                        name='titles'
                        control={control}
                        render={({ field }) => (
                          <Input {...field} placeholder='e.g., Senior Developer, Product Manager' />
                        )}
                      />
                      {errors.titles && (
                        <Typography level='body-xs' color='danger'>
                          {errors.titles.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.department}>
                      <FormLabel>Department</FormLabel>
                      <Controller
                        name='department'
                        control={control}
                        render={({ field }) => (
                          <Input {...field} placeholder='e.g., Engineering, Marketing, Sales' />
                        )}
                      />
                      {errors.department && (
                        <Typography level='body-xs' color='danger'>
                          {errors.department.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.job_responsibilities}>
                      <FormLabel>Job Responsibilities</FormLabel>
                      <Controller
                        name='job_responsibilities'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='Describe their main job responsibilities'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.job_responsibilities && (
                        <Typography level='body-xs' color='danger'>
                          {errors.job_responsibilities.message}
                        </Typography>
                      )}
                    </FormControl>

                    <Stack
                      direction='row'
                      spacing={6}
                      sx={{ alignItems: 'flex-start', maxWidth: '100%' }}
                    >
                      <FormControl sx={{ minWidth: '200px', flex: '0 0 auto' }}>
                        <Controller
                          name='is_manager'
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              label='Is Manager'
                              sx={{
                                '& .MuiCheckbox-label': {
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            />
                          )}
                        />
                      </FormControl>

                      <FormControl sx={{ minWidth: '200px', flex: '0 0 auto' }}>
                        <Controller
                          name='is_decider'
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              label='Is Decision Maker'
                              sx={{
                                '& .MuiCheckbox-label': {
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            />
                          )}
                        />
                      </FormControl>
                    </Stack>

                    <FormControl error={!!errors.experience_years}>
                      <FormLabel>Experience Years</FormLabel>
                      <Controller
                        name='experience_years'
                        control={control}
                        render={({ field }) => (
                          <Input {...field} placeholder='e.g., 5-10 years, 10+ years' />
                        )}
                      />
                      {errors.experience_years && (
                        <Typography level='body-xs' color='danger'>
                          {errors.experience_years.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.education_levels}>
                      <FormLabel>Education Levels</FormLabel>
                      <Controller
                        name='education_levels'
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="e.g., Bachelor's Degree, Master's Degree"
                          />
                        )}
                      />
                      {errors.education_levels && (
                        <Typography level='body-xs' color='danger'>
                          {errors.education_levels.message}
                        </Typography>
                      )}
                    </FormControl>
                  </Stack>
                </div>

                {/* Pain Points & Goals */}
                <div>
                  <Typography level='title-md' sx={{ mb: 2 }}>
                    Pain Points & Goals
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl error={!!errors.pain_points_html}>
                      <FormLabel>Pain Points</FormLabel>
                      <Controller
                        name='pain_points_html'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='What challenges do they face?'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.pain_points_html && (
                        <Typography level='body-xs' color='danger'>
                          {errors.pain_points_html.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.goals_html}>
                      <FormLabel>Goals</FormLabel>
                      <Controller
                        name='goals_html'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='What are their main goals?'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.goals_html && (
                        <Typography level='body-xs' color='danger'>
                          {errors.goals_html.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.solution_relevant_pain_points_html}>
                      <FormLabel>Solution-Relevant Pain Points</FormLabel>
                      <Controller
                        name='solution_relevant_pain_points_html'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='Pain points relevant to your solution'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.solution_relevant_pain_points_html && (
                        <Typography level='body-xs' color='danger'>
                          {errors.solution_relevant_pain_points_html.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.solution_relevant_goals_html}>
                      <FormLabel>Solution-Relevant Goals</FormLabel>
                      <Controller
                        name='solution_relevant_goals_html'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='Goals relevant to your solution'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.solution_relevant_goals_html && (
                        <Typography level='body-xs' color='danger'>
                          {errors.solution_relevant_goals_html.message}
                        </Typography>
                      )}
                    </FormControl>
                  </Stack>
                </div>

                {/* Current Solutions & Switching */}
                <div>
                  <Typography level='title-md' sx={{ mb: 2 }}>
                    Current Solutions & Switching
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl error={!!errors.current_solutions_html}>
                      <FormLabel>Current Solutions</FormLabel>
                      <Controller
                        name='current_solutions_html'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='What solutions are they currently using?'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.current_solutions_html && (
                        <Typography level='body-xs' color='danger'>
                          {errors.current_solutions_html.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.switching_costs_html}>
                      <FormLabel>Switching Costs</FormLabel>
                      <Controller
                        name='switching_costs_html'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='What are the costs of switching solutions?'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.switching_costs_html && (
                        <Typography level='body-xs' color='danger'>
                          {errors.switching_costs_html.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.unsatisfied_with_html}>
                      <FormLabel>Unsatisfied With</FormLabel>
                      <Controller
                        name='unsatisfied_with_html'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='What are they unsatisfied with in current solutions?'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.unsatisfied_with_html && (
                        <Typography level='body-xs' color='danger'>
                          {errors.unsatisfied_with_html.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.ideal_outcome_html}>
                      <FormLabel>Ideal Outcome</FormLabel>
                      <Controller
                        name='ideal_outcome_html'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='What would be their ideal outcome?'
                            minRows={3}
                          />
                        )}
                      />
                      {errors.ideal_outcome_html && (
                        <Typography level='body-xs' color='danger'>
                          {errors.ideal_outcome_html.message}
                        </Typography>
                      )}
                    </FormControl>
                  </Stack>
                </div>

                {/* Behavior & Characteristics */}
                <div>
                  <Typography level='title-md' sx={{ mb: 2 }}>
                    Behavior & Characteristics
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl error={!!errors.buying_behavior}>
                      <FormLabel>Buying Behavior</FormLabel>
                      <Controller
                        name='buying_behavior'
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder='How do they typically make purchasing decisions?'
                            minRows={2}
                          />
                        )}
                      />
                      {errors.buying_behavior && (
                        <Typography level='body-xs' color='danger'>
                          {errors.buying_behavior.message}
                        </Typography>
                      )}
                    </FormControl>

                    <FormControl error={!!errors.digital_savviness}>
                      <FormLabel>Digital Savviness</FormLabel>
                      <Controller
                        name='digital_savviness'
                        control={control}
                        render={({ field }) => (
                          <Input {...field} placeholder='e.g., High, Medium, Low' />
                        )}
                      />
                      {errors.digital_savviness && (
                        <Typography level='body-xs' color='danger'>
                          {errors.digital_savviness.message}
                        </Typography>
                      )}
                    </FormControl>
                  </Stack>
                </div>

                {/* Actions */}
                <Stack direction='row' spacing={2} sx={{ justifyContent: 'space-between', pt: 2 }}>
                  <Button
                    color='danger'
                    variant='solid'
                    onClick={handleDelete}
                    disabled={isSubmitting || deleteMutation.isPending}
                    loading={deleteMutation.isPending}
                    sx={{ color: 'white' }}
                  >
                    Delete Persona
                  </Button>
                  <Stack direction='row' spacing={2}>
                    <Button
                      variant='outlined'
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type='submit' loading={isSubmitting} disabled={isSubmitting}>
                      Update Persona
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
