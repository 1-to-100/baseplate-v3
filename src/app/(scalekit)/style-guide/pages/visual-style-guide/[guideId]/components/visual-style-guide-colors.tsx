"use client";

import {
  useCreatePaletteColor,
  useDeletePaletteColor,
  usePaletteColors,
  useUpdatePaletteColor,
} from "@/app/(scalekit)/style-guide/lib/hooks";
import {
  COLOR_USAGE_OPTION,
  USAGE_OPTIONS,
} from "@/app/(scalekit)/style-guide/lib/constants/palette-colors";
import type { PaletteColor } from "@/app/(scalekit)/style-guide/lib/types";
import { toast } from "@/components/core/toaster";
import { Card, Grid } from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import CircularProgress from "@mui/joy/CircularProgress";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";
import ModalDialog from "@mui/joy/ModalDialog";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { Plus } from "@phosphor-icons/react";
import * as React from "react";

type ColorDraft = {
  hex: string;
  name: string;
  usage: (typeof USAGE_OPTIONS)[number]["value"];
};

type AddColorModalProps = {
  open: boolean;
  newColor: ColorDraft;
  setNewColor: React.Dispatch<React.SetStateAction<ColorDraft>>;
  onClose: () => void;
  onSubmit: () => void;
};

function AddColorModal({
  open,
  newColor,
  setNewColor,
  onClose,
  onSubmit,
}: AddColorModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog>
        <ModalClose />
        <Typography level="title-lg">Add Color</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <FormControl>
            <FormLabel>Hex Color</FormLabel>
            <Input
              type="color"
              value={String(newColor.hex || "#000000")}
              onChange={(e) =>
                setNewColor({ ...newColor, hex: e.target.value })
              }
              sx={{ width: "100%", height: 60 }}
            />
            <Input
              value={String(newColor.hex || "#000000")}
              onChange={(e) =>
                setNewColor({ ...newColor, hex: e.target.value })
              }
              placeholder="#000000"
              sx={{ mt: 1 }}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Name</FormLabel>
            <Input
              value={String(newColor.name || "")}
              onChange={(e) =>
                setNewColor({ ...newColor, name: e.target.value })
              }
              placeholder="e.g., Primary Blue"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Usage</FormLabel>
            <Select
              value={newColor.usage}
              onChange={(_, newValue) => {
                if (newValue)
                  setNewColor({
                    ...newColor,
                    usage: newValue as typeof newColor.usage,
                  });
              }}
            >
              {USAGE_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </FormControl>
          <Stack
            direction="row"
            spacing={2}
            sx={{ justifyContent: "flex-end", mt: 2 }}
          >
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>Add Color</Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}

type DeleteColorModalProps = {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
};

function DeleteColorModal({ open, onClose, onDelete }: DeleteColorModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog>
        <ModalClose />
        <Typography level="title-lg">Delete Color</Typography>
        <Typography level="body-md" sx={{ mt: 2 }}>
          Are you sure you want to delete this color? This action cannot be
          undone.
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 3, justifyContent: "flex-end" }}
        >
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" color="danger" onClick={onDelete}>
            Delete
          </Button>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}

export type ColorEditItemProps = {
  color: PaletteColor;
  colorLabel: string;
  onUpdateColor: (color: PaletteColor, field: string, value: unknown) => void;
};

export function ColorEditItem({ color, colorLabel, onUpdateColor }: ColorEditItemProps) {
  return (
    <ListItem
      sx={{
        flexDirection: { xs: "column", sm: "row" },
        p: 0,
      }}
    >
      <Grid
        container
        spacing={1}
        sx={{ width: "100%", alignItems: "flex-end" }}
      >
        <Grid xs={12} sm={9}>
          <Stack>
            <Typography level="body-sm">{colorLabel}</Typography>

            <Input
              value={String(color.hex || "").replace(/^#/, "")}
              onChange={(e) => {
                const rawValue = e.target.value.trim();
                const nextValue = rawValue.startsWith("#")
                  ? rawValue
                  : `#${rawValue}`;
                onUpdateColor(color, "hex", nextValue);
              }}
              startDecorator="#"
            />
          </Stack>
        </Grid>
        <Grid xs={12} sm={3}>
          {/* Color picker */}
          <Input
            type="color"
            value={String(color.hex || "#3f51ff")}
            onChange={(e) => onUpdateColor(color, "hex", e.target.value)}
            aria-label={`Pick color for ${colorLabel}`}
            slotProps={{
              root: {
                sx: {
                  position: "relative",
                  width: "100%",
                  height: 36,
                  borderRadius: "md",
                  overflow: "hidden",
                  cursor: "pointer",
                  border: 1,
                  background: String(color.hex || "#3f51ff"),
                  borderColor: "neutral.outlinedBorder",
                  p: 0,
                },
              },
              input: {
                sx: {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  p: 0,
                  border: "none",
                  opacity: 0,
                  cursor: "pointer",
                },
              },
            }}
          />
        </Grid>
      </Grid>
    </ListItem>
  );
}

export type ColorPreviewItemProps = {
  color: PaletteColor;
  colorLabel: string;
};

export function ColorPreviewItem({ color, colorLabel }: ColorPreviewItemProps) {
  return (
    <ListItem
      sx={{
        p: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Grid
        container
        spacing={1}
        sx={{ width: "100%", alignItems: "center" }}
      >
        <Grid xs={12} sm={4}>
          <Typography level="body-sm">{colorLabel}</Typography>
        </Grid>
        <Grid xs={12} sm={4}>
          <Typography level="body-sm">
            {String(color.hex || "")
              .replace(/^#/, "")
              .toUpperCase()}
          </Typography>
        </Grid>
        <Grid xs={12} sm={4}>
          <Box
            sx={{
              height: 18,
              bgcolor: String(color.hex || "#000000"),
              borderRadius: "8px",
              border: 1,
              borderColor: "divider",
            }}
          />
        </Grid>
      </Grid>
    </ListItem>
  );
}

type VisualStyleGuideColorsProps = {
  guideId: string;
  isEditable: boolean;
};

export default function VisualStyleGuideColors({
  guideId,
  isEditable,
}: VisualStyleGuideColorsProps): React.JSX.Element {
  const { data: colors, isLoading: colorsLoading } = usePaletteColors();
  const createColor = useCreatePaletteColor();
  const updateColor = useUpdatePaletteColor();
  const deleteColor = useDeletePaletteColor();

  const [addColorDialogOpen, setAddColorDialogOpen] = React.useState(false);
  const [newColor, setNewColor] = React.useState<ColorDraft>({
    hex: "#000000",
    name: "",
    usage: COLOR_USAGE_OPTION.PRIMARY,
  });
  const [deleteColorDialogOpen, setDeleteColorDialogOpen] =
    React.useState(false);
  const [colorToDelete, setColorToDelete] = React.useState<PaletteColor | null>(
    null
  );

  const sortedColors = React.useMemo(() => {
    return (colors || [])
      .filter(
        (c: PaletteColor) =>
          // these colors are a part of typography styles
          String(c.usage_option || "") !== COLOR_USAGE_OPTION.FOREGROUND &&
          String(c.usage_option || "") !== COLOR_USAGE_OPTION.BACKGROUND
      )
      .sort(
        (a: PaletteColor, b: PaletteColor) =>
          (a.sort_order as number) - (b.sort_order as number)
      );
  }, [colors]);

  const hasBackground = sortedColors.some(
    (c: PaletteColor) => String(c.usage_option || "") === COLOR_USAGE_OPTION.BACKGROUND
  );

  const handleAddColor = React.useCallback(async () => {
    if (!newColor.hex.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) {
      toast.error("Please enter a valid hex color");
      return;
    }

    try {
      const maxSortOrder =
        sortedColors.length > 0
          ? Math.max(
              ...sortedColors.map((c: PaletteColor) => c.sort_order as number)
            )
          : 0;

      await createColor.mutateAsync({
        hex: newColor.hex,
        name: newColor.name || null,
        usage_option: newColor.usage,
        sort_order: maxSortOrder + 1,
        contrast_ratio_against_background: null,
        style_guide_id: guideId,
      });

      setAddColorDialogOpen(false);
      setNewColor({ hex: "#000000", name: "", usage: COLOR_USAGE_OPTION.PRIMARY });
      toast.success("Color added successfully");
    } catch (error) {
      toast.error("Failed to add color");
    }
  }, [createColor, guideId, newColor, sortedColors]);

  const handleUpdateColor = React.useCallback(
    async (color: PaletteColor, field: string, value: unknown) => {
      try {
        const normalizedValue = field === "name" && value === "" ? null : value;

        await updateColor.mutateAsync({
          id: String(color.palette_color_id),
          input: { [field]: normalizedValue },
        });
      } catch (error) {
        toast.error("Failed to update color");
      }
    },
    [updateColor]
  );

  const handleDeleteColor = React.useCallback(async () => {
    if (!colorToDelete) return;

    try {
      await deleteColor.mutateAsync(String(colorToDelete.palette_color_id));
      setDeleteColorDialogOpen(false);
      setColorToDelete(null);
      toast.success("Color deleted successfully");
    } catch (error) {
      toast.error("Failed to delete color");
    }
  }, [colorToDelete, deleteColor]);

  const handleReorderColor = React.useCallback(
    async (color: PaletteColor, direction: "up" | "down") => {
      const sorted = [...sortedColors];
      const currentIndex = sorted.findIndex(
        (c: PaletteColor) =>
          String(c.palette_color_id) === String(color.palette_color_id)
      );

      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= sorted.length) return;

      const swapColor = sorted[newIndex];
      if (!swapColor) return;
      const currentOrder = color.sort_order as number;
      const swapOrder = swapColor.sort_order as number;

      try {
        await Promise.all([
          updateColor.mutateAsync({
            id: String(color.palette_color_id),
            input: { sort_order: swapOrder },
          }),
          updateColor.mutateAsync({
            id: String(swapColor.palette_color_id),
            input: { sort_order: currentOrder },
          }),
        ]);
      } catch (error) {
        toast.error("Failed to reorder colors");
      }
    },
    [sortedColors, updateColor]
  );

  return (
    <Box>
      <Typography level="title-sm" color="primary" sx={{ mb: 1.5 }}>
        Color Scheme
      </Typography>

      {/* {isEditable && !hasBackground && (
        <Alert color="warning" startDecorator={<WarningIcon />}>
          Add a background color to enable accessibility checks
        </Alert>
      )} */}
      {(() => {
        if (colorsLoading) return <CircularProgress />;

        if (!sortedColors?.length)
          return (
            <Typography
              level="body-sm"
              color="neutral"
              sx={{ textAlign: "center", py: 2 }}
            >
              No colors added yet.{" "}
              {isEditable
                ? 'Click "Add Color" to get started.'
                : "Colors will appear here."}
            </Typography>
          );

        // edit mode
        if (isEditable)
          return (
            <>
              <List sx={{ p: 0, gap: 2 }}>
                {sortedColors.map((color) => {
                  const colorLabel =
                    (color.name as string) ||
                    USAGE_OPTIONS.find(
                      (opt) => opt.value === color.usage_option
                    )?.label ||
                    "Color";

                  return (
                    <ColorEditItem
                      key={String(color.palette_color_id)}
                      color={color}
                      colorLabel={colorLabel}
                      onUpdateColor={handleUpdateColor}
                    />
                  );
                })}
              </List>
              <Button
                variant="plain"
                onClick={() => setAddColorDialogOpen(true)}
                startDecorator={<Plus />}
                sx={{ mt: 2.5 }}
              >
                Add Color
              </Button>
            </>
          );

        // Preview
        return (
          <Card variant="outlined" sx={{ p: 0 }}>
            <List>
              {sortedColors.map((color) => {
                const colorLabel =
                  (color.name as string) ||
                  USAGE_OPTIONS.find((opt) => opt.value === color.usage_option)
                    ?.label ||
                  "Color";

                return (
                  <ColorPreviewItem
                    key={String(color.palette_color_id)}
                    color={color}
                    colorLabel={colorLabel}
                  />
                );
              })}
            </List>
          </Card>
        );
      })()}

      <AddColorModal
        open={addColorDialogOpen}
        newColor={newColor}
        setNewColor={setNewColor}
        onClose={() => setAddColorDialogOpen(false)}
        onSubmit={handleAddColor}
      />

      <DeleteColorModal
        open={deleteColorDialogOpen}
        onClose={() => setDeleteColorDialogOpen(false)}
        onDelete={handleDeleteColor}
      />
    </Box>
  );
}
