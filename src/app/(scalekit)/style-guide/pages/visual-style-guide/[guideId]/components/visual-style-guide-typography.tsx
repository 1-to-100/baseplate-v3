"use client";

import { toast } from "@/components/core/toaster";
import { Box, Card, Grid, Option, Select } from "@mui/joy";
import CircularProgress from "@mui/joy/CircularProgress";
import List from "@mui/joy/List";
import ListItem from "@mui/joy/ListItem";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import * as React from "react";

import {
  useFontOptions,
  useTypographyStyleOptions,
  useTypographyStyles,
  useUpdateTypographyStyle,
} from "@/app/(scalekit)/style-guide/lib/hooks";

type VisualStyleGuideTypographyProps = {
  guideId: string;
  isEditableView: boolean;
};

export default function VisualStyleGuideTypography({
  guideId,
  isEditableView,
}: VisualStyleGuideTypographyProps): React.JSX.Element {
  const { data: typographyStyles, isLoading: typographyLoading } =
    useTypographyStyles(guideId);
  const { data: typographyOptions } = useTypographyStyleOptions();

  const { data: fontOptions } = useFontOptions();

  const updateTypography = useUpdateTypographyStyle();
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
        if (typographyLoading) return <CircularProgress />;

        if (!typographyStyles?.length)
          return (
            <Typography level="body-sm" color="neutral">
              No typography styles configured yet.
            </Typography>
          );

        // // edit mode
        if (isEditableView)
          return (
            <List sx={{ p: 0, gap: 2 }}>
              {typographyStyles.map((style) => {
                const option = typographyOptions?.find(
                  (opt) =>
                    String(opt.typography_style_option_id) ===
                    String(style.typography_style_option_id)
                );
                return (
                  <ListItem
                    key={String(style.typography_style_id)}
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
                              handleUpdateTypography(
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
                    </Stack>
                  </ListItem>
                );
              })}
            </List>
          );

        // Preview
        return (
          <Card variant="outlined" sx={{ p: 0 }}>
            <List>
              {typographyStyles.map((style) => {
                const option = typographyOptions?.find(
                  (opt) =>
                    String(opt.typography_style_option_id) ===
                    String(style.typography_style_option_id)
                );
                return (
                  <ListItem
                    key={String(style.typography_style_id)}
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
                        </Typography>
                      </Grid>
                      <Grid xs={12} sm={4}>
                        <Typography
                          level="body-sm"
                          sx={(theme) => ({
                            fontFamily: style.font_family
                              ? `${style.font_family}, ${theme.fontFamily.body}`
                              : theme.fontFamily.body,
                          })}
                        >
                          Here how your font looks
                        </Typography>
                      </Grid>
                    </Grid>
                  </ListItem>
                );
              })}
            </List>
          </Card>
        );
      })()}
    </Box>
  );
}
