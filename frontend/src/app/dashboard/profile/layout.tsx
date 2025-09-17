"use client";

import * as React from 'react';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';

import { SettingsTabs } from '@/components/dashboard/settings/settings-tabs';
import { FormActionsContext } from '@/contexts/form-actions';

interface LayoutProps {
  children: React.ReactNode;
}

interface FormActions {
  onReset?: () => void;
  onSubmit?: () => void;
  setSubmitHandler?: (handler: () => void) => void;
}

export default function Layout({ children }: LayoutProps): React.JSX.Element {
  const [formActions, setFormActions] = React.useState<FormActions>({});
  const [submitHandler, setSubmitHandler] = React.useState<(() => void) | null>(null);

  React.useEffect(() => {
    setFormActions(prev => ({
      ...prev,
      setSubmitHandler: (handler: () => void) => setSubmitHandler(() => handler)
    }));
  }, []);

  return (
    <FormActionsContext.Provider value={formActions}>
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level="h1">
              Profile
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                onClick={formActions.onReset}
                variant="outlined"
              >
                Cancel
              </Button>
              <Button onClick={() => submitHandler?.()}>Save</Button>
            </Stack>
          </Stack>
          <SettingsTabs />
          {children}
        </Stack>
      </Box>
    </FormActionsContext.Provider>
  );
}
