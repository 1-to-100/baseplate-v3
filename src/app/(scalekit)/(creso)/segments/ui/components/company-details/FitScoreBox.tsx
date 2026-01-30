'use client';

import React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import { Lightbulb } from '@phosphor-icons/react/dist/ssr';
import type { FitScoreBoxProps } from './types';

export default function FitScoreBox({
  score,
  description,
  hasScore,
}: FitScoreBoxProps): React.JSX.Element {
  return (
    <Box
      sx={{
        bgcolor: 'var(--joy-palette-background-navActiveBg)',
        borderRadius: 2,
        p: 1,
        mt: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Lightbulb size={20} color='var(--joy-palette-warning-600)' />
      <Typography
        sx={{
          fontSize: '14px',
          color: 'var(--joy-palette-text-primary)',
        }}
      >
        {hasScore && score !== undefined
          ? `Fit score: ${score}/10 — ${description || ''}`
          : 'This company has not been scored yet. Check back later or refresh to update.'}
      </Typography>
    </Box>
  );
}
