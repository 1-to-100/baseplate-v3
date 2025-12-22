'use client';

import * as React from 'react';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import CircularProgress from '@mui/joy/CircularProgress';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Modal from '@mui/joy/Modal';
import ModalClose from '@mui/joy/ModalClose';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalOverflow from '@mui/joy/ModalOverflow';
import Stack from '@mui/joy/Stack';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';

import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/core/toaster';

interface PersonaCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Step1Data {
  name: string;
  jobDescription: string;
}

type Step = 1 | 2;

export function PersonaCreationDialog({
  open,
  onClose,
  onSuccess,
}: PersonaCreationDialogProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = React.useState<Step>(1);
  const [statusMessage, setStatusMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const supabase = React.useMemo(() => createClient(), []);

  const [step1Data, setStep1Data] = React.useState<Step1Data>({
    name: '',
    jobDescription: '',
  });

  React.useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setStep1Data({ name: '', jobDescription: '' });
      setStatusMessage('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleCreatePersona = async () => {
    if (!step1Data.name.trim() || !step1Data.jobDescription.trim()) {
      toast.error('Please fill in both name and job description');
      return;
    }

    setCurrentStep(2);
    setIsSubmitting(true);
    setStatusMessage('Creating persona with AI...');
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-persona', {
        body: {
          name: step1Data.name.trim(),
          description: step1Data.jobDescription.trim(),
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create persona');
      }

      if (!data || data.success !== true) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'The persona could not be created. Please try again.'
        );
      }

      toast.success('Persona created successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating persona:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to create persona. Please try again.';
      toast.error(`Failed to create persona: ${message}`);
      setErrorMessage(message);
      setCurrentStep(1);
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={() => {}}>
      <ModalOverflow>
        <ModalDialog
          aria-labelledby='persona-creation-modal'
          sx={{
            width: '40vw',
            maxWidth: 'none',
            minWidth: '600px',
            borderRadius: 'md',
            p: 3,
            boxShadow: 'lg',
          }}
        >
          <ModalClose variant='plain' sx={{ m: 1 }} onClick={handleClose} disabled={isSubmitting} />

          <Typography component='h2' id='persona-creation-modal' level='h4' fontWeight='lg' mb={1}>
            Create New Persona
          </Typography>

          <Typography level='body-sm' color='neutral' sx={{ mb: 3 }}>
            {currentStep === 1
              ? 'Enter basic information about the persona'
              : 'Creating persona with AI...'}
          </Typography>

          {currentStep === 1 && (
            <Stack spacing={3}>
              <Card variant='outlined'>
                <CardContent>
                  <Stack spacing={3}>
                    <Typography level='title-md'>Persona Information</Typography>

                    <FormControl>
                      <FormLabel>Persona Name *</FormLabel>
                      <Input
                        value={step1Data.name}
                        onChange={(event) =>
                          setStep1Data((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder='e.g., Marketing Manager, Sales Director, Product Owner'
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Job Description *</FormLabel>
                      <Textarea
                        value={step1Data.jobDescription}
                        onChange={(event) =>
                          setStep1Data((prev) => ({
                            ...prev,
                            jobDescription: event.target.value,
                          }))
                        }
                        placeholder='Briefly describe what this person does in their role...'
                        minRows={3}
                      />
                    </FormControl>
                  </Stack>
                </CardContent>
              </Card>

              {errorMessage && (
                <Typography level='body-sm' color='danger'>
                  {errorMessage}
                </Typography>
              )}

              <Stack direction='row' spacing={2}>
                <Button
                  variant='outlined'
                  color='neutral'
                  onClick={handleClose}
                  disabled={isSubmitting}
                  sx={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  variant='solid'
                  color='primary'
                  onClick={handleCreatePersona}
                  disabled={
                    !step1Data.name.trim() || !step1Data.jobDescription.trim() || isSubmitting
                  }
                  loading={isSubmitting}
                  sx={{ flex: 1 }}
                >
                  Create Persona
                </Button>
              </Stack>
            </Stack>
          )}

          {currentStep === 2 && (
            <Card variant='outlined'>
              <CardContent>
                <Stack spacing={3} alignItems='center' sx={{ py: 4 }}>
                  {isSubmitting ? <CircularProgress size='lg' /> : null}
                  <Typography level='h4' color='primary'>
                    {isSubmitting ? 'Creating Persona' : 'Almost there...'}
                  </Typography>
                  <Typography level='body-lg' color='neutral' sx={{ textAlign: 'center' }}>
                    {statusMessage || 'Finishing up the persona creation process.'}
                  </Typography>
                  <Typography level='body-sm' color='neutral' sx={{ textAlign: 'center' }}>
                    This typically takes 30-60 seconds.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}
        </ModalDialog>
      </ModalOverflow>
    </Modal>
  );
}
