'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Textarea from '@mui/joy/Textarea';
import FormHelperText from '@mui/joy/FormHelperText';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { Breadcrumbs } from '@mui/joy';
import { Plus, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import {
  useFramingConcepts,
  useCreateFramingConcept,
  useUpdateFramingConcept,
  useDeleteFramingConcept,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import { useActiveStyleGuide } from '@/app/(scalekit)/style-guide/lib/hooks';
import { useUserInfo } from '@/hooks/use-user-info';
import CircularProgress from '@mui/joy/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFramingConceptPayloadSchema } from '@/app/(scalekit)/style-guide/lib/types/validation';
import type { z } from 'zod';
import { toast } from '@/components/core/toaster';
import Alert from '@mui/joy/Alert';

type FormData = z.infer<typeof createFramingConceptPayloadSchema>;

export default function FramingConceptsPage(): React.JSX.Element {
  const router = useRouter();
  const { userInfo, isUserLoading } = useUserInfo();
  const customerId = userInfo?.customerId || null;
  const [openModal, setOpenModal] = React.useState(false);
  const [editingConcept, setEditingConcept] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: activeGuide, isLoading: isLoadingGuide } = useActiveStyleGuide(customerId || '');
  const styleGuideId = activeGuide?.style_guide_id || null;

  const { data: conceptsData, isLoading: isLoadingConcepts } = useFramingConcepts(
    styleGuideId ? { style_guide_id: styleGuideId } : undefined
  );

  const isLoading = isUserLoading || isLoadingGuide || isLoadingConcepts;

  const createMutation = useCreateFramingConcept();
  const updateMutation = useUpdateFramingConcept();
  const deleteMutation = useDeleteFramingConcept();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(createFramingConceptPayloadSchema),
    defaultValues: {
      style_guide_id: styleGuideId || '',
      name: '',
      description: '',
    },
  });

  React.useEffect(() => {
    if (styleGuideId) {
      setValue('style_guide_id', styleGuideId);
    }
  }, [styleGuideId, setValue]);

  const handleOpenCreate = () => {
    setEditingConcept(null);
    reset({
      style_guide_id: styleGuideId || '',
      name: '',
      description: '',
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (conceptId: string) => {
    const concept = conceptsData?.data.find((c) => c.framing_concept_id === conceptId);
    if (concept) {
      setEditingConcept(conceptId);
      reset({
        style_guide_id: concept.style_guide_id,
        name: concept.name,
        description: concept.description || '',
      });
      setOpenModal(true);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingConcept(null);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editingConcept) {
        await updateMutation.mutateAsync({
          framing_concept_id: editingConcept,
          ...data,
        });
      } else {
        await createMutation.mutateAsync(data);
        router.refresh();
      }
      handleCloseModal();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (conceptId: string) => {
    if (window.confirm('Are you sure you want to delete this framing concept?')) {
      await deleteMutation.mutateAsync(conceptId);
    }
  };

  const filteredConcepts =
    conceptsData?.data.filter(
      (concept) =>
        concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concept.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  if (!isLoading && (!customerId || !styleGuideId)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color='warning'>
          <Typography>
            Please create a style guide first before managing framing concepts.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href='/style-guide/'>Style Guide</BreadcrumbsItem>
          <Typography>Framing Concepts</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Stack spacing={1}>
            <Typography level='h1'>Framing Concepts</Typography>
            <Typography level='body-md' color='neutral'>
              Define metaphors and long-form framing to guide AI-generated content
            </Typography>
          </Stack>
          <Button
            startDecorator={<Plus />}
            onClick={handleOpenCreate}
            aria-label='Create framing concept'
          >
            New Framing Concept
          </Button>
        </Stack>

        {/* Search */}
        <Input
          startDecorator={<MagnifyingGlass />}
          placeholder='Search framing concepts...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label='Search framing concepts'
        />

        {/* Table */}
        {isLoading || isLoadingConcepts ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table aria-label='Framing concepts table'>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConcepts.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                      <Typography level='body-md' color='neutral'>
                        {searchQuery ? 'No concepts match your search' : 'No framing concepts yet'}
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  filteredConcepts.map((concept) => (
                    <tr
                      key={concept.framing_concept_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleOpenEdit(concept.framing_concept_id)}
                    >
                      <td>
                        <Typography fontWeight='md'>{concept.name}</Typography>
                      </td>
                      <td>
                        <Typography
                          level='body-sm'
                          sx={{
                            maxWidth: 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {concept.description || '—'}
                        </Typography>
                      </td>
                      <td>
                        <Typography level='body-sm'>
                          {new Date(concept.created_at).toLocaleDateString()}
                        </Typography>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Stack direction='row' spacing={1}>
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='neutral'
                            onClick={() => handleOpenEdit(concept.framing_concept_id)}
                            aria-label={`Edit ${concept.name}`}
                          >
                            <PencilSimple />
                          </IconButton>
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='danger'
                            onClick={() => handleDelete(concept.framing_concept_id)}
                            aria-label={`Delete ${concept.name}`}
                          >
                            <Trash />
                          </IconButton>
                        </Stack>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Box>
        )}
      </Stack>

      {/* Create/Edit Modal */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <ModalDialog
          role='dialog'
          aria-modal='true'
          aria-labelledby='framing-concept-modal-title'
          sx={{ minWidth: 500 }}
        >
          <ModalClose />
          <Typography id='framing-concept-modal-title' level='h2'>
            {editingConcept ? 'Edit Framing Concept' : 'Create Framing Concept'}
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl error={!!errors.name} required>
                <FormLabel>Name *</FormLabel>
                <Input
                  {...register('name')}
                  placeholder='Enter concept name'
                  aria-label='Concept name'
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  aria-required='true'
                />
                {errors.name && (
                  <FormHelperText id='name-error'>{errors.name.message}</FormHelperText>
                )}
              </FormControl>

              <FormControl error={!!errors.description}>
                <FormLabel>Description</FormLabel>
                <Textarea
                  {...register('description')}
                  placeholder='Enter concept description'
                  minRows={4}
                  aria-label='Concept description'
                />
              </FormControl>

              <Stack direction='row' spacing={2} sx={{ justifyContent: 'flex-end' }}>
                <Button variant='outlined' onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  type='submit'
                  loading={isSubmitting || createMutation.isPending || updateMutation.isPending}
                >
                  {editingConcept ? 'Update' : 'Create'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
