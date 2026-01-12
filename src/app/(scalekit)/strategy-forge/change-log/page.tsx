'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  LinearProgress,
  Stack,
  Table,
  Typography,
} from '@mui/joy';
import {
  ClockCounterClockwise as ClockCounterClockwiseIcon,
  ArrowClockwise as ArrowClockwiseIcon,
  UploadSimple as UploadSimpleIcon,
} from '@phosphor-icons/react/dist/ssr';
import {
  useCompanyStrategyQuery,
  useStrategyChangeLogsQuery,
  useStrategyChangeTypesQuery,
} from '../../strategy-forge/lib/api';

interface FiltersState {
  changeTypeIds: string[];
  startDate: string;
  endDate: string;
  search: string;
}

function filterChangeLogs(
  logs: ReturnType<typeof useStrategyChangeLogsQuery>['data'],
  filters: FiltersState
) {
  if (!logs) return [];
  return logs.filter((log) => {
    const changedAt = new Date(log.changed_at);
    if (filters.changeTypeIds.length > 0 && !filters.changeTypeIds.includes(log.change_type_id)) {
      return false;
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      if (changedAt < start) return false;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      if (changedAt > end) return false;
    }
    if (filters.search) {
      const text = `${log.summary} ${log.justification ?? ''}`.toLowerCase();
      if (!text.includes(filters.search.toLowerCase())) {
        return false;
      }
    }
    return true;
  });
}

export default function StrategyChangeLogPage(): React.ReactElement {
  const { data: strategy } = useCompanyStrategyQuery();
  const strategyId = strategy?.strategy_id ?? null;
  const { data: changeLogs, isLoading } = useStrategyChangeLogsQuery(strategyId, { limit: 200 });
  const { data: changeTypes } = useStrategyChangeTypesQuery();

  const [filters, setFilters] = React.useState<FiltersState>({
    changeTypeIds: [],
    startDate: '',
    endDate: '',
    search: '',
  });
  const [error, setError] = React.useState<string | null>(null);

  const filteredLogs = React.useMemo(
    () => filterChangeLogs(changeLogs, filters),
    [changeLogs, filters]
  );

  const toggleChangeType = (value: string) => {
    setFilters((prev) => {
      const next = new Set(prev.changeTypeIds);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...prev, changeTypeIds: Array.from(next) };
    });
  };

  const resetFilters = () => {
    setFilters({ changeTypeIds: [], startDate: '', endDate: '', search: '' });
    setError(null);
  };

  const handleExport = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      setError('No change log entries to export.');
      return;
    }
    const header = ['Date', 'Type', 'Summary', 'Justification', 'Changed By'];
    const rows = filteredLogs.map((log) => {
      const type =
        changeTypes?.find((option) => option.option_id === log.change_type_id)?.display_name ??
        log.change_type_id;
      return [
        new Date(log.changed_at).toISOString(),
        type,
        log.summary.replaceAll(',', ' '),
        (log.justification ?? '').replaceAll(',', ' '),
        log.changed_by_user_id ?? 'Unknown',
      ];
    });
    const csv = [header.join(',')].concat(rows.map((row) => row.join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'strategy-change-log.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRevert = (changeLogId: string) => {
    void changeLogId;
    alert(
      'Revert workflow is not yet implemented. Capture this change log ID for manual assistance.'
    );
  };

  return (
    <Stack spacing={3}>
      <Card variant='outlined'>
        <CardContent>
          <Stack spacing={1}>
            <Typography level='h1' sx={{ fontSize: '1.5rem' }}>
              Strategy Change Log
            </Typography>
            <Typography level='body-sm' color='neutral'>
              Audit trail of drafts, edits, and publications. Use filters to isolate the entries you
              need.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert color='danger' variant='soft'>
          {error}
        </Alert>
      ) : null}

      <Card variant='outlined'>
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Search</FormLabel>
                <Input
                  placeholder='Search summaries or justifications'
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, search: event.target.value }))
                  }
                />
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Start date</FormLabel>
                <Input
                  type='date'
                  value={filters.startDate}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </FormControl>
              <FormControl sx={{ flex: 1 }}>
                <FormLabel>End date</FormLabel>
                <Input
                  type='date'
                  value={filters.endDate}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </FormControl>
              <Box sx={{ flexShrink: 0 }}>
                <Button
                  variant='outlined'
                  startDecorator={<ArrowClockwiseIcon size={16} weight='bold' />}
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </Box>
            </Stack>

            <Divider />

            <FormControl>
              <FormLabel>Change types</FormLabel>
              <Stack direction='row' spacing={1} flexWrap='wrap'>
                {changeTypes?.map((type) => {
                  const selected = filters.changeTypeIds.includes(type.option_id);
                  return (
                    <ChipToggle
                      key={type.option_id}
                      label={type.display_name}
                      selected={selected}
                      onClick={() => toggleChangeType(type.option_id)}
                    />
                  );
                })}
              </Stack>
              <FormHelperText>Select multiple change types to narrow the feed.</FormHelperText>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent='flex-end'>
        <Button
          variant='outlined'
          startDecorator={<UploadSimpleIcon size={16} weight='bold' />}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </Stack>

      <Card variant='outlined'>
        <CardContent>
          {isLoading ? (
            <Stack spacing={1}>
              <Typography level='body-sm' color='neutral'>
                Loading change log entries…
              </Typography>
              <LinearProgress variant='soft' />
            </Stack>
          ) : filteredLogs.length === 0 ? (
            <Typography level='body-sm' color='neutral'>
              No change log entries match the current filters.
            </Typography>
          ) : (
            <Table size='sm' hoverRow aria-label='Strategy change log'>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Summary</th>
                  <th>Justification</th>
                  <th>Changed by</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const type = changeTypes?.find(
                    (option) => option.option_id === log.change_type_id
                  );
                  return (
                    <tr key={log.change_log_id}>
                      <td>{new Date(log.changed_at).toLocaleString()}</td>
                      <td>{type?.display_name ?? log.change_type_id}</td>
                      <td>{log.summary}</td>
                      <td>{log.justification ?? '—'}</td>
                      <td>{log.changed_by_user_id ?? 'Unknown'}</td>
                      <td>
                        <Button
                          size='sm'
                          variant='outlined'
                          startDecorator={<ClockCounterClockwiseIcon size={16} weight='bold' />}
                          onClick={() => handleRevert(log.change_log_id)}
                        >
                          Revert
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

function ChipToggle({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size='sm'
      variant={selected ? 'solid' : 'outlined'}
      color={selected ? 'primary' : 'neutral'}
      onClick={onClick}
      sx={{ textTransform: 'none' }}
    >
      {label}
    </Button>
  );
}
