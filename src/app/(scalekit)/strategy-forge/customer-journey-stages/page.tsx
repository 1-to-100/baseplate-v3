'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import IconButton from '@mui/joy/IconButton';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { PencilSimple as EditIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as DeleteIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { DotsSix as DragHandleIcon } from '@phosphor-icons/react/dist/ssr/DotsSix';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/core/toaster';

import {
  getCustomerJourneyStagesList,
  deleteCustomerJourneyStage,
  updateCustomerJourneyStage,
} from '../lib/api';
import type { CustomerJourneyStage, JourneyPhaseType } from '../lib/types';
import { CreateEditStageModal } from '../lib/components';
import { createClient } from '@/lib/supabase/client';

const JOURNEY_PHASES: {
  key: JourneyPhaseType;
  label: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
}[] = [
  { key: 'Marketing', label: 'Marketing', color: 'primary' },
  { key: 'Sales', label: 'Sales', color: 'success' },
  { key: 'Onboarding', label: 'Onboarding', color: 'warning' },
  { key: 'Customer Success', label: 'Customer Success', color: 'danger' },
];

// Helper function to truncate text to specified length with ellipsis
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Helper function to truncate text to 2 lines maximum
const truncateToTwoLines = (text: string, maxCharsPerLine: number = 50): string => {
  const lines = text.split('\n');
  if (lines.length <= 2) {
    return lines.map((line) => truncateText(line, maxCharsPerLine)).join('\n');
  }
  return (
    lines
      .slice(0, 2)
      .map((line) => truncateText(line, maxCharsPerLine))
      .join('\n') + '...'
  );
};

export default function CustomerJourneyStagesPage(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = React.useState<CustomerJourneyStage | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isCreatingDefaults, setIsCreatingDefaults] = React.useState(false);
  const supabase = createClient();

  // Drag and drop state
  const [draggedStage, setDraggedStage] = React.useState<CustomerJourneyStage | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<CustomerJourneyStage | null>(null);

  // Fetch all customer journey stages
  const {
    data: stagesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['customer-journey-stages'],
    queryFn: () => getCustomerJourneyStagesList(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCustomerJourneyStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-journey-stages'] });
      toast.success('Stage deleted successfully');
    },
    onError: (error) => {
      toast.error(
        `Failed to delete stage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  // Update mutation for reordering
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateCustomerJourneyStage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-journey-stages'] });
    },
    onError: (error) => {
      toast.error(
        `Failed to update stage order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    },
  });

  const handleCreate = () => {
    setSelectedStage(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleEdit = (stage: CustomerJourneyStage) => {
    setSelectedStage(stage);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleDelete = (stage: CustomerJourneyStage) => {
    if (window.confirm(`Are you sure you want to delete "${stage.name}"?`)) {
      deleteMutation.mutate(stage.customer_journey_stage_id);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, stage: CustomerJourneyStage) => {
    setDraggedStage(stage);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', stage.customer_journey_stage_id);
  };

  const handleDragOver = (e: React.DragEvent, stage: CustomerJourneyStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: CustomerJourneyStage) => {
    e.preventDefault();

    if (
      !draggedStage ||
      draggedStage.customer_journey_stage_id === targetStage.customer_journey_stage_id
    ) {
      setDraggedStage(null);
      setDragOverStage(null);
      return;
    }

    // Only allow reordering within the same journey phase
    if (draggedStage.journey_phase !== targetStage.journey_phase) {
      setDraggedStage(null);
      setDragOverStage(null);
      return;
    }

    const stages = stagesByPhase[draggedStage.journey_phase] || [];
    const draggedIndex = stages.findIndex(
      (s) => s.customer_journey_stage_id === draggedStage.customer_journey_stage_id
    );
    const targetIndex = stages.findIndex(
      (s) => s.customer_journey_stage_id === targetStage.customer_journey_stage_id
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedStage(null);
      setDragOverStage(null);
      return;
    }

    // Create new order array
    const newStages = [...stages];
    const [movedStage] = newStages.splice(draggedIndex, 1);
    if (!movedStage) {
      setDraggedStage(null);
      setDragOverStage(null);
      return;
    }
    newStages.splice(targetIndex, 0, movedStage);

    // Update order_index for all affected stages
    const updatePromises = newStages.map((stage, index) => {
      const newOrderIndex = index + 1;
      if (stage.order_index !== newOrderIndex) {
        return updateMutation.mutateAsync({
          id: stage.customer_journey_stage_id,
          data: { order_index: newOrderIndex },
        });
      }
      return Promise.resolve();
    });

    try {
      await Promise.all(updatePromises);
      toast.success('Stage order updated successfully');
    } catch (error) {
      toast.error('Failed to update stage order');
    }

    setDraggedStage(null);
    setDragOverStage(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedStage(null);
    setIsCreating(false);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-journey-stages'] });
    handleModalClose();
  };

  const handleCreateDefaultStages = React.useCallback(async () => {
    setIsCreatingDefaults(true);

    try {
      // Get current user's customer_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('customer_id, user_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userRecord) {
        throw new Error('Failed to get user info');
      }

      // Fetch all default stages from singleton table
      const { data: defaultStages, error: fetchError } = await supabase
        .from('customer_journey_stages_singleton')
        .select('journey_phase, name, description, graduation_criteria, order_index, code')
        .order('journey_phase')
        .order('order_index');

      if (fetchError) {
        throw new Error(`Failed to fetch default stages: ${fetchError.message}`);
      }

      if (!defaultStages || defaultStages.length === 0) {
        throw new Error('No default stages found in system. Please contact your administrator.');
      }

      // Create records for this customer
      const stageRecords = defaultStages.map((stage) => ({
        customer_id: userRecord.customer_id,
        journey_phase: stage.journey_phase,
        name: stage.name,
        description: stage.description,
        graduation_criteria: stage.graduation_criteria,
        order_index: stage.order_index,
        code: stage.code,
        created_by: userRecord.user_id,
        updated_by: userRecord.user_id,
      }));

      // Insert all stages
      const { data: insertedStages, error: insertError } = await supabase
        .from('customer_journey_stages')
        .insert(stageRecords)
        .select();

      if (insertError) {
        throw new Error(`Failed to create stages: ${insertError.message}`);
      }

      toast.success(`Successfully created ${insertedStages?.length || 0} default journey stages!`);

      // Reload stages
      queryClient.invalidateQueries({ queryKey: ['customer-journey-stages'] });
    } catch (err) {
      console.error('Failed to create default stages:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create default stages');
    } finally {
      setIsCreatingDefaults(false);
    }
  }, [supabase, queryClient]);

  // Group stages by journey phase
  const stagesByPhase = React.useMemo(() => {
    if (!stagesData?.data) return {} as Record<JourneyPhaseType, CustomerJourneyStage[]>;

    return stagesData.data.reduce(
      (acc, stage) => {
        if (!acc[stage.journey_phase]) {
          acc[stage.journey_phase] = [];
        }
        acc[stage.journey_phase].push(stage);
        return acc;
      },
      {} as Record<JourneyPhaseType, CustomerJourneyStage[]>
    );
  }, [stagesData?.data]);

  // Sort stages by order_index
  const sortStagesByOrder = (stages: CustomerJourneyStage[]) => {
    return [...stages].sort((a, b) => {
      if (a.order_index === null && b.order_index === null) return 0;
      if (a.order_index === null) return 1;
      if (b.order_index === null) return -1;
      return a.order_index - b.order_index;
    });
  };

  // Check if there are any stages at all
  const totalStages = stagesData?.data?.length || 0;
  const isEmpty = totalStages === 0;

  if (error) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <div>
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
              Customer Journey Stages
            </Typography>
          </div>
          <Card variant='outlined' color='danger' sx={{ p: 2 }}>
            <Typography level='title-md' color='danger'>
              Error Loading Stages
            </Typography>
            <Typography level='body-sm' color='danger'>
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </Typography>
          </Card>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        <div>
          <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level='h1'>
            Customer Journey Stages
          </Typography>
          <Typography level='body-lg' color='neutral'>
            Manage customer journey stages across different phases
          </Typography>
        </div>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant='solid'
            color='primary'
            startDecorator={<PlusIcon size={16} />}
            onClick={handleCreate}
            disabled={isLoading}
          >
            Add Stage
          </Button>
        </Box>

        {isLoading ? (
          <Card variant='outlined' sx={{ p: 2 }}>
            <Typography level='body-md'>Loading stages...</Typography>
          </Card>
        ) : isCreatingDefaults ? (
          <Card variant='outlined' sx={{ p: 4 }}>
            <Stack spacing={2} alignItems='center' textAlign='center'>
              <CircularProgress size='lg' />
              <Typography level='title-md'>Creating Default Journey Stages</Typography>
              <Typography level='body-md' color='neutral'>
                Setting up your customer journey framework with industry-standard stages...
              </Typography>
            </Stack>
          </Card>
        ) : isEmpty ? (
          <Card variant='outlined' sx={{ p: 4 }}>
            <Stack spacing={3} alignItems='center' textAlign='center'>
              <Typography level='h3'>No Journey Stages Found</Typography>
              <Typography level='body-lg' color='neutral' sx={{ maxWidth: '600px' }}>
                Get started quickly by creating a complete set of default journey stages. This will
                create a standard customer journey framework across Marketing, Sales, Onboarding,
                and Customer Success phases.
              </Typography>
              <Alert color='primary' variant='soft' sx={{ maxWidth: '600px' }}>
                <Stack spacing={1}>
                  <Typography level='title-sm'>What are default stages?</Typography>
                  <Typography level='body-sm'>
                    We&apos;ll create industry-standard journey stages for each phase:
                  </Typography>
                  <Box component='ul' sx={{ textAlign: 'left', pl: 2, my: 1 }}>
                    <li>
                      <strong>Marketing:</strong> Awareness, Consideration, Decision
                    </li>
                    <li>
                      <strong>Sales:</strong> Qualification, Proposal, Closed Won
                    </li>
                    <li>
                      <strong>Onboarding:</strong> Welcome, Training, Go Live
                    </li>
                    <li>
                      <strong>Customer Success:</strong> Adoption, Value Realization,
                      Renewal/Expansion
                    </li>
                  </Box>
                  <Typography level='body-sm'>
                    You can customize these stages after creation or create your own from scratch.
                  </Typography>
                </Stack>
              </Alert>
              <Stack direction='row' spacing={2}>
                <Button
                  variant='solid'
                  color='primary'
                  size='lg'
                  startDecorator={<CopyIcon size={20} />}
                  onClick={handleCreateDefaultStages}
                >
                  Create Default Stages
                </Button>
                <Button
                  variant='outlined'
                  color='neutral'
                  size='lg'
                  startDecorator={<PlusIcon size={20} />}
                  onClick={handleCreate}
                >
                  Create Custom Stage
                </Button>
              </Stack>
            </Stack>
          </Card>
        ) : (
          <Stack spacing={4}>
            {JOURNEY_PHASES.map((phase) => {
              const stages = sortStagesByOrder(stagesByPhase[phase.key] || []);

              return (
                <Card key={phase.key} variant='outlined' sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography
                        level='title-lg'
                        component='div'
                        startDecorator={
                          <Chip color={phase.color} size='sm'>
                            {phase.label}
                          </Chip>
                        }
                      >
                        {phase.label} Stages
                      </Typography>
                      <Typography level='body-sm' color='neutral'>
                        {stages.length} stage{stages.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>

                    {stages.length === 0 ? (
                      <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography level='body-md' color='neutral'>
                          No stages defined for {phase.label} phase
                        </Typography>
                      </Box>
                    ) : (
                      <Table hoverRow>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}></th>
                            <th style={{ width: '60px' }}>Order</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Graduation Criteria</th>
                            <th>Code</th>
                            <th style={{ width: '100px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map((stage) => (
                            <tr
                              key={stage.customer_journey_stage_id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, stage)}
                              onDragOver={(e) => handleDragOver(e, stage)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, stage)}
                              style={{
                                cursor: 'grab',
                                opacity:
                                  draggedStage?.customer_journey_stage_id ===
                                  stage.customer_journey_stage_id
                                    ? 0.5
                                    : 1,
                                backgroundColor:
                                  dragOverStage?.customer_journey_stage_id ===
                                  stage.customer_journey_stage_id
                                    ? 'var(--joy-palette-primary-50)'
                                    : 'transparent',
                              }}
                            >
                              <td>
                                <IconButton
                                  size='sm'
                                  variant='plain'
                                  color='neutral'
                                  sx={{ cursor: 'grab' }}
                                >
                                  <DragHandleIcon size={16} />
                                </IconButton>
                              </td>
                              <td>
                                <Typography level='body-sm' fontWeight='lg'>
                                  {stage.order_index || '-'}
                                </Typography>
                              </td>
                              <td>
                                <Typography level='body-md' fontWeight='lg'>
                                  {stage.name}
                                </Typography>
                              </td>
                              <td>
                                <Typography
                                  level='body-sm'
                                  color='neutral'
                                  sx={{ whiteSpace: 'pre-line' }}
                                >
                                  {truncateToTwoLines(stage.description, 60)}
                                </Typography>
                              </td>
                              <td>
                                <Typography
                                  level='body-sm'
                                  color='neutral'
                                  sx={{ whiteSpace: 'pre-line' }}
                                >
                                  {truncateToTwoLines(stage.graduation_criteria, 60)}
                                </Typography>
                              </td>
                              <td>
                                {stage.code && (
                                  <Chip size='sm' variant='soft'>
                                    {truncateText(stage.code, 20)}
                                  </Chip>
                                )}
                              </td>
                              <td>
                                <Stack direction='row' spacing={1}>
                                  <IconButton
                                    size='sm'
                                    variant='plain'
                                    color='primary'
                                    onClick={() => handleEdit(stage)}
                                  >
                                    <EditIcon size={16} />
                                  </IconButton>
                                  <IconButton
                                    size='sm'
                                    variant='plain'
                                    color='danger'
                                    onClick={() => handleDelete(stage)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <DeleteIcon size={16} />
                                  </IconButton>
                                </Stack>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}

        <CreateEditStageModal
          open={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          stage={selectedStage}
          isCreating={isCreating}
        />
      </Stack>
    </Box>
  );
}
