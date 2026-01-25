'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import { toast } from '@/components/core/toaster';

// Note: This is a placeholder modal. In production, you would need to:
// 1. Create an updateCompany API function
// 2. Implement proper form validation
// 3. Handle the actual update logic

interface EditCompanyModalProps {
  open: boolean;
  onClose: () => void;
  company: { id: number; name?: string; description?: string; website?: string } | null;
  onSuccess?: () => void;
}

export default function EditCompanyModal({
  open,
  onClose,
  company,
  onSuccess,
}: EditCompanyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (company && open) {
      setFormData({
        name: company.name || '',
        description: company.description || '',
        website: company.website || '',
      });
    }
  }, [company, open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        // TODO: Implement actual update API call
        // await updateCompany(company!.id, formData);

        toast.success('Company updated successfully');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } catch (error) {
        toast.error('Failed to update company');
        console.error('Update error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [company, onSuccess, onClose]
  );

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ maxWidth: 500, width: '90%' }}>
        <ModalClose />
        <Typography level='title-lg' sx={{ mb: 2 }}>
          Edit Company
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Company Name</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                minRows={3}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Website</FormLabel>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder='https://example.com'
              />
            </FormControl>
            <Stack direction='row' spacing={2} sx={{ justifyContent: 'flex-end', mt: 2 }}>
              <Button variant='outlined' onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type='submit' disabled={isSubmitting} loading={isSubmitting}>
                Save Changes
              </Button>
            </Stack>
          </Stack>
        </form>
      </ModalDialog>
    </Modal>
  );
}
