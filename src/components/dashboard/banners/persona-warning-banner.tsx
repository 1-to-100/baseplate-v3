'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import IconButton from '@mui/joy/IconButton';
import { X } from '@phosphor-icons/react/dist/ssr/X';
import type { SxProps } from '@mui/system/styleFunctionSx';

export interface PersonaWarningBannerProps {
  onDismiss: () => void;
  message: React.ReactNode;
  isExpandedView?: boolean;
  sx?: SxProps;
}

export function PersonaWarningBanner({
  onDismiss,
  message,
  isExpandedView = false,
  sx,
}: PersonaWarningBannerProps): React.JSX.Element {
  const leftValue = {
    xs: '50%',
    sm: isExpandedView ? '50%' : 'calc(50% + 160px)',
  } as const;

  return (
    <Box
      role='alert'
      sx={{
        position: 'absolute',
        bottom: 120,
        left: leftValue,
        transform: 'translateX(-50%)',
        zIndex: 10,
        px: 2,
        py: 0.75,
        borderRadius: 10,
        bgcolor: 'var(--joy-palette-warning-100)',
        color: 'var(--joy-palette-warning-800)',
        border: '1px solid var(--joy-palette-warning-300)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        maxWidth: { xs: 'calc(100% - 32px)', sm: 900 },
        width: 'auto',
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography fontSize={14} sx={{ lineHeight: 1.6, fontWeight: 300 }}>
          {message}
        </Typography>
      </Box>
      <IconButton
        size='sm'
        variant='plain'
        color='neutral'
        aria-label='Dismiss'
        onClick={onDismiss}
        sx={{
          ml: 1,
          color: 'var(--joy-palette-text-secondary)',
          '&:hover': { bgcolor: 'transparent', opacity: 0.8 },
        }}
      >
        <X size={16} />
      </IconButton>
    </Box>
  );
}

export default PersonaWarningBanner;
