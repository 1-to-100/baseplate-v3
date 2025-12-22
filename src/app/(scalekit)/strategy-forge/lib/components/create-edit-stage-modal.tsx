'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Button from '@mui/joy/Button';
import { toast } from '@/components/core/toaster';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCustomerJourneyStage, updateCustomerJourneyStage, getCustomerJourneyStagesList } from '../api';
import { createCustomerJourneyStageSchema, updateCustomerJourneyStageSchema } from '../schemas/customer-journey-stages';
import type { CustomerJourneyStage, JourneyPhaseType } from '../types';
import type { CreateCustomerJourneyStageFormData, UpdateCustomerJourneyStageFormData } from '../schemas/customer-journey-stages';

interface CreateEditStageModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stage: CustomerJourneyStage | null;
  isCreating: boolean;
}

const JOURNEY_PHASES = [
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Onboarding', label: 'Onboarding' },
  { value: 'Customer Success', label: 'Customer Success' },
];

export function CreateEditStageModal({
  open,
  onClose,
  onSuccess,
  stage,
  isCreating,
}: CreateEditStageModalProps): React.JSX.Element {
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateCustomerJourneyStageFormData | UpdateCustomerJourneyStageFormData>({
    resolver: zodResolver(isCreating ? createCustomerJourneyStageSchema : updateCustomerJourneyStageSchema),
    defaultValues: {
      journey_phase: 'Marketing',
      name: '',
      description: '',
      graduation_criteria: '',
      code: '',
    },
  });

  // Watch the name field to auto-generate code
  const watchedName = watch('name');
  const watchedJourneyPhase = watch('journey_phase');

  // Function to get the next order index for a journey phase
  const getNextOrderIndex = async (journeyPhase: JourneyPhaseType): Promise<number> => {
    try {
      const result = await getCustomerJourneyStagesList({ journey_phase: journeyPhase });
      const stages = result.data;
      if (stages.length === 0) {
        return 1;
      }
      const maxOrderIndex = Math.max(...stages.map(stage => stage.order_index || 0));
      return maxOrderIndex + 1;
    } catch (error) {
      console.error('Error getting next order index:', error);
      return 1;
    }
  };

  // Reset form when modal opens/closes or stage changes
  React.useEffect(() => {
    if (open) {
      if (isCreating) {
        reset({
          journey_phase: 'Marketing',
          name: '',
          description: '',
          graduation_criteria: '',
        });
      } else if (stage) {
        reset({
          journey_phase: stage.journey_phase,
          name: stage.name,
          description: stage.description,
          graduation_criteria: stage.graduation_criteria,
          code: stage.code || '',
        });
      }
    }
  }, [open, isCreating, stage, reset]);

  const createMutation = useMutation({
    mutationFn: createCustomerJourneyStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-journey-stages'] });
      toast.success('Stage created successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to create stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerJourneyStageFormData }) =>
      updateCustomerJourneyStage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-journey-stages'] });
      toast.success('Stage updated successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to update stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const onSubmit = async (data: CreateCustomerJourneyStageFormData | UpdateCustomerJourneyStageFormData) => {
    if (isCreating) {
      // Ensure required fields are present
      if (!data.name || !data.journey_phase) {
        toast.error('Name and Journey Phase are required');
        return;
      }
      
      // Auto-generate code from name (lowercase)
      const generatedCode = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      // Auto-generate order index
      const nextOrderIndex = await getNextOrderIndex(data.journey_phase);
      
      const createData = {
        ...data,
        code: generatedCode,
        order_index: nextOrderIndex,
      };
      
      createMutation.mutate(createData as CreateCustomerJourneyStageFormData);
    } else if (stage) {
      // For edit mode, use the user-provided code (no auto-generation)
      updateMutation.mutate({
        id: stage.customer_journey_stage_id,
        data: data as UpdateCustomerJourneyStageFormData,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        aria-labelledby="create-edit-stage-modal"
        sx={{
          maxWidth: 600,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <ModalClose />
        <Typography id="create-edit-stage-modal" level="h2">
          {isCreating ? 'Create New Stage' : 'Edit Stage'}
        </Typography>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl error={!!errors.journey_phase}>
              <FormLabel>Journey Phase</FormLabel>
              <Select
                value={watch('journey_phase')}
                onChange={(_, value) => setValue('journey_phase', value as JourneyPhaseType)}
                placeholder="Select journey phase"
              >
                {JOURNEY_PHASES.map((phase) => (
                  <Option key={phase.value} value={phase.value}>
                    {phase.label}
                  </Option>
                ))}
              </Select>
              {errors.journey_phase && (
                <Typography level="body-sm" color="danger" sx={{ mt: 0.5 }}>
                  {errors.journey_phase.message}
                </Typography>
              )}
            </FormControl>

            <FormControl error={!!errors.name}>
              <FormLabel>Name *</FormLabel>
              <Input
                {...register('name')}
                placeholder="Enter stage name"
                disabled={isLoading}
              />
              {errors.name && (
                <Typography level="body-sm" color="danger" sx={{ mt: 0.5 }}>
                  {errors.name.message}
                </Typography>
              )}
            </FormControl>

            <FormControl error={!!errors.description}>
              <FormLabel>Description *</FormLabel>
              <Textarea
                {...register('description')}
                placeholder="Enter stage description"
                minRows={3}
                disabled={isLoading}
              />
              {errors.description && (
                <Typography level="body-sm" color="danger" sx={{ mt: 0.5 }}>
                  {errors.description.message}
                </Typography>
              )}
            </FormControl>

            <FormControl error={!!errors.graduation_criteria}>
              <FormLabel>Graduation Criteria *</FormLabel>
              <Textarea
                {...register('graduation_criteria')}
                placeholder="Enter graduation criteria"
                minRows={3}
                disabled={isLoading}
              />
              {errors.graduation_criteria && (
                <Typography level="body-sm" color="danger" sx={{ mt: 0.5 }}>
                  {errors.graduation_criteria.message}
                </Typography>
              )}
            </FormControl>

            {/* Code field - only show in edit mode */}
            {!isCreating && (
              <FormControl error={!!errors.code}>
                <FormLabel>Code</FormLabel>
                <Input
                  {...register('code')}
                  placeholder="Enter stage code"
                  disabled={isLoading}
                />
                {errors.code && (
                  <Typography level="body-sm" color="danger" sx={{ mt: 0.5 }}>
                    {errors.code.message}
                  </Typography>
                )}
              </FormControl>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="solid"
                color="primary"
                loading={isLoading}
                disabled={isLoading}
                sx={{ flex: 1 }}
              >
                {isCreating ? 'Create Stage' : 'Update Stage'}
              </Button>
              <Button
                variant="outlined"
                color="neutral"
                onClick={onClose}
                disabled={isLoading}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  );
}
