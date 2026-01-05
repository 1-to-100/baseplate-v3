"use client";

import { toast } from "@/components/core/toaster";
import { Box, Card, Grid, Option, Select } from "@mui/joy";
import CircularProgress from "@mui/joy/CircularProgress";
import Input from "@mui/joy/Input";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import * as React from "react";

import {
  useFontOptions,
  usePaletteColors,
  useTypographyStyleOptions,
  useTypographyStyles,
  useUpdatePaletteColor,
  useUpdateTypographyStyle,
} from "@/app/(scalekit)/style-guide/lib/hooks";
import {
  COLOR_USAGE_OPTION,
  USAGE_OPTIONS,
} from "@/app/(scalekit)/style-guide/lib/constants/palette-colors";
import { FONT_SIZE_OPTIONS } from "@/app/(scalekit)/style-guide/lib/constants/typography";
import type {
  FontOption,
  PaletteColor,
  TypographyStyle,
  TypographyStyleOption,
} from "@/app/(scalekit)/style-guide/lib/types";
import {
  ColorEditItem,
  ColorPreviewItem,
} from "./visual-style-guide-colors";

type VisualStyleGuideTypographyProps = {
  guideId: string;
  isEditableView: boolean;
};

type TypographyEditItemProps = {
  style: TypographyStyle;
  option: TypographyStyleOption | undefined;
  fontOptions: FontOption[] | undefined;
  onUpdateTypography: (styleId: string, field: string, value: unknown) => Promise<void>;
};

function TypographyEditItem({
  style,
  option,
  fontOptions,
  onUpdateTypography,
}: TypographyEditItemProps): React.JSX.Element {
  return (
    <ListItem
      sx={{
        flexDirection: { xs: "column", sm: "row" },
        p: 0,
      }}
    >
      <Stack gap={1} sx={{ width: "100%" }}>
        <Typography level="body-sm">
          {String(
            option?.display_name ||
              option?.programmatic_name ||
              "Unknown"
          )}
        </Typography>
        <Select
          value={String(style.font_family || "")}
          onChange={(_, newValue) => {
            if (newValue) {
              const selectedFont = fontOptions?.find(
                (f) =>
                  String(f.programmatic_name || "") ===
                  String(newValue)
              );
              if (selectedFont) {
                onUpdateTypography(
                  String(style.typography_style_id),
                  "font_family",
                  String(selectedFont.programmatic_name || "")
                );
              }
            }
          }}
          size="sm"
          aria-label={`Select font for ${String(
            option?.display_name || "Unknown"
          )}`}
        >
          {fontOptions?.map((font) => (
            <Option
              key={String(font.font_option_id)}
              value={String(font.programmatic_name || "")}
              sx={(theme) => ({
                fontFamily: font.programmatic_name
                  ? `${font.programmatic_name}, ${theme.fontFamily.body}`
                  : theme.fontFamily.body,
              })}
            >
              {String(font.display_name || "")}
            </Option>
          ))}
        </Select>
        <Select
          value={String(style.font_size_px || 16)}
          onChange={(_, newValue) => {
            if (newValue) {
              const fontSize = parseInt(String(newValue), 10);
              if (!isNaN(fontSize) && fontSize > 0) {
                onUpdateTypography(
                  String(style.typography_style_id),
                  "font_size_px",
                  fontSize
                );
              }
            }
          }}
          size="sm"
          aria-label={`Select font size for ${String(
            option?.display_name || "Unknown"
          )}`}
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <Option key={size} value={String(size)}>
              {String(size)}px
            </Option>
          ))}
        </Select>
      </Stack>
    </ListItem>
  );
}

type TypographyPreviewItemProps = {
  style: TypographyStyle;
  option: TypographyStyleOption | undefined;
};

function TypographyPreviewItem({
  style,
  option,
}: TypographyPreviewItemProps): React.JSX.Element {
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
          <Typography level="body-sm">
            {String(
              option?.display_name ||
                option?.programmatic_name ||
                "Unknown"
            )}
          </Typography>
        </Grid>
        <Grid xs={12} sm={4}>
          <Typography level="body-sm">
            {String(style.font_family || "")}
            {style.font_family  && style.font_size_px ? `, ${String(style.font_size_px)}px` : ""}
          </Typography>
        </Grid>
        <Grid xs={12} sm={4}>
          <Typography
            level="body-sm"
            sx={(theme) => ({
              fontFamily: style.font_family
                ? `${style.font_family}, ${theme.fontFamily.body}`
                : theme.fontFamily.body,
              fontSize: style.font_size_px ? `${String(style.font_size_px)}px` : undefined,
            })}
          >
            Here how your font looks
          </Typography>
        </Grid>
      </Grid>
    </ListItem>
  );
}

export default function VisualStyleGuideTypography({
  guideId,
  isEditableView,
}: VisualStyleGuideTypographyProps): React.JSX.Element {
  const { data: typographyStyles, isLoading: typographyLoading } =
    useTypographyStyles(guideId);
  const { data: typographyOptions } = useTypographyStyleOptions();

  const { data: fontOptions } = useFontOptions();
  const { data: colors, isLoading: colorsLoading } = usePaletteColors();

  const foregroundAndBackgroundColors = React.useMemo(() => {
    return (colors || [])
      .filter(
        (c: PaletteColor) =>
          String(c.usage_option || "") === COLOR_USAGE_OPTION.FOREGROUND ||
          String(c.usage_option || "") === COLOR_USAGE_OPTION.BACKGROUND
      )
      .sort(
        (a: PaletteColor, b: PaletteColor) =>
          (a.sort_order as number) - (b.sort_order as number)
      );
  }, [colors]);

  // Merged list of colors and typography styles
  const mergedItems = React.useMemo(() => {
    const colorItems = foregroundAndBackgroundColors.map((color) => ({
      type: "color" as const,
      data: color,
    }));
    const typographyItems = (typographyStyles || [])
      .map((style) => ({
        type: "typography" as const,
        data: style,
        sortOrder: typographyOptions?.find(
          (opt) =>
            String(opt.typography_style_option_id) ===
            String(style.typography_style_option_id)
        )?.sort_order ?? Infinity,
      }))
      .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
      .map(({ sortOrder, ...item }) => item);
    return [...colorItems, ...typographyItems];
  }, [foregroundAndBackgroundColors, typographyStyles, typographyOptions]);

  const updateTypography = useUpdateTypographyStyle();
  const updateColor = useUpdatePaletteColor();
  const [cssSnippet, setCssSnippet] = React.useState("");
  const [showCss, setShowCss] = React.useState(false);

  const handleUpdateTypography = React.useCallback(
    async (styleId: string, field: string, value: unknown) => {
      try {
        await updateTypography.mutateAsync({
          id: styleId,
          input: { [field]: value },
        });
      } catch (error) {
        toast.error("Failed to update typography style");
      }
    },
    [updateTypography]
  );

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

  const handleGenerateCss = React.useCallback(() => {
    const generated =
      typographyStyles
        ?.map((style) => {
          const option = typographyOptions?.find(
            (opt) =>
              String(opt.typography_style_option_id) ===
              String(style.typography_style_option_id)
          );
          return `.${String(option?.programmatic_name || "style")} {
  font-family: ${String(style.font_family || "")}${
            style.font_fallbacks ? `, ${String(style.font_fallbacks)}` : ""
          };
  font-size: ${String(style.font_size_px || 0)}px;
  ${style.line_height ? `line-height: ${String(style.line_height)};` : ""}
  ${style.font_weight ? `font-weight: ${String(style.font_weight)};` : ""}
  ${style.color ? `color: ${String(style.color)};` : ""}
}`;
        })
        .join("\n\n") || "";

    setCssSnippet(generated);
    setShowCss(true);
    toast.success("CSS snippet generated");
  }, [typographyStyles, typographyOptions]);

  const handleCopyCss = React.useCallback(() => {
    navigator.clipboard.writeText(cssSnippet);
    toast.success("CSS copied to clipboard");
  }, [cssSnippet]);

  return (
    <Box>
      <Typography level="title-sm" color="primary" sx={{ mb: 1.5 }}>
        Typography
      </Typography>

      {(() => {
        if (typographyLoading || colorsLoading) return <CircularProgress />;

        if (!mergedItems.length)
          return (
            <Typography level="body-sm" color="neutral">
              No typography styles configured yet.
            </Typography>
          );

        // Edit mode
        if (isEditableView)
          return (
            <List sx={{ p: 0, gap: 2 }}>
              {mergedItems.map((item) => {
                if (item.type === "color") {
                  const color = item.data as PaletteColor;
                  const colorLabel =
                    (color.name as string) ||
                    USAGE_OPTIONS.find((opt) => opt.value === color.usage_option)
                      ?.label ||
                    "Color";

                  return (
                    <ColorEditItem
                      key={String(color.palette_color_id)}
                      color={color}
                      colorLabel={colorLabel}
                      onUpdateColor={handleUpdateColor}
                    />
                  );
                } else {
                  const style = item.data as TypographyStyle;
                  const option = typographyOptions?.find(
                    (opt) =>
                      String(opt.typography_style_option_id) ===
                      String(style.typography_style_option_id)
                  );
                  return (
                    <TypographyEditItem
                      key={String(style.typography_style_id)}
                      style={style}
                      option={option}
                      fontOptions={fontOptions}
                      onUpdateTypography={handleUpdateTypography}
                    />
                  );
                }
              })}
            </List>
          );

        // Preview
        return (
          <Card variant="outlined" sx={{ p: 0 }}>
            <List>
              {mergedItems.map((item) => {
                if (item.type === "color") {
                  const color = item.data as PaletteColor;
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
                } else {
                  const style = item.data as TypographyStyle;
                  const option = typographyOptions?.find(
                    (opt) =>
                      String(opt.typography_style_option_id) ===
                      String(style.typography_style_option_id)
                  );
                  return (
                    <TypographyPreviewItem
                      key={String(style.typography_style_id)}
                      style={style}
                      option={option}
                    />
                  );
                }
              })}
            </List>
          </Card>
        );
      })()}
    </Box>
  );
}
