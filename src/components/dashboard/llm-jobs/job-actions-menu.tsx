'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import { Popper } from '@mui/base/Popper';
import { Eye as EyeIcon, X as CancelIcon, Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr';

import type { LLMJobWithRelations } from '@/types/llm-jobs';
import { CANCELLABLE_STATUSES } from '@/types/llm-jobs';
import { toast } from '@/components/core/toaster';

interface JobActionsMenuProps {
  job: LLMJobWithRelations;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onViewDetails: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  isCancelling?: boolean;
}

const menuItemStyle = {
  padding: { xs: '6px 12px', sm: '8px 16px' },
  fontSize: { xs: '12px', sm: '14px' },
  fontWeight: '400',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  color: 'var(--joy-palette-text-primary)',
  '&:hover': { backgroundColor: 'var(--joy-palette-background-level1)' },
  gap: { xs: '10px', sm: '14px' },
};

const dangerItemStyle = {
  ...menuItemStyle,
  color: 'var(--joy-palette-danger-600)',
  '&:hover': {
    backgroundColor: 'var(--joy-palette-danger-softBg)',
    color: 'var(--joy-palette-danger-700)',
  },
};

export function JobActionsMenu({
  job,
  anchorEl,
  onClose,
  onViewDetails,
  onCancel,
  isCancelling,
}: JobActionsMenuProps): React.JSX.Element | null {
  const open = Boolean(anchorEl);

  const canCancel = CANCELLABLE_STATUSES.includes(job.status);

  const handleViewDetails = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onViewDetails(job.id);
    onClose();
  };

  const handleCancel = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onCancel(job.id);
    onClose();
  };

  const handleCopyId = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(job.id).then(() => {
      toast.success('Job ID copied to clipboard');
    });
    onClose();
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [anchorEl, open, onClose]);

  if (!open) return null;

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement='bottom-start'
      style={{
        minWidth: '150px',
        borderRadius: '8px',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        backgroundColor: 'var(--joy-palette-background-surface)',
        zIndex: 1300,
        border: '1px solid var(--joy-palette-divider)',
      }}
    >
      <Box onMouseDown={handleViewDetails} sx={menuItemStyle}>
        <EyeIcon fontSize='20px' />
        View details
      </Box>

      <Box onMouseDown={handleCopyId} sx={menuItemStyle}>
        <CopyIcon fontSize='20px' />
        Copy ID
      </Box>

      {canCancel && (
        <Box
          onMouseDown={isCancelling ? undefined : handleCancel}
          sx={{
            ...dangerItemStyle,
            opacity: isCancelling ? 0.5 : 1,
            cursor: isCancelling ? 'not-allowed' : 'pointer',
          }}
        >
          <CancelIcon fontSize='20px' />
          {isCancelling ? 'Cancelling...' : 'Cancel job'}
        </Box>
      )}
    </Popper>
  );
}
