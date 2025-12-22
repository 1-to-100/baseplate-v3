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
  IconButton,
  Input,
  LinearProgress,
  Modal,
  ModalDialog,
  Select,
  Stack,
  Table,
  Typography,
} from "@mui/joy";
import Option from "@mui/joy/Option";
import Textarea from "@mui/joy/Textarea";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowCounterClockwise as ArrowCounterClockwiseIcon,
  ArrowSquareOut as ArrowSquareOutIcon,
  FloppyDisk as FloppyDiskIcon,
  Sparkle as SparkleIcon,
  Trash as TrashIcon,
  Plus as PlusIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  useCompetitorByIdQuery,
  useCompetitorStatusesQuery,
  useDataSourcesQuery,
  useUpdateCompetitorMutation,
  useCompetitorSignalsQuery,
  useCompetitorSignalTypesQuery,
  useCreateCompetitorSignalMutation,
  useUpdateCompetitorSignalMutation,
  useDeleteCompetitorSignalMutation,
} from "../../../strategy-forge/lib/api";
import type { CompetitorSignal } from "../../../strategy-forge/lib/types";

interface SignalDialogState {
  open: boolean;
  signalId: string | null;
  competitorId: string;
  signal?: CompetitorSignal;
}

function SignalDialog({
  state,
  onClose,
}: {
  state: SignalDialogState | null;
  onClose: () => void;
}): React.ReactElement | null {
  const { data: signalTypes } = useCompetitorSignalTypesQuery();
  const createSignal = useCreateCompetitorSignalMutation();
  const updateSignal = useUpdateCompetitorSignalMutation();

  const [signalTypeId, setSignalTypeId] = React.useState<string | null>(null);
  const [observedAt, setObservedAt] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!state?.open) return;
    if (state.signal) {
      setSignalTypeId(state.signal.signal_type_id);
      setObservedAt(new Date(state.signal.observed_at).toISOString().slice(0, 16));
      setSourceUrl(state.signal.source_url ?? "");
      setNote(state.signal.note ?? "");
    } else {
      setSignalTypeId(signalTypes?.[0]?.option_id ?? null);
      setObservedAt(new Date().toISOString().slice(0, 16));
      setSourceUrl("");
      setNote("");
    }
    setError(null);
  }, [state?.open, state?.signalId, state?.signal, signalTypes]);

  if (!state) return null;

  const handleSubmit = async () => {
    if (!state.competitorId) return;
    if (!signalTypeId) {
      setError("Select a signal type.");
      return;
    }
    if (!observedAt) {
      setError("Observed at is required.");
      return;
    }

    try {
      if (state.signalId && state.signal) {
        await updateSignal.mutateAsync({
          competitorId: state.competitorId,
          signalId: state.signalId,
          input: {
            signal_type_id: signalTypeId,
            observed_at: new Date(observedAt).toISOString(),
            source_url: sourceUrl.trim() || null,
            note: note.trim() || null,
          },
        });
      } else {
        await createSignal.mutateAsync({
          competitorId: state.competitorId,
          input: {
            competitor_id: state.competitorId,
            signal_type_id: signalTypeId,
            observed_at: new Date(observedAt).toISOString(),
            source_url: sourceUrl.trim() || null,
            note: note.trim() || null,
          },
        });
      }
      onClose();
    } catch (submitError) {
      console.error(submitError);
      setError("Unable to save signal.");
    }
  };

  return (
    <Modal open={state.open} onClose={onClose} aria-labelledby="signal-dialog-title">
      <ModalDialog sx={{ maxWidth: 520 }}>
        <Typography id="signal-dialog-title" level="title-lg">
          {state.signalId ? "Edit Signal" : "Add Signal"}
        </Typography>
        <Stack spacing={1.5} mt={1.5}>
          <FormControl required>
            <FormLabel>Signal type</FormLabel>
            <Select
              value={signalTypeId}
              onChange={(_, value) => setSignalTypeId(value)}
              placeholder="Select type"
            >
              {signalTypes?.map((type) => (
                <Option key={type.option_id} value={type.option_id}>
                  {type.display_name}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl required>
            <FormLabel>Observed at</FormLabel>
            <Input
              type="datetime-local"
              value={observedAt}
              onChange={(event) => setObservedAt(event.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Source URL</FormLabel>
            <Input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" />
          </FormControl>
          <FormControl>
            <FormLabel>Note</FormLabel>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              minRows={3}
            />
            <FormHelperText>
              Explain why this signal matters and any recommended responses.
            </FormHelperText>
          </FormControl>
          {error ? (
            <Alert color="danger" variant="soft">
              {error}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" color="neutral" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={handleSubmit}
              loading={createSignal.isPending || updateSignal.isPending}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}

export default function CompetitorDetailPage(): React.ReactElement {
  const params = useParams<{ competitorId: string }>();
  const router = useRouter();
  const competitorId = React.useMemo(() => params?.competitorId ?? "", [params?.competitorId]);

  const { data: competitor, isLoading } = useCompetitorByIdQuery(competitorId);
  const { data: statuses } = useCompetitorStatusesQuery();
  const { data: dataSources } = useDataSourcesQuery();
  const { data: signalTypes } = useCompetitorSignalTypesQuery();
  const {
    data: signals,
    isLoading: signalsLoading,
  } = useCompetitorSignalsQuery(competitorId);

  const updateCompetitor = useUpdateCompetitorMutation();
  const deleteSignal = useDeleteCompetitorSignalMutation();

  const [name, setName] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [statusId, setStatusId] = React.useState<string | null>(null);
  const [sourceId, setSourceId] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState("");
  const [filterType, setFilterType] = React.useState<string | null>(null);
  const [signalDialog, setSignalDialog] = React.useState<SignalDialogState | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!competitor) return;
    setName(competitor.name);
    setWebsite(competitor.website_url ?? "");
    setCategory(competitor.category ?? "");
    setStatusId(competitor.status_id ?? null);
    setSourceId(competitor.source_id ?? null);
    setSummary(competitor.summary ?? "");
  }, [competitor?.competitor_id]);

  if (!competitorId) {
    return (
      <Alert color="danger" variant="soft">
        Missing competitor reference.
      </Alert>
    );
  }

  const filteredSignals = (signals ?? []).filter((signal) =>
    filterType ? signal.signal_type_id === filterType : true
  );

  const handleSave = async () => {
    if (!competitor) return;
    try {
      await updateCompetitor.mutateAsync({
        competitorId,
        input: {
          name: name.trim(),
          website_url: website.trim() || null,
          category: category.trim() || null,
          status_id: statusId ?? undefined,
          source_id: sourceId ?? undefined,
          summary: summary.trim() || null,
        },
      });
      setStatusMessage("Competitor updated.");
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to save competitor.");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleDeleteSignal = async (signalId: string) => {
    if (!window.confirm("Delete this signal?")) {
      return;
    }
    try {
      await deleteSignal.mutateAsync({ competitorId, signalId });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Stack spacing={3}>
      <Button variant="plain" startDecorator={<ArrowCounterClockwiseIcon size={16} weight="bold" />} onClick={() => router.push("/strategy-forge/competitors")}>Back to register</Button>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography level="h1" sx={{ fontSize: "1.5rem" }}>
              {competitor?.name ?? "Competitor"}
            </Typography>
            {statusMessage ? (
              <Alert color="success" variant="soft">
                {statusMessage}
              </Alert>
            ) : null}
            {errorMessage ? (
              <Alert color="danger" variant="soft">
                {errorMessage}
              </Alert>
            ) : null}
            {isLoading ? (
              <Stack spacing={1}>
                <Typography level="body-sm" color="neutral">
                  Loading competitor…
                </Typography>
                <LinearProgress variant="soft" />
              </Stack>
            ) : competitor ? (
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel>Name</FormLabel>
                    <Input value={name} onChange={(event) => setName(event.target.value)} required />
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel>Website URL</FormLabel>
                    <Input
                      placeholder="https://"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </FormControl>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel>Category</FormLabel>
                    <Input value={category} onChange={(event) => setCategory(event.target.value)} />
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel>Status</FormLabel>
                    <Select value={statusId} onChange={(_, value) => setStatusId(value)}>
                      {statuses?.map((status) => (
                        <Option key={status.option_id} value={status.option_id}>
                          {status.display_name}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel>Source</FormLabel>
                    <Select value={sourceId} onChange={(_, value) => setSourceId(value)}>
                      <Option value={null}>Manual</Option>
                      {dataSources?.map((source) => (
                        <Option key={source.option_id} value={source.option_id}>
                          {source.display_name}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <FormControl>
                  <FormLabel>Summary</FormLabel>
                  <Textarea
                    minRows={4}
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="Short description of the competitor's position"
                  />
                </FormControl>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="solid"
                    startDecorator={<FloppyDiskIcon size={16} weight="bold" />}
                    onClick={handleSave}
                    loading={updateCompetitor.isPending}
                  >
                    Save changes
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Alert color="warning" variant="soft">
                Competitor not found.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
              <Typography level="title-lg">Signals</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ ml: { md: "auto" } }}>
                <Select
                  value={filterType}
                  onChange={(_, value) => setFilterType(value)}
                  placeholder="All types"
                  sx={{ minWidth: { xs: "100%", md: 180 } }}
                >
                  <Option value={null}>All types</Option>
                  {signalTypes?.map((type) => (
                    <Option key={type.option_id} value={type.option_id}>
                      {type.display_name}
                    </Option>
                  ))}
                </Select>
                <Button
                  variant="outlined"
                  startDecorator={<SparkleIcon size={16} weight="bold" />}
                  onClick={() => setSignalDialog({ open: true, signalId: null, competitorId })}
                >
                  Add signal
                </Button>
              </Stack>
            </Stack>

            <Divider />

            {signalsLoading ? (
              <Stack spacing={1}>
                <Typography level="body-sm" color="neutral">
                  Loading signals…
                </Typography>
                <LinearProgress variant="soft" />
              </Stack>
            ) : filteredSignals.length === 0 ? (
              <Typography level="body-sm" color="neutral">
                No signals recorded yet for this competitor.
              </Typography>
            ) : (
              <Table size="sm" aria-label="Competitor signals" hoverRow>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Observed at</th>
                    <th>Note</th>
                    <th>Source</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSignals.map((signal) => (
                    <tr key={signal.signal_id}>
                      <td>
                        <Chip variant="soft" size="sm">
                          {signalTypes?.find((type) => type.option_id === signal.signal_type_id)?.display_name ??
                            "Unknown"}
                        </Chip>
                      </td>
                      <td>{new Date(signal.observed_at).toLocaleString()}</td>
                      <td>{signal.note ?? "—"}</td>
                      <td>
                        {signal.source_url ? (
                          <Button
                            size="sm"
                            variant="plain"
                            color="primary"
                            component="a"
                            href={signal.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            startDecorator={<ArrowSquareOutIcon size={14} />}
                          >
                            Source
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="sm"
                            variant="outlined"
                            onClick={() =>
                              setSignalDialog({
                                open: true,
                                signalId: signal.signal_id,
                                competitorId,
                                signal,
                              })
                            }
                          >
                            Edit
                          </Button>
                          <IconButton
                            size="sm"
                            variant="outlined"
                            color="danger"
                            onClick={() => handleDeleteSignal(signal.signal_id)}
                          >
                            <TrashIcon size={16} weight="bold" />
                          </IconButton>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Stack>
        </CardContent>
      </Card>

      {signalDialog ? <SignalDialog state={signalDialog} onClose={() => setSignalDialog(null)} /> : null}
    </Stack>
  );
}
