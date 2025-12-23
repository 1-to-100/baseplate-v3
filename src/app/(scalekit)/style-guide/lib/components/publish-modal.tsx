'use client';

import * as React from 'react';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import Checkbox from '@mui/joy/Checkbox';
import Alert from '@mui/joy/Alert';
import { CheckCircle as CheckCircleIcon, XCircle as XCircleIcon, Warning as WarningIcon } from '@phosphor-icons/react/dist/ssr';
import { toast } from '@/components/core/toaster';

interface ValidationItem {
  key: string;
  label: string;
  passed: boolean;
  href?: string;
}

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  validationItems?: ValidationItem[];
  guideName?: string;
}

export function PublishModal({
  open,
  onClose,
  onConfirm,
  validationItems = [],
  guideName = 'Visual Style Guide',
}: PublishModalProps): React.JSX.Element {
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [lockTemplates, setLockTemplates] = React.useState(true);

  const handleConfirm = React.useCallback(async () => {
    setIsPublishing(true);
    try {
      await onConfirm();
      onClose();
      toast.success('Visual style guide published successfully');
    } catch (error) {
      toast.error('Failed to publish visual style guide');
    } finally {
      setIsPublishing(false);
    }
  }, [onConfirm, onClose]);

  const allValidationsPassed = validationItems.every(item => item.passed);
  const hasWarnings = validationItems.some(item => !item.passed);

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{ maxWidth: 600, width: '100%' }}
        aria-labelledby="publish-modal-title"
        aria-describedby="publish-modal-description"
      >
        <ModalClose />
        <Typography id="publish-modal-title" level="title-lg" component="h2">
          Publish Visual Style Guide
        </Typography>
        <Typography id="publish-modal-description" level="body-md" color="neutral" sx={{ mt: 1 }}>
          Confirm locking tokens and making this guide immutable for downstream templates
        </Typography>

        <Stack spacing={3} sx={{ mt: 3 }}>
          {validationItems.length > 0 && (
            <Stack spacing={2}>
              <Typography level="title-md">Validation Checklist</Typography>
              <List>
                {validationItems.map((item) => (
                  <ListItem key={item.key}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
                      {item.passed ? (
                        <CheckCircleIcon color="green" size={20} aria-label={`${item.label} passed`} />
                      ) : (
                        <XCircleIcon color="red" size={20} aria-label={`${item.label} failed`} />
                      )}
                      <Typography
                        level="body-md"
                        color={item.passed ? 'success' : 'danger'}
                        sx={{ flex: 1 }}
                      >
                        {item.label}
                      </Typography>
                      {item.href && (
                        <Button
                          size="sm"
                          variant="plain"
                          onClick={() => window.location.href = item.href!}
                        >
                          Fix
                        </Button>
                      )}
                    </Stack>
                  </ListItem>
                ))}
              </List>

              {hasWarnings && (
                <Alert color="warning" startDecorator={<WarningIcon />}>
                  Some validation items failed. Please address them before publishing.
                </Alert>
              )}
            </Stack>
          )}

          <Stack spacing={2}>
            <Checkbox
              checked={lockTemplates}
              onChange={(e) => setLockTemplates(e.target.checked)}
              label="Lock downstream templates and tokens"
              aria-label="Lock downstream templates and tokens"
            />
            <Typography level="body-sm" color="neutral">
              When checked, all social templates will be locked and marked as published. 
              This makes the guide immutable for downstream template generation.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end', pt: 2 }}>
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={isPublishing}
              aria-label="Cancel publish"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPublishing || !allValidationsPassed}
              loading={isPublishing}
              aria-label="Confirm publish"
              aria-busy={isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Confirm Publish'}
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}

