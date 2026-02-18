import * as React from 'react';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { PencilLine, MagicWand } from '@phosphor-icons/react';

type WrittenStyleGuideHeaderProps = {
  name: string;
  onPublish: () => void;
  isEditableView: boolean;
  handleWrittenStyleGuideEdit: (isEditable: boolean) => void;
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
  canEdit?: boolean;
};

export default function WrittenStyleGuideHeader({
  name,
  onPublish,
  isEditableView,
  handleWrittenStyleGuideEdit,
  onReanalyze,
  isReanalyzing = false,
  canEdit = true,
}: WrittenStyleGuideHeaderProps): React.JSX.Element {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={3}
      justifyContent='space-between'
      alignItems='center'
      width='100%'
    >
      <Stack direction='row' spacing={2} alignItems='center'>
        <Typography level='h1'>Written Style</Typography>
      </Stack>
      <Stack direction='row' spacing={1}>
        {canEdit && onReanalyze ? (
          <Button
            variant='outlined'
            color='neutral'
            startDecorator={<MagicWand />}
            onClick={onReanalyze}
            disabled={isReanalyzing}
            loading={isReanalyzing}
          >
            Reanalyze
          </Button>
        ) : null}
        {canEdit ? (
          isEditableView ? (
            <Button
              variant='soft'
              color='neutral'
              onClick={() => handleWrittenStyleGuideEdit(false)}
            >
              Exit Edit Mode
            </Button>
          ) : (
            <Button
              variant='solid'
              color='primary'
              startDecorator={<PencilLine />}
              onClick={() => handleWrittenStyleGuideEdit(true)}
            >
              Edit
            </Button>
          )
        ) : null}

        {canEdit ? (
          <Button variant='solid' color='primary' onClick={onPublish}>
            Mark as Final
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
