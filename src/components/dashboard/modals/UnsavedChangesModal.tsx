'use client';

import * as React from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';

interface UnsavedChangesModalProps {
  open: boolean;
  onClose: () => void;
  onLeaveWithoutSaving: () => void;
  onStay: () => void;
}

export default function UnsavedChangesModal({
  open,
  onClose,
  onLeaveWithoutSaving,
  onStay,
}: UnsavedChangesModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: 400,
          p: 3,
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <ModalClose sx={{ color: '#6B7280' }} />
        <Typography
          level='h3'
          sx={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--joy-palette-text-primary)',
            mb: 2,
          }}
        >
          Leave without saving?
        </Typography>
        <Typography
          level='body-md'
          sx={{
            fontSize: '14px',
            color: 'var(--joy-palette-text-secondary)',
            mb: 3,
            lineHeight: 1.5,
          }}
        >
          If you exit now, your list will not be saved. Are you sure you want to leave?
        </Typography>
        <Stack direction='row' spacing={2} justifyContent='flex-end'>
          <Button
            variant='outlined'
            onClick={onLeaveWithoutSaving}
            sx={{
              borderRadius: '6px',
              borderColor: 'var(--joy-palette-divider)',
              color: 'var(--joy-palette-text-primary)',
              '&:hover': {
                borderColor: 'var(--joy-palette-text-secondary)',
              },
            }}
          >
            Leave without saving
          </Button>
          <Button
            variant='solid'
            color='primary'
            onClick={onStay}
            sx={{
              borderRadius: '6px',
            }}
          >
            Stay
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
