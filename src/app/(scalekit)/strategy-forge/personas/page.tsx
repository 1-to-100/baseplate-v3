'use client';

import * as React from 'react';
import type { Metadata } from 'next';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Grid from '@mui/joy/Grid';
import Link from '@mui/joy/Link';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Table from '@mui/joy/Table';
import Textarea from '@mui/joy/Textarea';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Lightbulb as LightbulbIcon } from '@phosphor-icons/react/dist/ssr/Lightbulb';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { config } from '@/config';
import { PersonasAPI } from '../lib/api';
import { useAuth } from '@/contexts/auth/user-context';
import { toast } from '@/components/core/toaster';
import { useDebounce } from '@/hooks/use-debounce';
import { PersonaCreationDialog } from '../lib/components';
import { createClient } from '@/lib/supabase/client';

//export const metadata = { title: `Personas | Dashboard | ${config.site.name}` } satisfies Metadata;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface PersonasListProps {}

interface SuggestedPersona {
  name: string;
  description: string;
  tempId: string; // For tracking in UI
}

export default function PersonasListPage(): React.JSX.Element {
  const router = useRouter();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const limit = 10;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = React.useState(false);
  const [suggestedPersonas, setSuggestedPersonas] = React.useState<SuggestedPersona[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const [isCreatingPersonas, setIsCreatingPersonas] = React.useState(false);
  const supabase = createClient();
  const [isCheckingCustomerInfo, setIsCheckingCustomerInfo] = React.useState(true);

  // Check for customer_info before loading personas
  React.useEffect(() => {
    const checkCustomerInfo = async () => {
      if (!auth.user) {
        setIsCheckingCustomerInfo(false);
        return;
      }

      try {
        // Get current customer ID using the SQL function
        const { data: customerIdResult, error: customerIdError } = await supabase.rpc("customer_id");
        if (customerIdError) {
          console.error('Error getting customer ID:', customerIdError);
          setIsCheckingCustomerInfo(false);
          return;
        }
        const customerId = customerIdResult;

        // Check for customer_info filtered by customer_id
        const { data: customerInfo, error } = await supabase
          .from('customer_info')
          .select('customer_info_id')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (error) {
          console.error('Error checking customer_info:', error);
          setIsCheckingCustomerInfo(false);
          return;
        }

        if (!customerInfo) {
          console.log('No customer_info found, redirecting to company information page');
          toast.warning('Please complete your company information first');
          router.push('/strategy-forge/company-information');
          return;
        }

        setIsCheckingCustomerInfo(false);
      } catch (error) {
        console.error('Error checking customer_info:', error);
        setIsCheckingCustomerInfo(false);
      }
    };

    checkCustomerInfo();
  }, [auth.user, router, supabase]);

  // Fetch personas (filtered by customer_id using SQL function)
  const { data: personas = [], isLoading, error } = useQuery({
    queryKey: ['personas', page, limit],
    queryFn: () => PersonasAPI.getAll(),
    enabled: !!auth.user && !isCheckingCustomerInfo,
  });

  // Pagination
  const totalPages = Math.ceil(personas.length / limit);
  const paginatedPersonas = personas.slice((page - 1) * limit, page * limit);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (personaId: string) => PersonasAPI.delete(personaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast.success('Persona deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete persona: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const handleDelete = (personaId: string, personaName: string) => {
    if (window.confirm(`Are you sure you want to delete "${personaName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(personaId);
    }
  };

  const handleEdit = (personaId: string) => {
    router.push(`/strategy-forge/personas/${personaId}/edit`);
  };


  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['personas'] });
    setIsCreateDialogOpen(false);
  };

  const handleSuggestPersonas = React.useCallback(async () => {
    setIsLoadingSuggestions(true);
    setIsSuggestModalOpen(true);
    setSuggestedPersonas([]);

    try {
      // Get current customer ID
      const { data: resolvedCustomerId, error: customerIdError } = await supabase.rpc("current_customer_id");

      if (customerIdError) {
        throw new Error(customerIdError.message);
      }

      if (!resolvedCustomerId || typeof resolvedCustomerId !== "string") {
        throw new Error("Unable to resolve current customer id.");
      }

      // Verify session exists and refresh if needed
      let { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        throw new Error("Not authenticated. Please sign in and try again.");
      }

      // Refresh session if it's close to expiring (within 5 minutes)
      if (sessionData.session.expires_at) {
        const expiresIn = sessionData.session.expires_at * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession?.session) {
            sessionData = refreshedSession;
          }
        }
      }

      if (!sessionData?.session?.access_token) {
        throw new Error("Not authenticated. Please sign in and try again.");
      }

      // Use direct fetch instead of supabase.functions.invoke() to have more control
      const supabaseUrl = config.supabase.url;
      if (!supabaseUrl) {
        throw new Error("Supabase URL is not configured");
      }

      const functionUrl = `${supabaseUrl}/functions/v1/suggest-personas-for-customer-id`;
      const requestBody = {
        customer_id: resolvedCustomerId,
      };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error("Failed to parse function response:", parseError);
        throw new Error(`Function returned invalid JSON (status: ${response.status})`);
      }

      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `Function returned status ${response.status}`;
        throw new Error(errorMessage);
      }

      if (!data || !data.success || !data.personas) {
        throw new Error('Invalid response from suggest-personas-for-customer-id function');
      }

      // Add temp IDs to personas for tracking
      const personasWithIds = data.personas.map((p: { name: string; description: string }, idx: number) => ({
        ...p,
        tempId: `temp-${Date.now()}-${idx}`
      }));

      setSuggestedPersonas(personasWithIds);
      toast.success(`Generated ${personasWithIds.length} persona suggestions!`);
    } catch (err) {
      console.error('Failed to suggest personas:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to suggest personas');
      setIsSuggestModalOpen(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [supabase]);

  const handleAddNewSuggestion = () => {
    const newPersona: SuggestedPersona = {
      name: '',
      description: '',
      tempId: `temp-${Date.now()}`
    };
    setSuggestedPersonas([...suggestedPersonas, newPersona]);
  };

  const handleUpdateSuggestion = (tempId: string, field: 'name' | 'description', value: string) => {
    setSuggestedPersonas(suggestedPersonas.map(p => 
      p.tempId === tempId ? { ...p, [field]: value } : p
    ));
  };

  const handleDeleteSuggestion = (tempId: string) => {
    setSuggestedPersonas(suggestedPersonas.filter(p => p.tempId !== tempId));
  };

  const handleCreateAllPersonas = async () => {
    try {
      setIsCreatingPersonas(true);
      
      // Filter out empty personas
      const validPersonas = suggestedPersonas.filter(p => p.name.trim() && p.description.trim());
      
      if (validPersonas.length === 0) {
        toast.error('Please add at least one persona with a name and description');
        return;
      }

      // Get current customer ID
      const { data: resolvedCustomerId, error: customerIdError } = await supabase.rpc("current_customer_id");

      if (customerIdError) {
        throw new Error(customerIdError.message);
      }

      if (!resolvedCustomerId || typeof resolvedCustomerId !== "string") {
        throw new Error("Unable to resolve current customer id.");
      }

      // Verify session exists and refresh if needed
      let { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session?.access_token) {
        throw new Error("Not authenticated. Please sign in and try again.");
      }

      // Refresh session if it's close to expiring (within 5 minutes)
      if (sessionData.session.expires_at) {
        const expiresIn = sessionData.session.expires_at * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession?.session) {
            sessionData = refreshedSession;
          }
        }
      }

      if (!sessionData?.session?.access_token) {
        throw new Error("Not authenticated. Please sign in and try again.");
      }

      const supabaseUrl = config.supabase.url;
      if (!supabaseUrl) {
        throw new Error("Supabase URL is not configured");
      }

      // Store access token after null check
      const accessToken = sessionData.session.access_token;

      // Create all personas in parallel
      const createPromises = validPersonas.map(async (persona) => {
        const functionUrl = `${supabaseUrl}/functions/v1/create-persona`;
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            customer_id: resolvedCustomerId,
            name: persona.name,
            description: persona.description
          }),
        });

        let data;
        try {
          const responseText = await response.text();
          data = responseText ? JSON.parse(responseText) : null;
        } catch (parseError) {
          console.error("Failed to parse function response:", parseError);
          throw new Error(`Function returned invalid JSON (status: ${response.status})`);
        }

        if (!response.ok) {
          const errorMessage = data?.error || data?.message || `Function returned status ${response.status}`;
          throw new Error(`Failed to create "${persona.name}": ${errorMessage}`);
        }

        return data;
      });

      const results = await Promise.allSettled(createPromises);

      // Check results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        const errors = results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => r.reason.message);
        toast.error(`Created ${successful} personas, but ${failed} failed: ${errors.join(', ')}`);
      } else {
        toast.success(`Successfully created ${successful} personas!`);
      }

      // Reload personas
      await queryClient.invalidateQueries({ queryKey: ['personas'] });
      
    } catch (err) {
      console.error('Error creating personas:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create personas');
    } finally {
      // Always close the modal and reset state
      setIsCreatingPersonas(false);
      setIsSuggestModalOpen(false);
      setSuggestedPersonas([]);
    }
  };


  // Show loading state while checking for customer_info
  if (isCheckingCustomerInfo) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Stack spacing={2} alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
          <Typography level="body-md">Loading...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 'var(--Content-padding)' }}>
        <Typography color="danger">
          Error loading personas: {error instanceof Error ? error.message : 'Unknown error'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        {/* Header */}
        <div>
          <Typography fontSize={{ xs: 'xl3', lg: 'xl4' }} level="h1">
            Personas
          </Typography>
          <Typography level="body-md" sx={{ mt: 1 }}>
            Manage customer personas for your organization
          </Typography>
          <Typography level="body-sm" sx={{ mt: 1, color: 'text.secondary' }}>
            Showing personas for your customer organization (filtered by customer_id)
          </Typography>
        </div>

        {/* Actions Bar */}
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Chip variant="soft" color="neutral">
                {personas.length} persona{personas.length !== 1 ? 's' : ''}
              </Chip>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  startDecorator={<LightbulbIcon />}
                  onClick={handleSuggestPersonas}
                >
                  Suggest Personas
                </Button>
                <Button
                  startDecorator={<PlusIcon />}
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create Persona
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Personas Grid */}
        {isLoading ? (
          <Card>
            <CardContent>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Loading personas...</Typography>
              </Box>
            </CardContent>
          </Card>
        ) : paginatedPersonas.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="neutral">
                  No personas found. Create your first persona or use "Suggest Personas" to get started.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {paginatedPersonas.map((persona) => (
              <Grid xs={12} md={6} key={persona.persona_id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      {/* Header with name and actions */}
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Link
                          component="a"
                          href={`/strategy-forge/personas/${persona.persona_id}`}
                          sx={{
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          <Typography level="h4" fontWeight="lg" color="primary">
                            {persona.name}
                          </Typography>
                        </Link>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="sm"
                            variant="soft"
                            color="primary"
                            onClick={() => handleEdit(persona.persona_id)}
                          >
                            <PencilSimpleIcon />
                          </IconButton>
                          <IconButton
                            size="sm"
                            variant="solid"
                            color="danger"
                            onClick={() => handleDelete(persona.persona_id, persona.name)}
                            disabled={deleteMutation.isPending}
                            sx={{ color: 'white' }}
                          >
                            <TrashIcon />
                          </IconButton>
                        </Stack>
                      </Stack>

                      {/* Titles */}
                      <Box>
                        <Typography level="body-sm" fontWeight="md" color="neutral" sx={{ mb: 0.5 }}>
                          Titles
                        </Typography>
                        <Typography level="body-sm">
                          {persona.titles || 'No titles specified'}
                        </Typography>
                      </Box>

                      {/* Job Responsibilities */}
                      <Box>
                        <Typography level="body-sm" fontWeight="md" color="neutral" sx={{ mb: 0.5 }}>
                          Job Responsibilities
                        </Typography>
                        <Typography level="body-sm" sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {persona.job_responsibilities || 'No responsibilities specified'}
                        </Typography>
                      </Box>

                      {/* Manager and Decision Maker */}
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography level="body-sm" fontWeight="md" color="neutral">
                            Is Manager
                          </Typography>
                          <Typography level="body-sm" fontWeight="md" color="neutral">
                            Is Decision Maker
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Chip
                            size="sm"
                            color={persona.is_manager ? 'success' : 'neutral'}
                            variant="soft"
                          >
                            {persona.is_manager ? 'Yes' : 'No'}
                          </Chip>
                          <Chip
                            size="sm"
                            color={persona.is_decider ? 'primary' : 'neutral'}
                            variant="soft"
                          >
                            {persona.is_decider ? 'Yes' : 'No'}
                          </Chip>
                        </Stack>
                      </Box>

                      {/* Created date */}
                      <Typography level="body-xs" color="neutral">
                        Created {new Date(persona.created_at).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography level="body-sm">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, personas.length)} of {personas.length} personas
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outlined"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      <PersonaCreationDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Suggest Personas Modal */}
      <Modal open={isSuggestModalOpen} onClose={() => !isCreatingPersonas && setIsSuggestModalOpen(false)}>
        <ModalDialog sx={{ minWidth: '80vw', maxWidth: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
          <ModalClose disabled={isCreatingPersonas} />
          <Typography level="h3">Suggested Personas</Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            Review and edit the AI-generated persona suggestions. Add new suggestions or remove unwanted ones before creating.
          </Typography>

          {isLoadingSuggestions ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
              <CircularProgress size="lg" />
              <Typography level="body-md">Analyzing your company website to generate personas...</Typography>
              <Typography level="body-sm" color="neutral">This typically takes 30-60 seconds</Typography>
            </Box>
          ) : isCreatingPersonas ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
              <CircularProgress size="lg" />
              <Typography level="body-md">Creating {suggestedPersonas.filter(p => p.name.trim() && p.description.trim()).length} personas...</Typography>
              <Typography level="body-sm" color="neutral">Please wait while we create all personas in parallel</Typography>
            </Box>
          ) : suggestedPersonas.length === 0 ? (
            <Alert color="warning">
              <Typography level="body-sm">
                No personas were suggested. This might happen if your company website is not accessible or doesn't have enough content. Try creating personas manually instead.
              </Typography>
            </Alert>
          ) : (
            <Stack spacing={2}>
              <Table>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Name</th>
                    <th style={{ width: '60%' }}>Description</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestedPersonas.map((persona) => (
                    <tr key={persona.tempId}>
                      <td>
                        <Input
                          value={persona.name}
                          onChange={(e) => handleUpdateSuggestion(persona.tempId, 'name', e.target.value)}
                          placeholder="Enter persona name"
                          size="sm"
                        />
                      </td>
                      <td>
                        <Textarea
                          value={persona.description}
                          onChange={(e) => handleUpdateSuggestion(persona.tempId, 'description', e.target.value)}
                          placeholder="Enter persona description"
                          minRows={2}
                          maxRows={4}
                          size="sm"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <IconButton
                          size="sm"
                          color="danger"
                          variant="soft"
                          onClick={() => handleDeleteSuggestion(persona.tempId)}
                        >
                          <TrashIcon />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  startDecorator={<PlusIcon />}
                  onClick={handleAddNewSuggestion}
                >
                  Add New Suggestion
                </Button>
                <Button
                  variant="solid"
                  color="primary"
                  onClick={handleCreateAllPersonas}
                  disabled={suggestedPersonas.filter(p => p.name.trim() && p.description.trim()).length === 0}
                >
                  Create {suggestedPersonas.filter(p => p.name.trim() && p.description.trim()).length} Persona{suggestedPersonas.filter(p => p.name.trim() && p.description.trim()).length !== 1 ? 's' : ''}
                </Button>
              </Stack>
            </Stack>
          )}
        </ModalDialog>
      </Modal>
    </Box>
  );
}
