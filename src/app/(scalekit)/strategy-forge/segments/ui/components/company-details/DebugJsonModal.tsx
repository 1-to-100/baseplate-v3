'use client';

import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import CircularProgress from '@mui/joy/CircularProgress';
import type { DebugJsonModalProps } from './types';

export default function DebugJsonModal({
  open,
  onClose,
  title,
  data,
  isLoading = false,
  error = null,
}: DebugJsonModalProps): React.JSX.Element {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          maxWidth: 1200,
          width: '95%',
          maxHeight: '95vh',
          borderRadius: '8px',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ModalClose />
        <Typography
          level='h3'
          sx={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--joy-palette-text-primary)',
            mb: 2,
          }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            bgcolor: 'var(--joy-palette-background-level1)',
            borderRadius: '8px',
            p: 2,
            mb: 2,
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: 1.6,
            minHeight: '400px',
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
              }}
            >
              <CircularProgress size='md' />
            </Box>
          ) : error ? (
            <Typography
              sx={{
                color: 'var(--joy-palette-danger-600)',
                fontSize: '14px',
              }}
            >
              Error loading data: {error.message || 'Unknown error occurred'}
            </Typography>
          ) : data ? (
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--joy-palette-text-primary)',
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant='solid'
            onClick={onClose}
            sx={{
              bgcolor: 'var(--joy-palette-primary-600)',
              color: 'white',
              '&:hover': {
                bgcolor: 'var(--joy-palette-primary-700)',
              },
            }}
          >
            Close
          </Button>
        </Box>
      </ModalDialog>
    </Modal>
  );
}
