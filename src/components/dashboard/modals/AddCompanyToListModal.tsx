'use client';

import * as React from 'react';
import { useCallback, useState } from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import { toast } from '@/components/core/toaster';

// Note: This is a placeholder modal. In production, you would need to:
// 1. Fetch available segments/lists
// 2. Allow user to select which lists to add companies to
// 3. Implement the actual API call to add companies to lists

interface AddCompanyToListModalProps {
  open: boolean;
  onClose: () => void;
  companyIds: number[];
  onSuccess?: () => void;
}

export default function AddCompanyToListModal({
  open,
  onClose,
  companyIds,
  onSuccess,
}: AddCompanyToListModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // TODO: Implement actual API call to add companies to lists
      // await addCompaniesToList(companyIds, selectedListIds);

      toast.success(
        `${companyIds.length} company${companyIds.length > 1 ? 'ies' : ''} added to list`
      );
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      toast.error('Failed to add companies to list');
      console.error('Add to list error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [companyIds, onSuccess, onClose]);

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 500, width: '90%' }}>
        <ModalClose />
        <Typography level='title-lg' sx={{ mb: 2 }}>
          Add to List
        </Typography>
        <Stack spacing={2}>
          <Typography level='body-md'>
            Add {companyIds.length} company{companyIds.length > 1 ? 'ies' : ''} to a segment?
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            TODO: Implement list selection UI
          </Typography>
          <Stack direction='row' spacing={2} sx={{ justifyContent: 'flex-end', mt: 2 }}>
            <Button variant='outlined' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} loading={isSubmitting}>
              Add to List
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
