"use client";

import * as React from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  LinearProgress,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import { useRouter } from "next/navigation";
import { ArrowsCounterClockwise as ArrowsCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import {
  useCompanyStrategyQuery,
  useStrategyChangeTypesQuery,
  useUpdateCompanyStrategyMutation,
  useCreateStrategyChangeLogMutation,
} from "../../../strategy-forge/lib/api";
import type { UpdateCompanyStrategyInput } from "../../../strategy-forge/lib/schemas/strategy-foundation";

const VISION_MAX = 800;
const SUMMARY_MAX = 120;

type EditorStatus = "idle" | "saving" | "success" | "error";

function useVisionState() {
  const { data: strategy } = useCompanyStrategyQuery();

  const [vision, setVision] = React.useState("");
  const [visionDescription, setVisionDescription] = React.useState("");

  React.useEffect(() => {
    if (!strategy) return;
    setVision(strategy.vision ?? "");
    setVisionDescription(strategy.vision_description ?? "");
  }, [strategy?.strategy_id]);

  return {
    strategy,
    vision,
    setVision,
    visionDescription,
    setVisionDescription,
  };
}

export default function VisionEditorPage(): React.ReactElement {
  const router = useRouter();
  const { strategy, vision, setVision, visionDescription, setVisionDescription } = useVisionState();

  const { data: changeTypes } = useStrategyChangeTypesQuery();

  const updateStrategy = useUpdateCompanyStrategyMutation();
  const createChangeLog = useCreateStrategyChangeLogMutation();

  const [changeSummary, setChangeSummary] = React.useState("");
  const [status, setStatus] = React.useState<EditorStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const hasVisionChanges = vision !== (strategy?.vision ?? "");
  const hasVisionDescriptionChanges = visionDescription !== (strategy?.vision_description ?? "");

  const hasChanges = hasVisionChanges || hasVisionDescriptionChanges;

  const summaryError = !changeSummary.trim()
    ? "Change summary is required when saving."
    : changeSummary.length > SUMMARY_MAX
    ? `Summary must be ${SUMMARY_MAX} characters or less.`
    : null;

  const visionRemaining = VISION_MAX - vision.length;

  const handleSave = async () => {
    if (!strategy) return;
    setErrorMessage(null);

    if (!hasChanges) {
      setErrorMessage("No changes detected to save.");
      return;
    }

    if (summaryError) {
      setErrorMessage(summaryError);
      return;
    }

    try {
      setStatus("saving");
      const payload: UpdateCompanyStrategyInput = {
        vision,
        vision_description: visionDescription || null,
        effective_at: null, // All changes are published immediately
      };

      await updateStrategy.mutateAsync({
        strategyId: strategy.strategy_id,
        input: payload,
      });

      const changeTypePreference =
        changeTypes?.find((type) => type.programmatic_name === "edit_vision") ?? changeTypes?.[0] ?? null;

      if (changeTypePreference) {
        await createChangeLog.mutateAsync({
          strategy_id: strategy.strategy_id,
          change_type_id: changeTypePreference.option_id,
          summary: changeSummary.trim(),
          justification: null,
          meta: { affected_sections: ["vision"] },
        });
      }

      setStatus("success");
      router.push("/strategy-forge/overview");
    } catch (error) {
      console.error("Failed to save vision", error);
      setStatus("error");
      setErrorMessage("Unable to save changes. Please try again.");
    }
  };

  const handleCancel = () => {
    if (hasChanges && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    router.push("/strategy-forge/overview");
  };

  const isSaving = status === "saving" || updateStrategy.isPending;

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography level="h1" sx={{ fontSize: "1.5rem" }}>
              Edit Vision
            </Typography>
            <Typography level="body-sm" color="neutral">
              Guided editor with prompts, examples, and governance controls. Provide a short summary outlining the changes before saving.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {status === "error" && errorMessage ? (
        <Alert color="danger" variant="soft">
          {errorMessage}
        </Alert>
      ) : null}

      {status === "success" ? (
        <Alert color="success" variant="soft">
          Vision saved successfully.
        </Alert>
      ) : null}

      {!strategy ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2} alignItems="flex-start">
              <Typography level="body-sm" color="neutral">
                Preparing editor…
              </Typography>
              <LinearProgress variant="soft" />
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              <Stack spacing={2} id="strategy-vision-editor">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography level="title-lg">Vision</Typography>
                  <Chip size="sm" variant="soft" color="neutral">
                    {vision.length}/{VISION_MAX}
                  </Chip>
                </Stack>
                <FormControl required>
                  <FormLabel>Vision statement</FormLabel>
                  <Input
                    value={vision}
                    onChange={(event) => setVision(event.target.value.slice(0, VISION_MAX))}
                    aria-label="Vision statement"
                    placeholder="Describe the future state you are building"
                  />
                  <FormHelperText>{visionRemaining} characters remaining</FormHelperText>
                </FormControl>
                <FormControl>
                  <FormLabel>Vision description</FormLabel>
                  <Textarea
                    value={visionDescription}
                    onChange={(event) => setVisionDescription(event.target.value)}
                    minRows={4}
                    placeholder="Explain implications, measurable outcomes, and strategic bets"
                    aria-label="Vision description"
                  />
                  <FormHelperText>
                    Link the vision to tangible metrics or strategic bets so teams can align execution.
                  </FormHelperText>
                </FormControl>
              </Stack>

              <Stack spacing={0.5}>
                <Typography level="title-sm">Change summary</Typography>
                <Typography level="body-xs" color="neutral">
                  Summaries appear in the change log for audit and communication purposes.
                </Typography>
                <Input
                  value={changeSummary}
                  onChange={(event) => setChangeSummary(event.target.value.slice(0, SUMMARY_MAX))}
                  placeholder="Summarize the edits made"
                  aria-label="Change summary"
                  required
                />
                <FormHelperText>{SUMMARY_MAX - changeSummary.length} characters remaining</FormHelperText>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Divider />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
        <Button
          variant="outlined"
          color="neutral"
          onClick={handleCancel}
          startDecorator={<ArrowsCounterClockwiseIcon size={16} weight="bold" />}
          disabled={isSaving}
          aria-haspopup={hasChanges ? "dialog" : undefined}
        >
          Cancel
        </Button>
        <Button
          variant="solid"
          color="primary"
          onClick={handleSave}
          disabled={isSaving || !hasChanges || Boolean(summaryError)}
          loading={isSaving}
        >
          Save Draft
        </Button>
      </Stack>
    </Stack>
  );
}

