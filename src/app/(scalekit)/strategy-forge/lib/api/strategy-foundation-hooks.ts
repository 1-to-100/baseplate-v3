import { useQuery, useMutation, useQueryClient, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import type {
  CompanyStrategy,
  StrategyPrinciple,
  StrategyValue,
  Competitor,
  CompetitorSignal,
  StrategyChangeLog,
  OptionPublicationStatus,
  OptionCompetitorStatus,
  OptionCompetitorSignalType,
  OptionDataSource,
  OptionStrategyChangeType,
  StrategyWorkspaceData,
} from "../types";
import {
  getCompanyStrategy,
  getCompanyStrategyById,
  createCompanyStrategy,
  updateCompanyStrategy,
  deleteCompanyStrategy,
  listStrategyPrinciples,
  createStrategyPrinciple,
  updateStrategyPrinciple,
  deleteStrategyPrinciple,
  listStrategyValues,
  createStrategyValue,
  updateStrategyValue,
  deleteStrategyValue,
  listCompetitors,
  getCompetitorById,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  listCompetitorSignals,
  createCompetitorSignal,
  updateCompetitorSignal,
  deleteCompetitorSignal,
  listStrategyChangeLogs,
  createStrategyChangeLog,
  deleteStrategyChangeLog,
  listPublicationStatuses,
  listCompetitorStatuses,
  listCompetitorSignalTypes,
  listDataSources,
  listStrategyChangeTypes,
  getStrategyWorkspaceData,
  createPublicationStatusOption,
  updatePublicationStatusOption,
  deletePublicationStatusOption,
  createCompetitorStatusOption,
  updateCompetitorStatusOption,
  deleteCompetitorStatusOption,
  createCompetitorSignalTypeOption,
  updateCompetitorSignalTypeOption,
  deleteCompetitorSignalTypeOption,
  createDataSourceOption,
  updateDataSourceOption,
  deleteDataSourceOption,
  createStrategyChangeTypeOption,
  updateStrategyChangeTypeOption,
  deleteStrategyChangeTypeOption,
} from "./strategy-foundation";
import type {
  CreateCompanyStrategyInput,
  UpdateCompanyStrategyInput,
  CreateStrategyPrincipleInput,
  UpdateStrategyPrincipleInput,
  CreateStrategyValueInput,
  UpdateStrategyValueInput,
  CreateCompetitorInput,
  UpdateCompetitorInput,
  CreateCompetitorSignalInput,
  UpdateCompetitorSignalInput,
  CreateStrategyChangeLogInput,
  CreateOptionInput,
  UpdateOptionInput,
} from "../schemas/strategy-foundation";
import type { CompetitorListParams, StrategyChangeLogListParams } from "./strategy-foundation";

export const strategyForgeKeys = {
  all: ["strategy-forge"] as const,
  company: ["strategy-forge", "company"] as const,
  companyById: (strategyId: string) => ["strategy-forge", "company", strategyId] as const,
  principles: (strategyId: string) => ["strategy-forge", "principles", strategyId] as const,
  values: (strategyId: string) => ["strategy-forge", "values", strategyId] as const,
  competitors: (params?: CompetitorListParams) =>
    ["strategy-forge", "competitors", params ?? {}] as const,
  competitorById: (competitorId: string) => ["strategy-forge", "competitors", competitorId] as const,
  competitorSignals: (competitorId: string) =>
    ["strategy-forge", "competitor-signals", competitorId] as const,
  changeLogs: (strategyId: string, params?: StrategyChangeLogListParams) =>
    ["strategy-forge", "change-logs", strategyId, params ?? {}] as const,
  publicationStatuses: ["strategy-forge", "options", "publication-statuses"] as const,
  competitorStatuses: ["strategy-forge", "options", "competitor-statuses"] as const,
  competitorSignalTypes: ["strategy-forge", "options", "competitor-signal-types"] as const,
  dataSources: ["strategy-forge", "options", "data-sources"] as const,
  changeTypes: ["strategy-forge", "options", "change-types"] as const,
  workspace: ["strategy-forge", "workspace"] as const,
} as const;

export function useCompanyStrategyQuery(options?: UseQueryOptions<CompanyStrategy | null>) {
  return useQuery({
    queryKey: strategyForgeKeys.company,
    queryFn: () => getCompanyStrategy(),
    ...options,
  });
}

export function useCompanyStrategyByIdQuery(
  strategyId: string,
  options?: UseQueryOptions<CompanyStrategy>
) {
  return useQuery({
    queryKey: strategyForgeKeys.companyById(strategyId),
    queryFn: () => getCompanyStrategyById(strategyId),
    enabled: Boolean(strategyId),
    ...options,
  });
}

export function useCreateCompanyStrategyMutation(
  options?: UseMutationOptions<CompanyStrategy, Error, CreateCompanyStrategyInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompanyStrategy,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.company }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdateCompanyStrategyMutation(
  options?: UseMutationOptions<CompanyStrategy, Error, { strategyId: string; input: UpdateCompanyStrategyInput }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ strategyId, input }) => updateCompanyStrategy(strategyId, input),
    onSuccess: async (_data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.company }),
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.companyById(variables.strategyId),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useDeleteCompanyStrategyMutation(
  options?: UseMutationOptions<void, Error, { strategyId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ strategyId }) => deleteCompanyStrategy(strategyId),
    onSuccess: async (_data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.company }),
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.companyById(variables.strategyId),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useStrategyPrinciplesQuery(
  strategyId: string | null,
  options?: UseQueryOptions<StrategyPrinciple[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.principles(strategyId ?? "none"),
    queryFn: () => {
      if (!strategyId) return Promise.resolve<StrategyPrinciple[]>([]);
      return listStrategyPrinciples(strategyId);
    },
    enabled: Boolean(strategyId),
    ...options,
  });
}

export function useCreateStrategyPrincipleMutation(
  options?: UseMutationOptions<StrategyPrinciple, Error, CreateStrategyPrincipleInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStrategyPrinciple,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.principles(variables.strategy_id) }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdateStrategyPrincipleMutation(
  options?: UseMutationOptions<StrategyPrinciple, Error, { principleId: string; input: UpdateStrategyPrincipleInput; strategyId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ principleId, input }) => updateStrategyPrinciple(principleId, input),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.principles(variables.strategyId) }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteStrategyPrincipleMutation(
  options?: UseMutationOptions<void, Error, { principleId: string; strategyId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ principleId }) => deleteStrategyPrinciple(principleId),
    onSuccess: async (_data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.principles(variables.strategyId) }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useStrategyValuesQuery(
  strategyId: string | null,
  options?: UseQueryOptions<StrategyValue[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.values(strategyId ?? "none"),
    queryFn: () => {
      if (!strategyId) return Promise.resolve<StrategyValue[]>([]);
      return listStrategyValues(strategyId);
    },
    enabled: Boolean(strategyId),
    ...options,
  });
}

export function useCreateStrategyValueMutation(
  options?: UseMutationOptions<StrategyValue, Error, CreateStrategyValueInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStrategyValue,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.values(variables.strategy_id) }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdateStrategyValueMutation(
  options?: UseMutationOptions<StrategyValue, Error, { valueId: string; input: UpdateStrategyValueInput; strategyId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ valueId, input }) => updateStrategyValue(valueId, input),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.values(variables.strategyId) }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteStrategyValueMutation(
  options?: UseMutationOptions<void, Error, { valueId: string; strategyId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ valueId }) => deleteStrategyValue(valueId),
    onSuccess: async (_data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.values(variables.strategyId) }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useCompetitorsQuery(
  params: CompetitorListParams = {},
  options?: UseQueryOptions<Competitor[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.competitors(params),
    queryFn: () => listCompetitors(params),
    ...options,
  });
}

export function useCompetitorByIdQuery(
  competitorId: string,
  options?: UseQueryOptions<Competitor>
) {
  return useQuery({
    queryKey: strategyForgeKeys.competitorById(competitorId),
    queryFn: () => getCompetitorById(competitorId),
    enabled: Boolean(competitorId),
    ...options,
  });
}

export function useCreateCompetitorMutation(
  options?: UseMutationOptions<Competitor, Error, CreateCompetitorInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompetitor,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.competitors() }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdateCompetitorMutation(
  options?: UseMutationOptions<Competitor, Error, { competitorId: string; input: UpdateCompetitorInput }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ competitorId, input }) => updateCompetitor(competitorId, input),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.competitors() }),
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.competitorById(variables.competitorId),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteCompetitorMutation(
  options?: UseMutationOptions<void, Error, { competitorId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ competitorId }) => deleteCompetitor(competitorId),
    onSuccess: async (_data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.competitors() }),
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.competitorById(variables.competitorId),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useCompetitorSignalsQuery(
  competitorId: string,
  options?: UseQueryOptions<CompetitorSignal[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.competitorSignals(competitorId),
    queryFn: () => listCompetitorSignals(competitorId),
    enabled: Boolean(competitorId),
    ...options,
  });
}

export function useCreateCompetitorSignalMutation(
  options?: UseMutationOptions<
    CompetitorSignal,
    Error,
    { competitorId: string; input: CreateCompetitorSignalInput }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input }) => createCompetitorSignal(input),
    onSuccess: async (_data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.competitorSignals(variables.competitorId),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useUpdateCompetitorSignalMutation(
  options?: UseMutationOptions<
    CompetitorSignal,
    Error,
    { competitorId: string; signalId: string; input: UpdateCompetitorSignalInput }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ signalId, input }) => updateCompetitorSignal(signalId, input),
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.competitorSignals(variables.competitorId),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteCompetitorSignalMutation(
  options?: UseMutationOptions<void, Error, { competitorId: string; signalId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ signalId }) => deleteCompetitorSignal(signalId),
    onSuccess: async (_data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.competitorSignals(variables.competitorId),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useStrategyChangeLogsQuery(
  strategyId: string | null,
  params: StrategyChangeLogListParams = {},
  options?: UseQueryOptions<StrategyChangeLog[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.changeLogs(strategyId ?? "none", params),
    queryFn: () => {
      if (!strategyId) return Promise.resolve<StrategyChangeLog[]>([]);
      return listStrategyChangeLogs(strategyId, params);
    },
    enabled: Boolean(strategyId),
    ...options,
  });
}

export function useCreateStrategyChangeLogMutation(
  options?: UseMutationOptions<StrategyChangeLog, Error, CreateStrategyChangeLogInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStrategyChangeLog,
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.changeLogs(variables.strategy_id, {}),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteStrategyChangeLogMutation(
  options?: UseMutationOptions<void, Error, { changeLogId: string; strategyId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ changeLogId }) => deleteStrategyChangeLog(changeLogId),
    onSuccess: async (_data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: strategyForgeKeys.changeLogs(variables.strategyId, {}),
        }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
      ]);
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function usePublicationStatusesQuery(
  options?: UseQueryOptions<OptionPublicationStatus[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.publicationStatuses,
    queryFn: () => listPublicationStatuses(true),
    ...options,
  });
}

export function useCompetitorStatusesQuery(
  options?: UseQueryOptions<OptionCompetitorStatus[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.competitorStatuses,
    queryFn: () => listCompetitorStatuses(true),
    ...options,
  });
}

export function useCompetitorSignalTypesQuery(
  options?: UseQueryOptions<OptionCompetitorSignalType[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.competitorSignalTypes,
    queryFn: () => listCompetitorSignalTypes(true),
    ...options,
  });
}

export function useDataSourcesQuery(options?: UseQueryOptions<OptionDataSource[]>) {
  return useQuery({
    queryKey: strategyForgeKeys.dataSources,
    queryFn: () => listDataSources(true),
    ...options,
  });
}

export function useStrategyChangeTypesQuery(
  options?: UseQueryOptions<OptionStrategyChangeType[]>
) {
  return useQuery({
    queryKey: strategyForgeKeys.changeTypes,
    queryFn: () => listStrategyChangeTypes(true),
    ...options,
  });
}

export function useCreatePublicationStatusOptionMutation(
  options?: UseMutationOptions<OptionPublicationStatus, Error, CreateOptionInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPublicationStatusOption,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.publicationStatuses });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdatePublicationStatusOptionMutation(
  options?: UseMutationOptions<OptionPublicationStatus, Error, { optionId: string; input: UpdateOptionInput }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, input }) => updatePublicationStatusOption(optionId, input),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.publicationStatuses });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeletePublicationStatusOptionMutation(
  options?: UseMutationOptions<void, Error, { optionId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId }) => deletePublicationStatusOption(optionId),
    onSuccess: async (_data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.publicationStatuses });
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useCreateCompetitorStatusOptionMutation(
  options?: UseMutationOptions<OptionCompetitorStatus, Error, CreateOptionInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompetitorStatusOption,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.competitorStatuses });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdateCompetitorStatusOptionMutation(
  options?: UseMutationOptions<OptionCompetitorStatus, Error, { optionId: string; input: UpdateOptionInput }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, input }) => updateCompetitorStatusOption(optionId, input),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.competitorStatuses });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteCompetitorStatusOptionMutation(
  options?: UseMutationOptions<void, Error, { optionId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId }) => deleteCompetitorStatusOption(optionId),
    onSuccess: async (_data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.competitorStatuses });
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useCreateCompetitorSignalTypeOptionMutation(
  options?: UseMutationOptions<OptionCompetitorSignalType, Error, CreateOptionInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompetitorSignalTypeOption,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: strategyForgeKeys.competitorSignalTypes,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdateCompetitorSignalTypeOptionMutation(
  options?: UseMutationOptions<OptionCompetitorSignalType, Error, { optionId: string; input: UpdateOptionInput }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, input }) => updateCompetitorSignalTypeOption(optionId, input),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: strategyForgeKeys.competitorSignalTypes,
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteCompetitorSignalTypeOptionMutation(
  options?: UseMutationOptions<void, Error, { optionId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId }) => deleteCompetitorSignalTypeOption(optionId),
    onSuccess: async (_data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: strategyForgeKeys.competitorSignalTypes,
      });
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useCreateDataSourceOptionMutation(
  options?: UseMutationOptions<OptionDataSource, Error, CreateOptionInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDataSourceOption,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.dataSources });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdateDataSourceOptionMutation(
  options?: UseMutationOptions<OptionDataSource, Error, { optionId: string; input: UpdateOptionInput }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, input }) => updateDataSourceOption(optionId, input),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.dataSources });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteDataSourceOptionMutation(
  options?: UseMutationOptions<void, Error, { optionId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId }) => deleteDataSourceOption(optionId),
    onSuccess: async (_data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.dataSources });
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useCreateStrategyChangeTypeOptionMutation(
  options?: UseMutationOptions<OptionStrategyChangeType, Error, CreateOptionInput>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStrategyChangeTypeOption,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.changeTypes });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useUpdateStrategyChangeTypeOptionMutation(
  options?: UseMutationOptions<OptionStrategyChangeType, Error, { optionId: string; input: UpdateOptionInput }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, input }) => updateStrategyChangeTypeOption(optionId, input),
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.changeTypes });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

export function useDeleteStrategyChangeTypeOptionMutation(
  options?: UseMutationOptions<void, Error, { optionId: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId }) => deleteStrategyChangeTypeOption(optionId),
    onSuccess: async (_data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: strategyForgeKeys.changeTypes });
      options?.onSuccess?.(_data, variables, context);
    },
    ...options,
  });
}

export function useStrategyWorkspaceQuery(
  options?: UseQueryOptions<StrategyWorkspaceData>
) {
  return useQuery({
    queryKey: strategyForgeKeys.workspace,
    queryFn: getStrategyWorkspaceData,
    ...options,
  });
}


