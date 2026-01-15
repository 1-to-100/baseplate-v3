'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
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
} from '@mui/joy';
import Option from '@mui/joy/Option';
import Textarea from '@mui/joy/Textarea';
import {
  Plus as PlusIcon,
  Trash as TrashIcon,
  ArrowClockwise as ArrowClockwiseIcon,
  Sparkle as SparkleIcon,
  ArrowSquareOut as ArrowSquareOutIcon,
} from '@phosphor-icons/react/dist/ssr';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  useCompetitorsQuery,
  useCompetitorStatusesQuery,
  useDataSourcesQuery,
  useCreateCompetitorMutation,
  useDeleteCompetitorMutation,
  useUpdateCompetitorMutation,
  useCreateCompetitorSignalMutation,
  useCompetitorSignalTypesQuery,
} from '../../strategy-forge/lib/api';
import { toast } from '@/components/core/toaster';
import { config } from '@/config';

const PAGE_LIMIT = 50;

interface CreateCompetitorDialogProps {
  open: boolean;
  onClose: () => void;
}

interface CompetitorSignalDialogProps {
  open: boolean;
  competitorId: string | null;
  competitorName: string | null;
  onClose: () => void;
}

interface GeneratedCompetitorDraft {
  id: string;
  name: string;
  websiteUrl: string;
  description: string;
}

function CreateCompetitorDialog({
  open,
  onClose,
}: CreateCompetitorDialogProps): React.ReactElement {
  const createCompetitor = useCreateCompetitorMutation();
  const { data: statuses } = useCompetitorStatusesQuery();
  const { data: dataSources } = useDataSourcesQuery();

  const [name, setName] = React.useState('');
  const [websiteUrl, setWebsiteUrl] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [summary, setSummary] = React.useState('');
  const [statusId, setStatusId] = React.useState<string | null>(null);
  const [sourceId, setSourceId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setWebsiteUrl('');
    setCategory('');
    setSummary('');
    setStatusId(statuses?.[0]?.option_id ?? null);
    setSourceId(dataSources?.[0]?.option_id ?? null);
    setError(null);
  };

  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!statusId) {
      setError('Select a status.');
      return;
    }

    try {
      setError(null);
      await createCompetitor.mutateAsync({
        name: name.trim(),
        website_url: websiteUrl.trim() || null,
        category: category.trim() || null,
        summary: summary.trim() || null,
        status_id: statusId,
        source_id: sourceId,
      });
      onClose();
    } catch (createError) {
      console.error(createError);
      setError('Failed to create competitor.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby='create-competitor-title'>
      <ModalDialog sx={{ maxWidth: 520 }}>
        <Typography id='create-competitor-title' level='title-lg'>
          Add Competitor
        </Typography>
        <Stack spacing={1.5} mt={1.5}>
          <FormControl required>
            <FormLabel>Name</FormLabel>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel>Website URL</FormLabel>
            <Input
              placeholder='https://'
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Category</FormLabel>
            <Input
              placeholder='e.g. Product analytics'
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Summary</FormLabel>
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              minRows={3}
            />
          </FormControl>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <FormControl required sx={{ flex: 1 }}>
              <FormLabel>Status</FormLabel>
              <Select
                value={statusId}
                onChange={(_, value) => setStatusId(value)}
                placeholder='Select status'
              >
                {statuses?.map((status) => (
                  <Option key={status.option_id} value={status.option_id}>
                    {status.display_name}
                  </Option>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1 }}>
              <FormLabel>Source</FormLabel>
              <Select
                value={sourceId}
                onChange={(_, value) => setSourceId(value)}
                placeholder='Manual'
              >
                {dataSources?.map((source) => (
                  <Option key={source.option_id} value={source.option_id}>
                    {source.display_name}
                  </Option>
                ))}
              </Select>
            </FormControl>
          </Stack>
          {error ? (
            <Alert color='danger' variant='soft'>
              {error}
            </Alert>
          ) : null}
          <Stack direction='row' spacing={1} justifyContent='flex-end'>
            <Button variant='outlined' color='neutral' onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant='solid'
              color='primary'
              onClick={handleSubmit}
              loading={createCompetitor.isPending}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}

function AddCompetitorSignalDialog({
  open,
  competitorId,
  competitorName,
  onClose,
}: CompetitorSignalDialogProps): React.ReactElement {
  const { data: signalTypes } = useCompetitorSignalTypesQuery();
  const createSignal = useCreateCompetitorSignalMutation();
  const [signalTypeId, setSignalTypeId] = React.useState<string | null>(null);
  const [observedAt, setObservedAt] = React.useState('');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSignalTypeId(signalTypes?.[0]?.option_id ?? null);
      setObservedAt(new Date().toISOString().slice(0, 16));
      setSourceUrl('');
      setNote('');
      setError(null);
    }
  }, [open, signalTypes]);

  const handleCreateSignal = async () => {
    if (!competitorId) return;
    if (!signalTypeId) {
      setError('Select a signal type.');
      return;
    }
    if (!observedAt) {
      setError('Specify when the signal was observed.');
      return;
    }

    try {
      await createSignal.mutateAsync({
        competitorId: competitorId,
        input: {
          competitor_id: competitorId,
          signal_type_id: signalTypeId,
          observed_at: new Date(observedAt).toISOString(),
          source_url: sourceUrl.trim() || null,
          note: note.trim() || null,
        },
      });
      onClose();
    } catch (createError) {
      console.error(createError);
      setError('Failed to add signal.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby='add-competitor-signal-title'>
      <ModalDialog sx={{ maxWidth: 520 }}>
        <Typography id='add-competitor-signal-title' level='title-lg'>
          Add Signal {competitorName ? `for ${competitorName}` : ''}
        </Typography>
        <Stack spacing={1.5} mt={1.5}>
          <FormControl required>
            <FormLabel>Signal type</FormLabel>
            <Select
              value={signalTypeId}
              onChange={(_, value) => setSignalTypeId(value)}
              placeholder='Select type'
            >
              {signalTypes?.map((option) => (
                <Option key={option.option_id} value={option.option_id}>
                  {option.display_name}
                </Option>
              ))}
            </Select>
          </FormControl>
          <FormControl required>
            <FormLabel>Observed at</FormLabel>
            <Input
              type='datetime-local'
              value={observedAt}
              onChange={(event) => setObservedAt(event.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Source URL</FormLabel>
            <Input
              placeholder='https://'
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Note</FormLabel>
            <Textarea minRows={3} value={note} onChange={(event) => setNote(event.target.value)} />
            <FormHelperText>
              Explain why this matters, the impact, or any recommended actions.
            </FormHelperText>
          </FormControl>
          {error ? (
            <Alert color='danger' variant='soft'>
              {error}
            </Alert>
          ) : null}
          <Stack direction='row' spacing={1} justifyContent='flex-end'>
            <Button variant='outlined' color='neutral' onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant='solid'
              color='primary'
              onClick={handleCreateSignal}
              loading={createSignal.isPending}
            >
              Save signal
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}

export default function CompetitorsPage(): React.ReactElement {
  const router = useRouter();
  const [statusId, setStatusId] = React.useState<string | null>(null);
  const [sourceId, setSourceId] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [signalDialog, setSignalDialog] = React.useState<{
    open: boolean;
    id: string | null;
    name: string | null;
  }>({ open: false, id: null, name: null });
  const [generatedCompetitors, setGeneratedCompetitors] = React.useState<
    GeneratedCompetitorDraft[]
  >([]);
  const [isGeneratingCompetitors, setIsGeneratingCompetitors] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);
  const [isSavingGeneratedCompetitors, setIsSavingGeneratedCompetitors] = React.useState(false);

  const {
    data: competitors,
    isLoading,
    refetch,
  } = useCompetitorsQuery({
    statusId: statusId || undefined,
    sourceId: sourceId || undefined,
    limit: PAGE_LIMIT,
  });
  const { data: statuses } = useCompetitorStatusesQuery();
  const { data: dataSources } = useDataSourcesQuery();

  const deleteCompetitor = useDeleteCompetitorMutation();
  const updateCompetitor = useUpdateCompetitorMutation();
  const createCompetitor = useCreateCompetitorMutation();

  const defaultStatusId = React.useMemo(() => statuses?.[0]?.option_id ?? null, [statuses]);
  const defaultSourceId = React.useMemo(() => dataSources?.[0]?.option_id ?? null, [dataSources]);

  const upsertGeneratedCompetitor = (
    id: string,
    changes: Partial<Omit<GeneratedCompetitorDraft, 'id'>>
  ) => {
    setGeneratedCompetitors((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry))
    );
  };

  const handleGenerateCompetitors = React.useCallback(async () => {
    setIsGeneratingCompetitors(true);
    setGenerateError(null);
    try {
      const supabase = createClient();
      const { data: resolvedCustomerId, error: customerIdError } =
        await supabase.rpc('current_customer_id');

      if (customerIdError) {
        throw new Error(customerIdError.message);
      }

      if (!resolvedCustomerId || typeof resolvedCustomerId !== 'string') {
        throw new Error('Unable to resolve current customer id.');
      }

      // Verify session exists and refresh if needed
      let { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated. Please sign in and try again.');
      }

      // Refresh session if it's close to expiring (within 5 minutes)
      if (sessionData.session.expires_at) {
        const expiresIn = sessionData.session.expires_at * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          const { data: refreshedSession, error: refreshError } =
            await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession?.session) {
            sessionData = refreshedSession;
          }
        }
      }

      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated. Please sign in and try again.');
      }

      // Use direct fetch instead of supabase.functions.invoke() to have more control
      const supabaseUrl = config.supabase.url;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/get-competitor-list-for-customer-id`;
      const requestBody = {
        customer_id: resolvedCustomerId,
      };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error('Failed to parse function response:', parseError);
        throw new Error(`Function returned invalid JSON (status: ${response.status})`);
      }

      if (!response.ok) {
        const errorMessage =
          data?.error || data?.message || `Function returned status ${response.status}`;
        throw new Error(errorMessage);
      }

      const suggestions: GeneratedCompetitorDraft[] =
        data?.competitors?.map(
          (item: { name: string; website_url: string; description: string }, index: number) => ({
            id: crypto.randomUUID?.() ?? `generated-${Date.now()}-${index}`,
            name: item?.name ?? '',
            websiteUrl: item?.website_url ?? '',
            description: item?.description ?? '',
          })
        ) ?? [];

      if (!suggestions.length) {
        throw new Error('No competitor suggestions were returned.');
      }

      setGeneratedCompetitors(suggestions);
      toast.success(`Generated ${suggestions.length} competitor suggestions.`);
    } catch (error) {
      console.error('Failed to generate competitors:', error);
      const message =
        error instanceof Error ? error.message : 'Unexpected error generating competitors.';
      setGenerateError(message);
      toast.error(message);
    } finally {
      setIsGeneratingCompetitors(false);
    }
  }, [refetch]);

  const handleAddGeneratedCompetitor = () => {
    setGeneratedCompetitors((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? `generated-${Date.now()}-${prev.length}`,
        name: '',
        websiteUrl: '',
        description: '',
      },
    ]);
  };

  const handleRemoveGeneratedCompetitor = (id: string) => {
    setGeneratedCompetitors((prev) => prev.filter((entry) => entry.id !== id));
  };

  const handleSaveGeneratedCompetitors = async () => {
    if (!generatedCompetitors.length) return;
    if (!defaultStatusId) {
      toast.error('No competitor status options are available to assign.');
      return;
    }

    setIsSavingGeneratedCompetitors(true);
    try {
      for (const entry of generatedCompetitors) {
        const trimmedName = entry.name.trim();
        if (!trimmedName) {
          throw new Error('All generated competitors must have a name before saving.');
        }

        await createCompetitor.mutateAsync({
          name: trimmedName,
          website_url: entry.websiteUrl.trim() || null,
          summary: entry.description.trim() || null,
          category: null,
          status_id: defaultStatusId,
          source_id: defaultSourceId,
        });
      }

      setGeneratedCompetitors([]);
      await refetch();
      toast.success('Competitor suggestions saved successfully.');
    } catch (error) {
      console.error('Failed to save generated competitors:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to save generated competitors.';
      toast.error(message);
    } finally {
      setIsSavingGeneratedCompetitors(false);
    }
  };

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!competitors) return;
    if (checked) {
      setSelectedIds(new Set(competitors.map((competitor) => competitor.competitor_id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkAction = async (action: string | null) => {
    if (!action || selectedIds.size === 0) return;

    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedIds.size} competitor(s)?`)) {
        return;
      }
      for (const competitorId of selectedIds) {
        await deleteCompetitor.mutateAsync({ competitorId });
      }
      setSelectedIds(new Set());
    }

    if (action === 'mark_monitored') {
      const monitoredStatus = statuses?.find((status) => status.programmatic_name === 'monitored');
      if (!monitoredStatus) return;
      for (const competitorId of selectedIds) {
        await updateCompetitor.mutateAsync({
          competitorId,
          input: { status_id: monitoredStatus.option_id },
        });
      }
      setSelectedIds(new Set());
    }

    if (action === 'export') {
      const rows = competitors?.filter((competitor) => selectedIds.has(competitor.competitor_id));
      if (rows && rows.length > 0) {
        const csv = ['Name,Category,Status,Source'].concat(
          rows.map(
            (row) =>
              `${row.name},${row.category ?? ''},${row.status_id ?? ''},${row.source_id ?? ''}`
          )
        );
        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'competitors.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
      setSelectedIds(new Set());
    }
  };

  return (
    <Stack spacing={3}>
      <Card variant='outlined'>
        <CardContent>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography level='h1' sx={{ fontSize: '1.5rem' }}>
                Competitors
              </Typography>
              <Typography level='body-sm' color='neutral'>
                Maintain an up-to-date register of competitors, sources, and signals to anchor
                strategy reviews.
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Status</FormLabel>
                <Select
                  value={statusId}
                  onChange={(_, value) => setStatusId(value)}
                  startDecorator={<ArrowClockwiseIcon size={16} weight='bold' />}
                  placeholder='All statuses'
                >
                  <Option value={null}>All statuses</Option>
                  {statuses?.map((status) => (
                    <Option key={status.option_id} value={status.option_id}>
                      {status.display_name}
                    </Option>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Source</FormLabel>
                <Select
                  value={sourceId}
                  onChange={(_, value) => setSourceId(value)}
                  placeholder='All sources'
                >
                  <Option value={null}>All sources</Option>
                  {dataSources?.map((source) => (
                    <Option key={source.option_id} value={source.option_id}>
                      {source.display_name}
                    </Option>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flexShrink: 0 }}>
                <Button
                  variant='solid'
                  startDecorator={<PlusIcon size={16} weight='bold' />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Add Competitor
                </Button>
              </Box>
            </Stack>

            <Divider />

            <Stack spacing={2}>
              <Typography level='h2' fontSize='lg' fontWeight='lg'>
                Generate Competitors
              </Typography>
              <Typography level='body-sm' color='neutral'>
                Use AI to propose a list of competitors. Review, edit, then save them into your
                register.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant='solid'
                  color='primary'
                  startDecorator={<SparkleIcon size={16} />}
                  onClick={handleGenerateCompetitors}
                  loading={isGeneratingCompetitors}
                  disabled={isGeneratingCompetitors}
                >
                  {isGeneratingCompetitors ? 'Generating...' : 'Generate Competitors'}
                </Button>
                <Button variant='outlined' color='neutral' onClick={handleAddGeneratedCompetitor}>
                  Add Competitor
                </Button>
                {generatedCompetitors.length ? (
                  <Button
                    variant='solid'
                    color='danger'
                    onClick={() => setGeneratedCompetitors([])}
                    disabled={isSavingGeneratedCompetitors}
                  >
                    Clear
                  </Button>
                ) : null}
              </Stack>
              {generateError ? (
                <Alert color='danger' variant='soft'>
                  {generateError}
                </Alert>
              ) : null}
              {generatedCompetitors.length ? (
                <Stack spacing={2}>
                  {generatedCompetitors.map((entry) => (
                    <Card key={entry.id} variant='soft'>
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                            <FormControl required sx={{ flex: 1 }}>
                              <FormLabel>Name</FormLabel>
                              <Input
                                value={entry.name}
                                onChange={(event) =>
                                  upsertGeneratedCompetitor(entry.id, { name: event.target.value })
                                }
                                placeholder='Competitor name'
                              />
                            </FormControl>
                            <FormControl sx={{ flex: 1 }}>
                              <FormLabel>Website URL</FormLabel>
                              <Input
                                value={entry.websiteUrl}
                                onChange={(event) =>
                                  upsertGeneratedCompetitor(entry.id, {
                                    websiteUrl: event.target.value,
                                  })
                                }
                                placeholder='https://'
                              />
                            </FormControl>
                          </Stack>
                          <FormControl>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                              minRows={3}
                              value={entry.description}
                              onChange={(event) =>
                                upsertGeneratedCompetitor(entry.id, {
                                  description: event.target.value,
                                })
                              }
                              placeholder='Why this competitor matters...'
                            />
                          </FormControl>
                          <Stack direction='row' justifyContent='flex-end'>
                            <Button
                              variant='solid'
                              color='danger'
                              startDecorator={<TrashIcon size={16} />}
                              onClick={() => handleRemoveGeneratedCompetitor(entry.id)}
                            >
                              Remove
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    justifyContent='flex-end'
                  >
                    <Button
                      variant='solid'
                      color='primary'
                      onClick={handleSaveGeneratedCompetitors}
                      loading={isSavingGeneratedCompetitors}
                      disabled={isSavingGeneratedCompetitors}
                    >
                      {isSavingGeneratedCompetitors ? 'Saving...' : 'Save Competitors'}
                    </Button>
                  </Stack>
                </Stack>
              ) : null}
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <FormControl sx={{ width: { xs: '100%', md: 220 } }}>
                <FormLabel>Bulk actions</FormLabel>
                <Select
                  placeholder='Select action'
                  onChange={(_, value) =>
                    handleBulkAction(typeof value === 'string' ? value : null)
                  }
                  disabled={selectedIds.size === 0}
                >
                  <Option value={'mark_monitored'}>Mark monitored</Option>
                  <Option value={'export'}>Export CSV</Option>
                  <Option value={'delete'}>Delete</Option>
                </Select>
                <FormHelperText>{selectedIds.size} selected</FormHelperText>
              </FormControl>
            </Stack>

            <Divider />
            {isLoading ? (
              <Stack spacing={2} alignItems='flex-start'>
                <Typography level='body-sm' color='neutral'>
                  Loading competitors…
                </Typography>
                <LinearProgress variant='soft' />
              </Stack>
            ) : competitors && competitors.length > 0 ? (
              <Table hoverRow size='sm' aria-label='Competitor list'>
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>
                      <Checkbox
                        checked={competitors.every((competitor) =>
                          selectedIds.has(competitor.competitor_id)
                        )}
                        indeterminate={
                          selectedIds.size > 0 && selectedIds.size < (competitors?.length ?? 0)
                        }
                        onChange={(event) => toggleSelectAll(event.target.checked)}
                        aria-label='Select all competitors'
                      />
                    </th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Last updated</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((competitor) => (
                    <tr key={competitor.competitor_id}>
                      <td>
                        <Checkbox
                          checked={selectedIds.has(competitor.competitor_id)}
                          onChange={(event) =>
                            toggleSelection(competitor.competitor_id, event.target.checked)
                          }
                          aria-label={`Select ${competitor.name}`}
                        />
                      </td>
                      <td>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <Typography level='title-sm'>{competitor.name}</Typography>
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='primary'
                            onClick={() =>
                              router.push(`/strategy-forge/competitors/${competitor.competitor_id}`)
                            }
                            aria-label='View competitor'
                          >
                            <ArrowSquareOutIcon size={16} weight='bold' />
                          </IconButton>
                        </Stack>
                      </td>
                      <td>{competitor.category ?? '—'}</td>
                      <td>
                        {statuses?.find((status) => status.option_id === competitor.status_id)
                          ?.display_name ?? 'Unknown'}
                      </td>
                      <td>
                        {dataSources?.find((source) => source.option_id === competitor.source_id)
                          ?.display_name ?? '—'}
                      </td>
                      <td>{new Date(competitor.updated_at).toLocaleString()}</td>
                      <td>
                        <Stack direction='row' spacing={1} justifyContent='flex-end'>
                          <Button
                            size='sm'
                            variant='outlined'
                            onClick={() =>
                              setSignalDialog({
                                open: true,
                                id: competitor.competitor_id,
                                name: competitor.name,
                              })
                            }
                          >
                            Add signal
                          </Button>
                          <IconButton
                            size='sm'
                            variant='outlined'
                            color='danger'
                            onClick={() =>
                              deleteCompetitor.mutateAsync({
                                competitorId: competitor.competitor_id,
                              })
                            }
                            aria-label='Delete competitor'
                          >
                            <TrashIcon size={16} weight='bold' />
                          </IconButton>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Stack spacing={2} alignItems='flex-start'>
                <Typography level='body-sm' color='neutral'>
                  {isGeneratingCompetitors
                    ? 'Generating competitor suggestions...'
                    : 'No competitors yet. Generate a starter list to begin tracking rivals.'}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant='outlined'
                    startDecorator={<SparkleIcon size={16} />}
                    onClick={handleGenerateCompetitors}
                    loading={isGeneratingCompetitors}
                    disabled={isGeneratingCompetitors}
                  >
                    {isGeneratingCompetitors ? 'Generating...' : 'Generate Competitors'}
                  </Button>
                </Stack>
                {isGeneratingCompetitors ? (
                  <LinearProgress variant='soft' sx={{ width: 240 }} />
                ) : null}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <CreateCompetitorDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
      <AddCompetitorSignalDialog
        open={signalDialog.open}
        competitorId={signalDialog.id}
        competitorName={signalDialog.name}
        onClose={() => setSignalDialog({ open: false, id: null, name: null })}
      />
    </Stack>
  );
}
