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
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import {
  ArrowCircleUp as ArrowCircleUpIcon,
  ArrowCircleDown as ArrowCircleDownIcon,
  ArrowCounterClockwise as ArrowCounterClockwiseIcon,
  Plus as PlusIcon,
  Trash as TrashIcon,
  Sparkle as SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import {
  useCompanyStrategyQuery,
  useStrategyPrinciplesQuery,
  useCreateStrategyPrincipleMutation,
  useUpdateStrategyPrincipleMutation,
  useDeleteStrategyPrincipleMutation,
  useStrategyChangeTypesQuery,
  useCreateStrategyChangeLogMutation,
} from "../../../strategy-forge/lib/api";

interface PrincipleDraft {
  id: string;
  principle_id: string | null;
  name: string;
  description: string;
  order_index: number;
  is_active: boolean;
  status: "existing" | "new" | "deleted";
  dirty: boolean;
}

const SUMMARY_MAX = 120;

function toDrafts(principles: ReturnType<typeof useStrategyPrinciplesQuery>["data"]): PrincipleDraft[] {
  if (!principles) return [];
  return principles
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((principle, index) => ({
      id: principle.principle_id,
      principle_id: principle.principle_id,
      name: principle.name,
      description: principle.description ?? "",
      order_index: index,
      is_active: principle.is_active,
      status: "existing",
      dirty: false,
    }));
}

function reindex(drafts: PrincipleDraft[]): PrincipleDraft[] {
  let position = 0;
  return drafts.map((draft) => {
    if (draft.status === "deleted") {
      return draft;
    }
    const updated: PrincipleDraft = { ...draft };
    if (updated.order_index !== position) {
      updated.order_index = position;
      updated.dirty = true;
    }
    position += 1;
    return updated;
  });
}

export default function PrinciplesEditorPage(): React.ReactElement {
  const router = useRouter();
  const { data: strategy } = useCompanyStrategyQuery();
  const strategyId = strategy?.strategy_id ?? null;
  const {
    data: principles,
    isLoading,
  } = useStrategyPrinciplesQuery(strategyId);

  const [drafts, setDrafts] = React.useState<PrincipleDraft[]>([]);
  const [changeSummary, setChangeSummary] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"idle" | "saving" | "success" | "error">("idle");

  const createPrinciple = useCreateStrategyPrincipleMutation();
  const updatePrinciple = useUpdateStrategyPrincipleMutation();
  const deletePrinciple = useDeleteStrategyPrincipleMutation();
  const { data: changeTypes } = useStrategyChangeTypesQuery();
  const createChangeLog = useCreateStrategyChangeLogMutation();

  React.useEffect(() => {
    setDrafts(toDrafts(principles));
  }, [principles?.length]);

  const visibleDrafts = drafts.filter((draft) => draft.status !== "deleted");

  const handleAdd = () => {
    setDrafts((prev) => [
      {
        id: `temp-${Date.now()}`,
        principle_id: null,
        name: "",
        description: "",
        order_index: 0,
        is_active: true,
        status: "new",
        dirty: true,
      },
      ...reindex(prev),
    ]);
  };

  const handleMove = (id: string, direction: -1 | 1) => {
    setDrafts((prev) => {
      const list = prev.slice();
      const visible = list.filter((draft) => draft.status !== "deleted");
      const currentIndex = visible.findIndex((draft) => draft.id === id);
      if (currentIndex === -1) return prev;
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= visible.length) return prev;
      const currentDraft = visible[currentIndex];
      const targetDraft = visible[targetIndex];
      if (!currentDraft || !targetDraft) return prev;
      const currentPos = list.findIndex((draft) => draft.id === currentDraft.id);
      const targetPos = list.findIndex((draft) => draft.id === targetDraft.id);
      const swapped = list.slice();
      const currentItem = swapped[currentPos];
      const targetItem = swapped[targetPos];
      if (!currentItem || !targetItem) return prev;
      [swapped[currentPos], swapped[targetPos]] = [
        { ...targetItem, dirty: true },
        { ...currentItem, dirty: true },
      ];
      return reindex(swapped);
    });
  };

  const markDirty = (id: string, updates: Partial<PrincipleDraft>) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              ...updates,
              dirty: true,
            }
          : draft
      )
    );
  };

  const handleDelete = (id: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              status: draft.status === "new" ? "deleted" : "deleted",
              dirty: true,
            }
          : draft
      )
    );
  };

  const handleUndoDelete = (id: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.id === id
          ? {
              ...draft,
              status: draft.principle_id ? "existing" : "new",
              dirty: true,
            }
          : draft
      )
    );
  };

  const summaryError = !changeSummary.trim()
    ? "Change summary is required before saving."
    : changeSummary.length > SUMMARY_MAX
    ? `Summary must be ${SUMMARY_MAX} characters or less.`
    : null;

  const hasChanges = drafts.some((draft) => draft.dirty || draft.status === "deleted");

  const handleSave = async () => {
    if (!strategy || !strategyId) return;
    if (!hasChanges) {
      setErrorMessage("No changes detected.");
      return;
    }
    if (summaryError) {
      setErrorMessage(summaryError);
      return;
    }

    setErrorMessage(null);
    setStatus("saving");

    try {
      const normalized = reindex(drafts);
      setDrafts(normalized);

      const toCreate = normalized.filter((draft) => draft.status === "new");
      const toUpdate = normalized.filter(
        (draft) => draft.status === "existing" && draft.dirty
      );
      const toDelete = normalized.filter((draft) => draft.status === "deleted" && draft.principle_id);

      for (const draft of toCreate) {
        await createPrinciple.mutateAsync({
          strategy_id: strategyId,
          name: draft.name,
          description: draft.description || null,
          order_index: draft.order_index,
          is_active: draft.is_active,
        });
      }

      for (const draft of toUpdate) {
        if (!draft.principle_id) continue;
        await updatePrinciple.mutateAsync({
          principleId: draft.principle_id,
          strategyId: strategyId!,
          input: {
            name: draft.name,
            description: draft.description || null,
            order_index: draft.order_index,
            is_active: draft.is_active,
          },
        });
      }

      for (const draft of toDelete) {
        if (!draft.principle_id) continue;
        await deletePrinciple.mutateAsync({ principleId: draft.principle_id, strategyId });
      }

      const changeType =
        changeTypes?.find((type) => type.programmatic_name === "reorder_principles") ??
        changeTypes?.find((type) => type.programmatic_name === "edit_principle") ??
        changeTypes?.[0] ??
        null;

      if (changeType) {
        await createChangeLog.mutateAsync({
          strategy_id: strategyId,
          change_type_id: changeType.option_id,
          summary: changeSummary.trim(),
          justification: null,
          meta: {
            affected_sections: ["principles"],
            change_count: {
              created: toCreate.length,
              updated: toUpdate.length,
              deleted: toDelete.length,
            },
          },
        });
      }

      setStatus("success");
      router.push("/strategy-forge/overview");
    } catch (error) {
      console.error("Failed to save principles", error);
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

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography level="h1" sx={{ fontSize: "1.5rem" }}>
              Edit Principles
            </Typography>
            <Typography level="body-sm" color="neutral">
              Create, reorder, and manage principles that guide tradeoffs across the company.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3}>
            {status === "error" && errorMessage ? (
              <Alert color="danger" variant="soft">
                {errorMessage}
              </Alert>
            ) : null}

            {status === "success" ? (
              <Alert color="success" variant="soft">
                Principles saved successfully.
              </Alert>
            ) : null}

            {isLoading && drafts.length === 0 ? (
              <Stack spacing={2} alignItems="flex-start">
                <Typography level="body-sm" color="neutral">
                  Loading principles…
                </Typography>
                <LinearProgress variant="soft" />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Button
                  size="sm"
                  variant="solid"
                  startDecorator={<PlusIcon size={16} weight="bold" />}
                  onClick={handleAdd}
                  sx={{
                    backgroundColor: "#292594",
                    "&:hover": {
                      backgroundColor: "#221f7b",
                    },
                  }}
                >
                  Add Principle
                </Button>

                {drafts.length === 0 ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography level="body-sm" color="neutral">
                          No principles yet. Add your first principle to capture the key tradeoffs that guide your team.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ) : (
                  <Stack spacing={1.5}>
                    {drafts.map((draft) => (
                      <Card
                        key={draft.id}
                        variant={draft.status === "deleted" ? "outlined" : "soft"}
                        color={draft.status === "deleted" ? "neutral" : "primary"}
                        sx={{ opacity: draft.status === "deleted" ? 0.6 : 1 }}
                      >
                        <CardContent>
                          <Stack spacing={1.5}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              alignItems={{ xs: "flex-start", sm: "center" }}
                              justifyContent="space-between"
                            >
                              <Stack spacing={0.5} flex={1} sx={{ width: "100%" }}>
                                <FormLabel>Principle title</FormLabel>
                                <Input
                                  value={draft.name}
                                  onChange={(event) =>
                                    markDirty(draft.id, { name: event.target.value.slice(0, 120) })
                                  }
                                  placeholder="Short, action-oriented principle"
                                  aria-label="Principle title"
                                  disabled={draft.status === "deleted"}
                                />
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton
                                  size="sm"
                                  variant="outlined"
                                  onClick={() => handleMove(draft.id, -1)}
                                  disabled={draft.status === "deleted" || visibleDrafts[0]?.id === draft.id}
                                  aria-label="Move principle up"
                                >
                                  <ArrowCircleUpIcon size={18} weight="bold" />
                                </IconButton>
                                <IconButton
                                  size="sm"
                                  variant="outlined"
                                  onClick={() => handleMove(draft.id, 1)}
                                  disabled={
                                    draft.status === "deleted" ||
                                    visibleDrafts[visibleDrafts.length - 1]?.id === draft.id
                                  }
                                  aria-label="Move principle down"
                                >
                                  <ArrowCircleDownIcon size={18} weight="bold" />
                                </IconButton>
                                <IconButton
                                  size="sm"
                                  variant="outlined"
                                  color="danger"
                                  onClick={() =>
                                    draft.status === "deleted"
                                      ? handleUndoDelete(draft.id)
                                      : handleDelete(draft.id)
                                  }
                                  aria-label={draft.status === "deleted" ? "Undo removal" : "Remove principle"}
                                >
                                  {draft.status === "deleted" ? (
                                    <ArrowCounterClockwiseIcon size={18} weight="bold" />
                                  ) : (
                                    <TrashIcon size={18} weight="bold" />
                                  )}
                                </IconButton>
                              </Stack>
                            </Stack>

                            <FormControl>
                              <FormLabel>Principle description</FormLabel>
                              <Textarea
                                value={draft.description}
                                onChange={(event) => markDirty(draft.id, { description: event.target.value })}
                                minRows={3}
                                placeholder="Describe how this principle informs decisions."
                                aria-label="Principle description"
                                disabled={draft.status === "deleted"}
                              />
                              <FormHelperText>
                                Use concrete language and examples to explain the tradeoff this principle guides.
                              </FormHelperText>
                            </FormControl>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}

            <Stack spacing={1}>
              <FormLabel>Change summary</FormLabel>
              <Input
                value={changeSummary}
                onChange={(event) => setChangeSummary(event.target.value.slice(0, SUMMARY_MAX))}
                placeholder="Summarize the updates to principles"
                aria-label="Change summary"
                required
              />
              <FormHelperText>{SUMMARY_MAX - changeSummary.length} characters remaining</FormHelperText>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
        <Button
          variant="outlined"
          color="neutral"
          onClick={handleCancel}
          startDecorator={<ArrowCounterClockwiseIcon size={16} weight="bold" />}
          aria-haspopup={hasChanges ? "dialog" : undefined}
          disabled={status === "saving"}
        >
          Cancel
        </Button>
        <Button
          variant="solid"
          color="primary"
          onClick={handleSave}
          disabled={status === "saving" || !hasChanges || Boolean(summaryError)}
          loading={status === "saving"}
          startDecorator={<SparkleIcon size={16} weight="bold" />}
        >
          Save Draft
        </Button>
      </Stack>
    </Stack>
  );
}
