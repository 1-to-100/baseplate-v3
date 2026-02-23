import * as React from 'react';
import Button from '@mui/joy/Button';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Export as ExportIcon } from '@phosphor-icons/react/dist/ssr';
import { PencilLine, ArrowClockwise } from '@phosphor-icons/react';
import { formLabelClasses } from '@mui/joy';

type VisualStyleGuideHeaderProps = {
  name: string;
  description?: string | null;
  onPublish: () => void;
  isEditableView: boolean;
  handleVisualStyleGuideEdit: (isEditable: boolean) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showRefresh?: boolean;
  canEdit?: boolean;
};

export default function VisualStyleGuideHeader({
  name,
  description,
  onPublish,
  isEditableView,
  handleVisualStyleGuideEdit,
  onRefresh,
  isRefreshing = false,
  showRefresh = false,
  canEdit = true,
}: VisualStyleGuideHeaderProps): React.JSX.Element {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={3}
      justifyContent='space-between'
      alignItems='center'
      width='100%'
    >
      {/* <Stack spacing={1} sx={{ flex: "1 1 auto" }}> */}
      <Typography level='h1'>Visual Style</Typography>
      {/* {description ? (
          <Typography level="body-md" color="neutral">
            {description}
          </Typography>
        ) : null}
      </Stack> */}
      <Stack direction='row' spacing={1}>
        {/* {showRefresh && onRefresh && (
          <Button
            variant='outlined'
            color='neutral'
            startDecorator={<ArrowClockwise />}
            onClick={onRefresh}
            disabled={isRefreshing}
            loading={isRefreshing}
          >
            Refresh
          </Button>
        )} */}
        {canEdit ? (
          isEditableView ? (
            <Button
              variant='soft'
              color='neutral'
              onClick={() => handleVisualStyleGuideEdit(false)}
            >
              Exit Edit Mode
            </Button>
          ) : (
            <Button
              variant='solid'
              color='primary'
              startDecorator={<PencilLine />}
              onClick={() => handleVisualStyleGuideEdit(true)}
            >
              Edit
            </Button>
          )
        ) : null}
        {/* TODO: Add back in when publish functionality/versioning is implemented later. */}
        {/* {canEdit ? (
          <Button variant='solid' color='primary' onClick={onPublish}>
            Mark as Final
          </Button>
        ) : null} */}
      </Stack>
    </Stack>
  );
}
