'use client';

import Chip from '@mui/joy/Chip';
import { ListSubtype } from '../lib/constants/lists';

const styles: Record<ListSubtype, { bgcolor: string; color: string }> = {
  [ListSubtype.PEOPLE]: { bgcolor: '#F3F4F6', color: '#374151' },
  [ListSubtype.COMPANY]: { bgcolor: '#F3E8FF', color: '#1E40AF' },
};

interface TypeListChipProps {
  type: ListSubtype;
}

export function TypeListChip({ type }: TypeListChipProps): React.JSX.Element {
  const chipStyle = styles[type];
  const label = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <Chip
      size='sm'
      variant='soft'
      sx={{
        fontSize: '12px',
        height: '24px',
        fontWeight: '500',
        borderRadius: '12px',
        px: 1.5,
        ...chipStyle,
      }}
    >
      {label}
    </Chip>
  );
}
