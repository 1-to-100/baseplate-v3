"use client";

import {
  useVisualStyleGuide
} from "@/app/(scalekit)/style-guide/lib/hooks";
import { toast } from "@/components/core/toaster";
import { Grid, Sheet } from "@mui/joy";
import Alert from "@mui/joy/Alert";
import Box from "@mui/joy/Box";
import CircularProgress from "@mui/joy/CircularProgress";
import Stack from "@mui/joy/Stack";
import { useParams } from "next/navigation";
import * as React from "react";
import VisualStyleGuideActivityTracker from "./components/visual-style-guide-activity-tracker";
import VisualStyleGuideBreadcrumbs from "./components/visual-style-guide-breadcrumbs";
import VisualStyleGuideColors from "./components/visual-style-guide-colors";
import VisualStyleGuideHeader from "./components/visual-style-guide-header";
import VisualStyleGuideLogos from "./components/visual-style-guide-logos";
import VisualStyleGuideTypography from "./components/visual-style-guide-typography";

export default function VisualStyleGuideOverviewPage(): React.JSX.Element {
  const params = useParams();
  const guideId = params?.guideId as string;

  const [isEditableView, setIsEditableView] = React.useState<boolean>(false);

  const { data: guide, isLoading } = useVisualStyleGuide(guideId);

  // // Show all colors for the customer, not just for this guide
  // const sortedColors = React.useMemo(() => {
  //   return (colors || []).sort(
  //     (a: PaletteColor, b: PaletteColor) =>
  //       (a.sort_order as number) - (b.sort_order as number)
  //   );
  // }, [colors]);

  const handlePublish = React.useCallback(() => {
    toast.info("Publish functionality coming soon");
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!guide) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color="danger">Style guide not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: "var(--Content-padding)" }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <VisualStyleGuideHeader
            name={String(guide.name || "")}
            description={guide.description ? String(guide.description) : null}
            onPublish={handlePublish}
            isEditableView={isEditableView}
            handleVisualStyleGuideEdit={setIsEditableView}
          />
          <VisualStyleGuideBreadcrumbs guideName={String(guide.name || "")} />
        </Stack>
        <Sheet
          sx={{
            borderTop: "1px solid var(--joy-palette-divider)",
            p: 2,
          }}
        >
          <Grid container spacing={3}>
            <Grid
              xs={12}
              md={9}
              sx={{
                borderRight: { md: "1px solid var(--joy-palette-divider)" },
                pr: { md: 2.5 },
              }}
            >
              <Stack spacing={4.5}>
                <VisualStyleGuideColors
                  guideId={guideId}
                  isEditable={isEditableView}
                />
                <VisualStyleGuideTypography
                  guideId={guideId}
                  isEditableView={isEditableView}
                />
                <VisualStyleGuideLogos
                  guideId={guideId}
                  isEditableView={isEditableView}
                  defaultLogoAssetId={
                    guide.default_logo_asset_id as
                      | string
                      | number
                      | null
                      | undefined
                  }
                />
              </Stack>
            </Grid>

            <Grid xs={12} md={3}>
              <VisualStyleGuideActivityTracker />
            </Grid>
          </Grid>
        </Sheet>
      </Stack>
    </Box>
  );
}
