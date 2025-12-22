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
  Select,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import Option from "@mui/joy/Option";
import { useRouter } from "next/navigation";
import {
  Sparkle as SparkleIcon,
  ShieldCheck as ShieldCheckIcon,
  ClockCountdown as ClockCountdownIcon,
} from "@phosphor-icons/react/dist/ssr";
import dayjs from "dayjs";
import {
  useCompanyStrategyQuery,
  useStrategyChangeLogsQuery,
  usePublicationStatusesQuery,
  useStrategyChangeTypesQuery,
  useUpdateCompanyStrategyMutation,
  useCreateStrategyChangeLogMutation,
} from "../../strategy-forge/lib/api";

const SUMMARY_MAX = 120;
const JUSTIFICATION_MIN = 20;

type PublishMode = "immediate" | "scheduled";

export default function PublishStrategyPage(): React.ReactElement {
  const router = useRouter();
  const { data: strategy, isLoading } = useCompanyStrategyQuery();
  const strategyId = strategy?.strategy_id ?? null;
  const { data: changeLogs } = useStrategyChangeLogsQuery(strategyId, { limit: 5 });
  const { data: publicationStatuses } = usePublicationStatusesQuery();
  const { data: changeTypes } = useStrategyChangeTypesQuery();

  const updateStrategy = useUpdateCompanyStrategyMutation();
  const createChangeLog = useCreateStrategyChangeLogMutation();

  const [summary, setSummary] = React.useState("");
  const [justification, setJustification] = React.useState("");
  const [publishMode, setPublishMode] = React.useState<PublishMode>("immediate");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"idle" | "publishing">("idle");

  const publishStatus = publicationStatuses?.find((status) => status.programmatic_name === "published");
  const draftedStatus = publicationStatuses?.find((status) => status.programmatic_name === "draft");

  const summaryError = React.useMemo(() => {
    if (!summary.trim()) {
      return "Summary is required.";
    }
    if (summary.length > SUMMARY_MAX) {
      return `Summary must be ${SUMMARY_MAX} characters or less.`;
    }
    return null;
  }, [summary]);

  const justificationError = React.useMemo(() => {
    if (justification.trim().length < JUSTIFICATION_MIN) {
      return `Justification must be at least ${JUSTIFICATION_MIN} characters.`;
    }
    return null;
  }, [justification]);

  const scheduleError = React.useMemo(() => {
    if (publishMode === "scheduled") {
      if (!scheduledAt) {
        return "Select a go-live date.";
      }
      if (dayjs(scheduledAt).isBefore(dayjs())) {
        return "Schedule must be in the future.";
      }
    }
    return null;
  }, [publishMode, scheduledAt]);

  const affectedSections = changeLogs?.map((log) => log.meta?.affected_sections ?? []).flat() ?? [];
  const uniqueSections = Array.from(new Set(affectedSections))
    .filter(Boolean)
    .map((s) => (typeof s === 'string' ? s : String(s)))
    .filter((s) => s.length > 0);

  const handlePublish = async () => {
    if (!strategy || !strategyId) {
      setError("Strategy not found.");
      return;
    }
    if (!publishStatus) {
      setError("Published status unavailable. Contact an administrator.");
      return;
    }
    if (summaryError || justificationError || scheduleError) {
      setError(summaryError ?? justificationError ?? scheduleError);
      return;
    }

    try {
      setStatus("publishing");
      setError(null);

      await updateStrategy.mutateAsync({
        strategyId,
        input: {
          is_published: true,
          publication_status_id: publishStatus.option_id,
          effective_at:
            publishMode === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        },
      });

      const publishChangeType =
        changeTypes?.find((type) => type.programmatic_name === "publish") ?? changeTypes?.[0];

      if (publishChangeType) {
        await createChangeLog.mutateAsync({
          strategy_id: strategyId,
          change_type_id: publishChangeType.option_id,
          summary: summary.trim(),
          justification: justification.trim(),
          meta: {
            affected_sections: uniqueSections.length > 0 ? uniqueSections : ["mission", "vision", "principles", "values", "competitors"],
            publication_mode: publishMode,
          },
        });
      }

      router.push("/strategy-forge/overview");
    } catch (publishError) {
      console.error(publishError);
      setError("Failed to publish strategy. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography level="h1" sx={{ fontSize: "1.5rem" }}>
              Publish Strategy
            </Typography>
            <Typography level="body-sm" color="neutral">
              Confirm and justify the publication. Once published, downstream modules will read this version and change log entries will be created.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert color="danger" variant="soft">
          {error}
        </Alert>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography level="title-lg">Changed sections</Typography>
            <Divider />
            {isLoading ? (
              <Stack spacing={1}>
                <Typography level="body-sm" color="neutral">
                  Gathering change summary…
                </Typography>
                <LinearProgress variant="soft" />
              </Stack>
            ) : uniqueSections.length === 0 ? (
              <Typography level="body-sm" color="neutral">
                Recent changes were not tagged with specific sections. Review the latest change log entries before publishing.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {uniqueSections.map((section, index) => (
                  <Stack key={typeof section === 'string' ? section : `section-${index}`} direction="row" spacing={1} alignItems="center">
                    <Chip variant="soft" color="primary" size="sm">
                      {section}
                    </Chip>
                    <Typography level="body-sm" color="neutral">
                      Updated in recent drafts
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}

            <Typography level="title-sm">Recent activity</Typography>
            <Stack spacing={1}>
              {(changeLogs ?? []).map((log) => (
                <Stack key={log.change_log_id} spacing={0.25}>
                  <Typography level="body-sm" fontWeight="lg">
                    {log.summary}
                  </Typography>
                  <Typography level="body-xs" color="neutral">
                    {new Date(log.changed_at).toLocaleString()} · {log.changed_by_user_id ?? "Unknown"}
                  </Typography>
                  {log.justification ? (
                    <Typography level="body-xs" color="neutral" sx={{ opacity: 0.7 }}>
                      {log.justification}
                    </Typography>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography level="title-lg">Publication details</Typography>
            <Divider />

            <FormControl required>
              <FormLabel>Summary</FormLabel>
              <Input
                value={summary}
                onChange={(event) => setSummary(event.target.value.slice(0, SUMMARY_MAX))}
                placeholder="Short summary for board and audit log"
              />
              <FormHelperText>{SUMMARY_MAX - summary.length} characters remaining</FormHelperText>
            </FormControl>

            <FormControl required>
              <FormLabel>Justification</FormLabel>
              <Textarea
                minRows={4}
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                placeholder="Explain why this version should be published and how it will be used."
              />
              <FormHelperText>Minimum {JUSTIFICATION_MIN} characters.</FormHelperText>
            </FormControl>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Mode</FormLabel>
                <Select value={publishMode} onChange={(_, value) => setPublishMode((value as PublishMode) ?? "immediate")}>
                  <Option value="immediate">Publish immediately</Option>
                  <Option value="scheduled">Schedule publication</Option>
                </Select>
              </FormControl>
              {publishMode === "scheduled" ? (
                <FormControl sx={{ flex: 1 }} required>
                  <FormLabel>Go-live</FormLabel>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                  {scheduleError ? (
                    <FormHelperText color="danger">{scheduleError}</FormHelperText>
                  ) : (
                    <FormHelperText>Strategy remains in draft until this time.</FormHelperText>
                  )}
                </FormControl>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
        <Button
          variant="outlined"
          color="neutral"
          onClick={() => router.push("/strategy-forge/overview")}
          startDecorator={<ClockCountdownIcon size={16} weight="bold" />}
          disabled={status === "publishing"}
        >
          Cancel
        </Button>
        <Button
          variant="solid"
          color="primary"
          onClick={handlePublish}
          disabled={status === "publishing" || Boolean(summaryError) || Boolean(justificationError) || Boolean(scheduleError)}
          loading={status === "publishing"}
          startDecorator={<ShieldCheckIcon size={16} weight="bold" />}
        >
          Confirm publish
        </Button>
      </Stack>
    </Stack>
  );
}
