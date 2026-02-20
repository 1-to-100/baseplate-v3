'use client';

import * as React from 'react';
import { useState } from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Checkbox from '@mui/joy/Checkbox';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createList } from '../lib/api/segment-lists';
import { DEFAULT_LIST_SUBTYPE } from '../lib/constants/lists';
import { paths } from '@/paths';
import { toast } from '@/components/core/toaster';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateListModal({
  open,
  onClose,
}: CreateListModalProps): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [isStatic, setIsStatic] = useState(false);

  const trimmedName = name.trim();
  const isNameValid =
    trimmedName.length >= MIN_NAME_LENGTH && trimmedName.length <= MAX_NAME_LENGTH;

  const createMutation = useMutation({
    mutationFn: createList,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      toast.success('List created successfully.');
      setName('');
      setIsStatic(false);
      onClose();
      if (!variables.is_static && data?.list_id) {
        router.push(`${paths.strategyForge.lists.create}?listId=${data.list_id}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create list.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid) {
      if (trimmedName.length === 0) {
        toast.error('List name cannot consist only of spaces.');
      } else if (trimmedName.length < MIN_NAME_LENGTH) {
        toast.error(`List name must be at least ${MIN_NAME_LENGTH} characters long.`);
      } else {
        toast.error(`List name must be no more than ${MAX_NAME_LENGTH} characters long.`);
      }
      return;
    }
    createMutation.mutate({
      name: trimmedName,
      subtype: DEFAULT_LIST_SUBTYPE,
      is_static: isStatic,
    });
  };

  const handleClose = () => {
    setName('');
    setIsStatic(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalDialog
        sx={{
          width: 520,
          p: 3,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <ModalClose sx={{ color: '#6B7280' }} />
        <Typography
          level='h3'
          sx={{
            fontSize: '24px',
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          Create new list
        </Typography>
        <Typography
          level='body-sm'
          sx={{
            fontSize: '14px',
            mb: 3,
            fontWeight: 400,
          }}
        >
          Configure your new list and choose how it behaves.
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Stack spacing={1.5}>
              <FormLabel sx={{ fontSize: '14px', fontWeight: 600 }}>List Settings</FormLabel>
              <FormControl>
                <Checkbox
                  checked={isStatic}
                  onChange={(e) => setIsStatic(e.target.checked)}
                  label='Static List'
                  sx={{
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    '& .MuiCheckbox-label': {
                      fontSize: '14px',
                      fontWeight: 400,
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
                <Typography
                  level='body-sm'
                  sx={{
                    pl: '1.9rem',
                    mt: 0.5,
                    color: 'var(--joy-palette-text-secondary)',
                  }}
                >
                  Does not update automatically.
                </Typography>
              </FormControl>
            </Stack>

            <Stack spacing={1.5}>
              <FormLabel sx={{ fontSize: '14px', fontWeight: 600 }}>List Details</FormLabel>
              <Input
                placeholder='List name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={(e) => setName(e.target.value.trim())}
                error={name.length > 0 && !isNameValid}
                sx={{
                  borderRadius: '6px',
                  fontSize: '14px',
                  borderColor: '#E5E7EB',
                }}
              />
              {name.length > 0 && !isNameValid && (
                <Typography fontSize={12} sx={{ color: 'var(--joy-palette-danger-500)', mt: 0.5 }}>
                  {trimmedName.length === 0
                    ? 'List name cannot consist only of spaces.'
                    : trimmedName.length < MIN_NAME_LENGTH
                      ? `List name must be at least ${MIN_NAME_LENGTH} characters long.`
                      : `List name must be no more than ${MAX_NAME_LENGTH} characters long.`}
                </Typography>
              )}
              {name.length > 0 && isNameValid && (
                <Typography fontSize={12} sx={{ color: 'var(--joy-palette-success-500)', mt: 0.5 }}>
                  {trimmedName.length}/{MAX_NAME_LENGTH} characters
                </Typography>
              )}
            </Stack>

            <Stack direction='row' spacing={2} justifyContent='flex-end' mt={2}>
              <Button
                type='button'
                variant='outlined'
                onClick={handleClose}
                sx={{ fontSize: '14px', fontWeight: 400, px: 3, py: 1 }}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                variant='solid'
                disabled={createMutation.isPending || !isNameValid}
                sx={{ fontSize: '14px', fontWeight: 400, px: 3, py: 1 }}
              >
                {createMutation.isPending ? 'Creating…' : 'Create List'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  );
}
