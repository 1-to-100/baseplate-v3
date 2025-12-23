import * as React from "react";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { Export as ExportIcon } from "@phosphor-icons/react/dist/ssr";
import { PencilLine } from "@phosphor-icons/react";
import { formLabelClasses } from "@mui/joy";

type VisualStyleGuideHeaderProps = {
  name: string;
  description?: string | null;
  onPublish: () => void;
  isEditableView: boolean;
  handleVisualStyleGuideEdit: (isEditable: boolean) => void;
};

export default function VisualStyleGuideHeader({
  name,
  description,
  onPublish,
  isEditableView,
  handleVisualStyleGuideEdit,
}: VisualStyleGuideHeaderProps): React.JSX.Element {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={3}
      justifyContent="space-between"
      alignItems="center"
      width="100%"
    >
      {/* <Stack spacing={1} sx={{ flex: "1 1 auto" }}> */}
      <Typography level="h1">Visual Style</Typography>
      {/* {description ? (
          <Typography level="body-md" color="neutral">
            {description}
          </Typography>
        ) : null}
      </Stack> */}
      <Stack direction="row" spacing={1}>
        {isEditableView ? (
          <Button
            variant="soft"
            color="neutral"
            onClick={() => handleVisualStyleGuideEdit(false)}
          >
            Exit Edit Mode
          </Button>
        ) : (
          <Button
            variant="soft"
            color="neutral"
            startDecorator={<PencilLine />}
            onClick={() => handleVisualStyleGuideEdit(true)}
          >
            Edit
          </Button>
        )}

        <Button variant="solid" color="primary" onClick={onPublish}>
          Mark as Final
        </Button>
      </Stack>
    </Stack>
  );
}
