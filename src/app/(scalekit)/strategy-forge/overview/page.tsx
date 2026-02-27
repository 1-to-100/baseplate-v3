'use client';

import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  Chip,
  Input,
  LinearProgress,
  Skeleton,
  Stack,
  Textarea,
  Typography,
  Select,
} from '@mui/joy';
import Option from '@mui/joy/Option';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle as CheckCircleIcon,
  PencilSimple as PencilSimpleIcon,
  Plus as PlusIcon,
  ShuffleAngular as ShuffleAngularIcon,
  Sparkle as SparkleIcon,
  User as UserIcon,
  Warning as WarningIcon,
} from '@phosphor-icons/react/dist/ssr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  strategyForgeKeys,
  useCompanyStrategyQuery,
  usePublicationStatusesQuery,
  useStrategyPrinciplesQuery,
  useStrategyValuesQuery,
  useUpdateCompanyStrategyMutation,
  getOrCreateCustomerInfo,
  updateCustomerInfo,
  createCustomerInfo,
} from '../../strategy-forge/lib/api';
import {
  createCompanyStrategy,
  listPublicationStatuses,
} from '../../strategy-forge/lib/api/strategy-foundation';
import { CreateCompanyStrategyInput } from '../../strategy-forge/lib/schemas/strategy-foundation';
import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { CustomerInfo, CompanyStrategy } from '../../strategy-forge/lib/types';
import { toast } from '@/components/core/toaster';
import { paths } from '@/paths';
import { config } from '@/config';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function useAutoSeedStrategyWhenEmpty(): void {
  const queryClient = useQueryClient();
  const { data: strategy, isLoading } = useCompanyStrategyQuery();

  React.useEffect(() => {
    if (isLoading || strategy) return;

    const seedWorkspace = async () => {
      try {
        const statuses = await queryClient.fetchQuery({
          queryKey: strategyForgeKeys.publicationStatuses,
          queryFn: () => listPublicationStatuses(true),
        });

        const defaultStatus =
          statuses.find((status) => status.programmatic_name === 'draft') ?? statuses[0];

        if (!defaultStatus) return;

        const payload: CreateCompanyStrategyInput = {
          mission: 'Deliver enduring clarity for this leadership team.',
          mission_description:
            'Automatically generated baseline. Replace once the executive team finalizes the official mission.',
          vision: 'A living strategy that informs every planning decision.',
          vision_description:
            'This placeholder vision was created during the automated diagnostics run. Update it with concrete future-state outcomes.',
          publication_status_id: defaultStatus.option_id,
        };

        await createCompanyStrategy(payload);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: strategyForgeKeys.company }),
          queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
        ]);
      } catch (error) {
        console.error('Failed to seed Strategy Forge workspace:', error);
      }
    };

    seedWorkspace();
  }, [isLoading, strategy, queryClient]);
}

type GenerateStrategyButtonProps = {
  strategy: CompanyStrategy | null | undefined;
  size?: React.ComponentProps<typeof Button>['size'];
  variant?: React.ComponentProps<typeof Button>['variant'];
  fullWidth?: boolean;
};

function GenerateStrategyButton({
  strategy,
  size = 'sm',
  variant = 'outlined',
  fullWidth = false,
}: GenerateStrategyButtonProps): React.ReactElement {
  const supabase = React.useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerate = React.useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      // Check for customer_id in URL search params first
      const urlParams =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      let customerId = urlParams?.get('customer_id');

      // If not in URL, get from current_customer_id()
      if (!customerId) {
        const { data: customerIdFromRpc, error: customerIdError } =
          await supabase.rpc('current_customer_id');

        if (customerIdError) {
          throw new Error(customerIdError.message ?? 'Unable to resolve current customer.');
        }

        if (!customerIdFromRpc || typeof customerIdFromRpc !== 'string') {
          throw new Error('Current customer id is unavailable.');
        }

        customerId = customerIdFromRpc;
      }

      console.log('[DEBUG] Invoking create-initial-customer-strategy-for-customer-id', {
        customerId,
        timestamp: new Date().toISOString(),
      });

      // Verify session exists and refresh if needed
      const sessionResult = await supabase.auth.getSession();
      let { data: sessionData } = sessionResult;
      const { error: sessionError } = sessionResult;
      console.log('[DEBUG] Session check before function invoke:', {
        hasSession: !!sessionData?.session,
        hasAccessToken: !!sessionData?.session?.access_token,
        tokenLength: sessionData?.session?.access_token?.length,
        sessionError: sessionError?.message,
        expiresAt: sessionData?.session?.expires_at,
        expiresIn: sessionData?.session?.expires_at
          ? Math.floor((sessionData.session.expires_at * 1000 - Date.now()) / 1000)
          : null,
      });

      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated. Please sign in and try again.');
      }

      // Refresh session if it's close to expiring (within 5 minutes)
      if (sessionData.session.expires_at) {
        const expiresIn = sessionData.session.expires_at * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          console.log('[DEBUG] Session expiring soon, refreshing...');
          const { data: refreshedSession, error: refreshError } =
            await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession?.session) {
            sessionData = refreshedSession;
            console.log('[DEBUG] Session refreshed successfully');
          } else {
            console.warn('[DEBUG] Failed to refresh session:', refreshError);
          }
        }
      }

      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated. Please sign in and try again.');
      }

      // Use direct fetch instead of supabase.functions.invoke() to have more control
      // This matches the pattern used in EdgeFunctions class
      // The gateway-level JWT verification requires a valid, non-expired token
      const supabaseUrl = config.supabase.url;
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/create-initial-customer-strategy-for-customer-id`;

      console.log('[DEBUG] Function invoke details:', {
        functionUrl,
        functionName: 'create-initial-customer-strategy-for-customer-id',
        customerId,
        hasAuthToken: !!sessionData.session.access_token,
        tokenPrefix: sessionData.session.access_token?.substring(0, 30),
        tokenLength: sessionData.session.access_token?.length,
        requestBody: { customer_id: customerId },
      });

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ customer_id: customerId }),
      });

      let data, invokeError;

      // Parse response
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error('[DEBUG] Failed to parse function response:', parseError);
        throw new Error(`Function returned invalid JSON (status: ${response.status})`);
      }

      if (!response.ok) {
        const errorMessage =
          data?.error || data?.message || `Function returned status ${response.status}`;
        console.error('[DEBUG] Function error response:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          data,
        });
        invokeError = {
          message: errorMessage,
          status: response.status,
          statusText: response.statusText,
        };
      }

      console.log('[DEBUG] Function invoke response', {
        hasData: !!data,
        data,
        hasError: !!invokeError,
        error: invokeError,
        errorMessage: invokeError?.message,
        errorDetails: invokeError,
      });

      if (invokeError) {
        console.error('[DEBUG] Function invoke error details:', {
          message: invokeError.message,
          status: invokeError.status,
          statusText: invokeError.statusText,
          fullError: invokeError,
        });
        throw new Error(invokeError.message ?? 'Strategy generation failed.');
      }

      const payload = (data ?? {}) as { success?: boolean; created?: boolean; error?: string };

      console.log('[DEBUG] Function payload', {
        payload,
        success: payload.success,
        created: payload.created,
        error: payload.error,
      });

      if (!payload.success) {
        console.error('[DEBUG] Function returned unsuccessful result:', payload);
        throw new Error(payload.error ?? 'Strategy generation did not complete successfully.');
      }

      toast.success(
        payload.created ? 'Generated a new strategy draft.' : 'Strategy refreshed successfully.'
      );

      const invalidatePromises: Array<Promise<unknown>> = [
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.company }),
        queryClient.invalidateQueries({ queryKey: strategyForgeKeys.workspace }),
        queryClient.invalidateQueries({ queryKey: ['strategy-forge', 'customer-info'] }),
      ];

      if (strategy?.strategy_id) {
        invalidatePromises.push(
          queryClient.invalidateQueries({
            queryKey: strategyForgeKeys.principles(strategy.strategy_id),
          }),
          queryClient.invalidateQueries({
            queryKey: strategyForgeKeys.values(strategy.strategy_id),
          })
        );
      }

      await Promise.all(invalidatePromises);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate strategy.';
      toast.error(message);
      console.error('Failed to invoke create-initial-customer-strategy-for-customer-id:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, supabase, queryClient, strategy?.strategy_id, router]);

  return (
    <Button
      size={size}
      variant={variant}
      startDecorator={<SparkleIcon size={16} weight='bold' />}
      onClick={handleGenerate}
      loading={isGenerating}
      disabled={isGenerating}
      sx={fullWidth ? { width: '100%' } : undefined}
    >
      Generate Strategy
    </Button>
  );
}

function useStrategyOwners() {
  return useQuery({
    queryKey: ['strategy-forge', 'owners'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('user_id, full_name')
        .order('full_name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (
        data?.map((user) => ({
          id: user.user_id,
          name: user.full_name ?? 'Unnamed user',
        })) ?? []
      );
    },
    staleTime: 1000 * 60 * 5,
  });
}

function StrategyOwnerSelect(): React.ReactElement {
  const { data: strategy } = useCompanyStrategyQuery();
  const { data: owners, isLoading } = useStrategyOwners();
  const updateOwner = useUpdateCompanyStrategyMutation();
  const [value, setValue] = React.useState<string | null>(strategy?.owner_user_id ?? null);

  React.useEffect(() => {
    setValue(strategy?.owner_user_id ?? null);
  }, [strategy?.owner_user_id]);

  if (!strategy) {
    return (
      <Select
        size='sm'
        placeholder='Loading owner…'
        startDecorator={<UserIcon size={16} weight='bold' />}
        disabled
        aria-label='Strategy owner'
      />
    );
  }

  return (
    <Select
      size='sm'
      value={value ?? null}
      onChange={async (_event, newValue) => {
        if (!owners || updateOwner.isPending) return;
        try {
          setValue(newValue ?? null);
          await updateOwner.mutateAsync({
            strategyId: strategy.strategy_id,
            input: { owner_user_id: newValue ?? null },
          });
        } catch (error) {
          console.error('Failed to update strategy owner', error);
          setValue(strategy.owner_user_id ?? null);
        }
      }}
      placeholder={
        isLoading ? 'Loading owners…' : owners?.length ? 'Select owner' : 'No users found'
      }
      startDecorator={<UserIcon size={16} weight='bold' />}
      aria-label='Strategy owner'
      disabled={isLoading || updateOwner.isPending || !owners?.length}
      sx={{ minWidth: 200 }}
    >
      {owners?.map((owner) => (
        <Option key={owner.id} value={owner.id}>
          {owner.name}
        </Option>
      ))}
    </Select>
  );
}

function GovernanceBar(): React.ReactElement {
  const router = useRouter();
  const { data: strategy, isLoading } = useCompanyStrategyQuery();
  const { data: statuses } = usePublicationStatusesQuery();

  if (isLoading) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between'>
            <Skeleton variant='text' level='title-md' width={240} />
            <Skeleton variant='rectangular' height={32} width={160} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (!strategy) {
    return (
      <Card variant='outlined' color='neutral'>
        <CardContent>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography level='title-lg'>Preparing workspace</Typography>
              <Typography level='body-sm' color='neutral'>
                We’re running an automated review to bootstrap your strategy. Hang tight—once
                complete, you can begin refining each section.
              </Typography>
            </Stack>
            <LinearProgress variant='soft' />
            <GenerateStrategyButton strategy={strategy} size='md' variant='solid' fullWidth />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const publicationStatus = statuses?.find(
    (status) => status.option_id === strategy.publication_status_id
  );

  return (
    <Card variant='outlined'>
      <CardContent>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          <Stack spacing={0.5}>
            <Typography level='h1' sx={{ fontSize: '1.5rem' }}>
              Core Strategy
            </Typography>
            <Typography level='body-sm' color='neutral'>
              Canonical mission, vision, principles, values and competitors for this company
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems='center'>
            <GenerateStrategyButton strategy={strategy} />
            <Chip
              variant='soft'
              color={strategy.is_published ? 'success' : 'warning'}
              startDecorator={
                strategy.is_published ? (
                  <CheckCircleIcon size={16} weight='bold' />
                ) : (
                  <WarningIcon size={16} weight='bold' />
                )
              }
              sx={{ textTransform: 'capitalize' }}
            >
              {publicationStatus?.display_name ?? (strategy.is_published ? 'Published' : 'Draft')}
            </Chip>

            <StrategyOwnerSelect />

            <Button
              variant='solid'
              color='primary'
              startDecorator={<SparkleIcon size={16} weight='bold' />}
              onClick={() => router.push('/strategy-forge/publish')}
              aria-haspopup='dialog'
            >
              Publish Updates
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function MissionVisionCards(): React.ReactElement {
  const router = useRouter();
  const { data: strategy, isLoading } = useCompanyStrategyQuery();

  if (isLoading) {
    return (
      <Stack spacing={2}>
        {[0, 1].map((key) => (
          <Card key={key} variant='outlined'>
            <CardContent>
              <Skeleton level='title-lg' width={120} />
              <Skeleton variant='text' level='body-md' />
              <Skeleton variant='text' level='body-sm' />
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  if (!strategy) {
    return (
      <Stack spacing={2}>
        {['Mission', 'Vision'].map((label) => (
          <Card key={label} variant='outlined'>
            <CardContent>
              <Stack spacing={1}>
                <Typography level='title-lg'>{label}</Typography>
                <Typography level='body-sm' color='neutral'>
                  Auto-generating {label.toLowerCase()}…
                </Typography>
                <LinearProgress variant='soft' />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Card
        variant='outlined'
        role='region'
        aria-labelledby='strategy-mission-title'
        sx={{ borderColor: !strategy.is_published ? 'warning.300' : undefined }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Stack spacing={0.5}>
                <Typography id='strategy-mission-title' level='title-lg'>
                  Mission
                </Typography>
                {!strategy.is_published ? (
                  <Chip variant='soft' color='warning' size='sm'>
                    Draft
                  </Chip>
                ) : null}
              </Stack>
              <Button
                size='sm'
                variant='outlined'
                startDecorator={<PencilSimpleIcon size={16} weight='bold' />}
                onClick={() => router.push('/strategy-forge/edit/mission')}
                aria-controls='strategy-mission-editor'
              >
                Edit Mission
              </Button>
            </Stack>
            <Typography level='body-md' color='neutral'>
              {strategy.mission || 'No mission defined yet.'}
            </Typography>
            {strategy.mission_description ? (
              <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                {strategy.mission_description}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card
        variant='outlined'
        role='region'
        aria-labelledby='strategy-vision-title'
        sx={{ borderColor: !strategy.is_published ? 'warning.300' : undefined }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent='space-between'
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
            >
              <Stack spacing={0.5}>
                <Typography id='strategy-vision-title' level='title-lg'>
                  Vision
                </Typography>
                {!strategy.is_published ? (
                  <Chip variant='soft' color='warning' size='sm'>
                    Draft
                  </Chip>
                ) : null}
              </Stack>
              <Button
                size='sm'
                variant='outlined'
                startDecorator={<PencilSimpleIcon size={16} weight='bold' />}
                onClick={() => router.push('/strategy-forge/edit/vision')}
                aria-controls='strategy-vision-editor'
              >
                Edit Vision
              </Button>
            </Stack>
            <Typography level='body-md' color='neutral'>
              {strategy.vision || 'No vision defined yet.'}
            </Typography>
            {strategy.vision_description ? (
              <Typography level='body-sm' sx={{ color: 'neutral.600' }}>
                {strategy.vision_description}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function PrinciplesSection(): React.ReactElement {
  const router = useRouter();
  const { data: strategy, isLoading: isStrategyLoading } = useCompanyStrategyQuery();
  const strategyId = strategy?.strategy_id ?? null;
  const { data: principles, isLoading: isPrinciplesLoading } =
    useStrategyPrinciplesQuery(strategyId);

  if (isStrategyLoading || isPrinciplesLoading) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Stack spacing={1.5}>
            <Skeleton level='title-lg' width={160} />
            <Skeleton variant='text' level='body-sm' />
            <Skeleton variant='text' level='body-sm' />
            <Skeleton variant='text' level='body-sm' />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant='outlined' role='region' aria-labelledby='strategy-principles-title'>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Stack spacing={0.25}>
              <Typography id='strategy-principles-title' level='title-lg'>
                Principles
              </Typography>
              <Typography level='body-xs' color='neutral'>
                Ordered list of active principles guiding tradeoffs
              </Typography>
            </Stack>
            <Button
              size='sm'
              variant='outlined'
              startDecorator={<ShuffleAngularIcon size={16} weight='bold' />}
              onClick={() => router.push('/strategy-forge/edit/principles')}
            >
              Manage Principles
            </Button>
          </Stack>

          {!principles || principles.length === 0 ? (
            <Stack spacing={1} alignItems='flex-start'>
              <Typography level='body-sm' color='neutral'>
                No principles yet. Add principles to capture how your team makes tradeoffs.
              </Typography>
              <Button
                size='sm'
                variant='soft'
                startDecorator={<PlusIcon size={16} weight='bold' />}
                onClick={() => router.push('/strategy-forge/edit/principles')}
              >
                Add Principle
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              {principles.slice(0, 5).map((principle) => (
                <Card key={principle.principle_id} variant='soft'>
                  <CardContent>
                    <Stack spacing={0.5}>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <Typography level='title-sm'>{principle.name}</Typography>
                        {!principle.is_active ? (
                          <Chip variant='soft' color='neutral' size='sm'>
                            Inactive
                          </Chip>
                        ) : null}
                      </Stack>
                      {principle.description ? (
                        <Typography level='body-sm' color='neutral'>
                          {principle.description}
                        </Typography>
                      ) : (
                        <Typography level='body-xs' sx={{ color: 'neutral.500' }}>
                          No description provided.
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {principles.length > 5 ? (
                <Button
                  size='sm'
                  variant='plain'
                  component={NextLink}
                  href='/strategy-forge/edit/principles'
                >
                  View all {principles.length} principles
                </Button>
              ) : null}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ValuesSection(): React.ReactElement {
  const router = useRouter();
  const { data: strategy, isLoading: isStrategyLoading } = useCompanyStrategyQuery();
  const strategyId = strategy?.strategy_id ?? null;
  const { data: values, isLoading: isValuesLoading } = useStrategyValuesQuery(strategyId);

  if (isStrategyLoading || isValuesLoading) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Stack spacing={1.5}>
            <Skeleton level='title-lg' width={160} />
            <Skeleton variant='text' level='body-sm' />
            <Skeleton variant='text' level='body-sm' />
            <Skeleton variant='text' level='body-sm' />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant='outlined' role='region' aria-labelledby='strategy-values-title'>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction='row' justifyContent='space-between' alignItems='center'>
            <Stack spacing={0.25}>
              <Typography id='strategy-values-title' level='title-lg'>
                Values
              </Typography>
              <Typography level='body-xs' color='neutral'>
                Operating norms used across planning and culture artifacts
              </Typography>
            </Stack>
            <Button
              size='sm'
              variant='outlined'
              startDecorator={<ShuffleAngularIcon size={16} weight='bold' />}
              onClick={() => router.push('/strategy-forge/edit/values')}
            >
              Manage Values
            </Button>
          </Stack>

          {!values || values.length === 0 ? (
            <Stack spacing={1} alignItems='flex-start'>
              <Typography level='body-sm' color='neutral'>
                No values recorded yet. Define values so teams know the behaviors that matter most.
              </Typography>
              <Button
                size='sm'
                variant='soft'
                startDecorator={<PlusIcon size={16} weight='bold' />}
                onClick={() => router.push('/strategy-forge/edit/values')}
              >
                Add Value
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1.25}>
              {values.slice(0, 5).map((value) => (
                <Card key={value.value_id} variant='soft'>
                  <CardContent>
                    <Stack spacing={0.5}>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <Typography level='title-sm'>{value.name}</Typography>
                        {!value.is_active ? (
                          <Chip variant='soft' color='neutral' size='sm'>
                            Inactive
                          </Chip>
                        ) : null}
                      </Stack>
                      {value.description ? (
                        <Typography level='body-sm' color='neutral'>
                          {value.description}
                        </Typography>
                      ) : (
                        <Typography level='body-xs' sx={{ color: 'neutral.500' }}>
                          No description provided.
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              {values.length > 5 ? (
                <Button
                  size='sm'
                  variant='plain'
                  component={NextLink}
                  href='/strategy-forge/edit/values'
                >
                  View all {values.length} values
                </Button>
              ) : null}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

type GtmFieldKey =
  | 'tagline'
  | 'one_sentence_summary'
  | 'problem_overview'
  | 'solution_overview'
  | 'competitive_overview';

const gtmFields: Array<{
  key: GtmFieldKey;
  label: string;
  multiline?: boolean;
  placeholder: string;
}> = [
  {
    key: 'tagline',
    label: 'Tagline',
    placeholder: 'Add a concise market-facing tagline.',
  },
  {
    key: 'one_sentence_summary',
    label: 'One Sentence Summary',
    placeholder: 'Summarize the company in a single sentence.',
  },
  {
    key: 'problem_overview',
    label: 'Problem Overview',
    multiline: true,
    placeholder: 'Describe the customer problem you solve.',
  },
  {
    key: 'solution_overview',
    label: 'Solution Overview',
    multiline: true,
    placeholder: 'Explain how your solution addresses the problem.',
  },
  {
    key: 'competitive_overview',
    label: 'Competitive Overview',
    multiline: true,
    placeholder: 'Describe the competitive landscape and how you differentiate.',
  },
];

function useIsSystemRole(): { data: boolean | undefined; isLoading: boolean; error: Error | null } {
  const { data, isLoading, error } = useQuery({
    queryKey: ['strategy-forge', 'is-system-role'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('is_system_role');

      if (error) {
        throw new Error(error.message);
      }

      return Boolean(data);
    },
    staleTime: 1000 * 60 * 5,
  });

  return { data, isLoading, error: (error as Error) ?? null };
}

function GtmSettingsPanel(): React.ReactElement {
  const queryClient = useQueryClient();
  const customerInfoQueryKey = React.useMemo(() => ['strategy-forge', 'customer-info'], []);

  const {
    data: customerInfo,
    isLoading: isCustomerInfoLoading,
    error: customerInfoError,
  } = useQuery<CustomerInfo>({
    queryKey: customerInfoQueryKey,
    queryFn: () => getOrCreateCustomerInfo(),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: isSystemRole,
    isLoading: isSystemRoleLoading,
    error: systemRoleError,
  } = useIsSystemRole();

  const updateFieldMutation = useMutation({
    mutationFn: async ({
      field,
      value,
      customerInfo,
    }: {
      field: GtmFieldKey;
      value: string;
      customerInfo: CustomerInfo;
    }) => {
      // If customer_info_id is empty, create the record first
      if (!customerInfo.customer_info_id || customerInfo.customer_info_id === '') {
        // Create new customer_info with all current values, updating the edited field
        const createPayload = {
          company_name: customerInfo.company_name || '',
          tagline: field === 'tagline' ? value : customerInfo.tagline || '',
          one_sentence_summary:
            field === 'one_sentence_summary' ? value : customerInfo.one_sentence_summary || '',
          problem_overview:
            field === 'problem_overview' ? value : customerInfo.problem_overview || '',
          solution_overview:
            field === 'solution_overview' ? value : customerInfo.solution_overview || '',
          competitive_overview:
            field === 'competitive_overview' ? value : customerInfo.competitive_overview || '',
          content_authoring_prompt: customerInfo.content_authoring_prompt || '',
        };
        return createCustomerInfo(createPayload);
      } else {
        // Update existing record
        return updateCustomerInfo({
          customer_info_id: customerInfo.customer_info_id,
          [field]: value,
        });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(customerInfoQueryKey, data);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update GTM field.';
      toast.error(message);
    },
  });

  const [activeField, setActiveField] = React.useState<GtmFieldKey | null>(null);
  const [draftValue, setDraftValue] = React.useState<string>('');

  const isLoading = isCustomerInfoLoading || isSystemRoleLoading;
  const canEdit = Boolean(isSystemRole);

  const handleStartEditing = React.useCallback(
    (field: GtmFieldKey) => {
      if (!canEdit || !customerInfo) return;
      setActiveField(field);
      setDraftValue(customerInfo[field] ?? '');
    },
    [canEdit, customerInfo]
  );

  const handleCancelEditing = React.useCallback(
    (field: GtmFieldKey) => {
      if (!customerInfo) return;
      setDraftValue(customerInfo[field] ?? '');
      setActiveField(null);
    },
    [customerInfo]
  );

  const handleSave = React.useCallback(async () => {
    if (!activeField || !customerInfo) {
      setActiveField(null);
      return;
    }

    const trimmedDraft = draftValue.trim();
    const currentValue = customerInfo[activeField] ?? '';

    if (trimmedDraft === currentValue?.trim()) {
      setActiveField(null);
      return;
    }

    try {
      await updateFieldMutation.mutateAsync({
        field: activeField,
        value: draftValue,
        customerInfo: customerInfo,
      });
      setActiveField(null);
    } catch (error) {
      console.error('Failed to update GTM field:', error);
      handleCancelEditing(activeField);
    }
  }, [activeField, customerInfo, draftValue, handleCancelEditing, updateFieldMutation]);

  const handleBlur = React.useCallback(() => {
    void handleSave();
  }, [handleSave]);

  const handleKeyDown = React.useCallback(
    (
      event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      field: GtmFieldKey,
      multiline?: boolean
    ) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelEditing(field);
        return;
      }

      if (!multiline && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const target = event.target as HTMLInputElement | HTMLTextAreaElement;
        target.blur();
      }
    },
    [handleCancelEditing]
  );

  return (
    <Card variant='outlined' role='region' aria-labelledby='strategy-gtm-settings-title'>
      <CardContent>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography id='strategy-gtm-settings-title' level='title-lg'>
              GTM Strategy
            </Typography>
            <Typography level='body-xs' color='neutral'>
              Messaging references used across personas, segments, and content.
            </Typography>
          </Stack>

          {isLoading ? (
            <Stack spacing={1}>
              {gtmFields.map((field) => (
                <Stack key={field.key} spacing={0.5}>
                  <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                    {field.label}
                  </Typography>
                  <Skeleton variant='text' level='body-sm' />
                </Stack>
              ))}
            </Stack>
          ) : customerInfoError ? (
            <Typography level='body-sm' color='danger'>
              Unable to load company information.
            </Typography>
          ) : systemRoleError ? (
            <Typography level='body-sm' color='danger'>
              Unable to verify editing permissions.
            </Typography>
          ) : !customerInfo ? (
            <Typography level='body-sm' color='neutral'>
              Company information has not been generated yet.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {gtmFields.map((field) => {
                const value = customerInfo[field.key] ?? '';
                const isActive = activeField === field.key;

                return (
                  <Stack key={field.key} spacing={0.5}>
                    <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                      {field.label}
                    </Typography>
                    <Stack
                      onClick={() => {
                        if (isActive || !canEdit) return;
                        handleStartEditing(field.key);
                      }}
                      spacing={0.5}
                      sx={{
                        borderRadius: 'sm',
                        border: '1px solid',
                        borderColor: isActive ? 'primary.400' : 'neutral.outlinedBorder',
                        backgroundColor: isActive ? 'background.surface' : 'background.level1',
                        px: 1.25,
                        py: isActive ? 1 : 1.25,
                        cursor: canEdit ? 'pointer' : 'default',
                        transition: 'border-color 0.2s, background-color 0.2s',
                        '&:hover': canEdit
                          ? {
                              borderColor: 'primary.400',
                              backgroundColor: 'primary.plainHoverBg',
                            }
                          : undefined,
                      }}
                    >
                      {isActive ? (
                        field.multiline ? (
                          <Textarea
                            value={draftValue}
                            onChange={(event) => setDraftValue(event.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={(event) => handleKeyDown(event, field.key, field.multiline)}
                            autoFocus
                            minRows={3}
                            maxRows={8}
                            disabled={updateFieldMutation.isPending}
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <Input
                            value={draftValue}
                            onChange={(event) => setDraftValue(event.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={(event) => handleKeyDown(event, field.key, field.multiline)}
                            autoFocus
                            disabled={updateFieldMutation.isPending}
                            placeholder={field.placeholder}
                          />
                        )
                      ) : (
                        <>
                          <Typography
                            level='body-sm'
                            sx={!value ? { color: 'neutral.500' } : undefined}
                          >
                            {value || 'Not set'}
                          </Typography>
                          {canEdit ? (
                            <Stack direction='row' spacing={0.5} alignItems='center'>
                              <PencilSimpleIcon size={14} weight='bold' />
                              <Typography level='body-xs' sx={{ color: 'neutral.600' }}>
                                Click to edit
                              </Typography>
                            </Stack>
                          ) : null}
                        </>
                      )}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function StrategyForgeOverviewPage(): React.ReactElement {
  useAutoSeedStrategyWhenEmpty();

  return (
    <Stack spacing={3}>
      <GovernanceBar />
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems='stretch'>
        <Stack flex={2} spacing={3}>
          <MissionVisionCards />
          <PrinciplesSection />
          <ValuesSection />
        </Stack>
        <Stack flex={1} spacing={3}>
          <GtmSettingsPanel />
        </Stack>
      </Stack>
    </Stack>
  );
}
