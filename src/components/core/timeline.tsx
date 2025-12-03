import * as React from 'react';
import Box from '@mui/joy/Box';

export interface TimelineProps {
  children: React.ReactNode;
}

export function Timeline({ children }: TimelineProps): React.JSX.Element {
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {children}
    </Box>
  );
}

export interface TimelineItemProps {
  children: React.ReactNode;
}

export function TimelineItem({ children }: TimelineItemProps): React.JSX.Element {
  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        '&:last-of-type': { '& > div:first-of-type': { '& > div:last-of-type': { display: 'none' } } },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box
          sx={{
            bgcolor: 'var(--joy-palette-neutral-300)',
            borderRadius: '50%',
            height: '8px',
            mt: '4px',
            width: '8px',
          }}
        />
        <Box sx={{ bgcolor: 'var(--joy-palette-neutral-100)', flex: '1 1 auto', width: '1px', my: '8px' }} />
      </Box>
      {children}
    </Box>
  );
}

export interface TimelineContentProps {
  children: React.ReactNode;
}

export function TimelineContent({ children }: TimelineContentProps): React.JSX.Element {
  return <Box sx={{ pl: '8px', pb: '16px' }}>{children}</Box>;
}
