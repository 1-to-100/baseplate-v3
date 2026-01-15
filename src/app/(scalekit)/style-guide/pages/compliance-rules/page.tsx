'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Chip from '@mui/joy/Chip';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Textarea from '@mui/joy/Textarea';
import FormHelperText from '@mui/joy/FormHelperText';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { Breadcrumbs } from '@mui/joy';
import { Plus, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import {
  useComplianceRules,
  useCreateComplianceRule,
  useUpdateComplianceRule,
  useDeleteComplianceRule,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import { useActiveStyleGuide } from '@/app/(scalekit)/style-guide/lib/hooks';
import { useUserInfo } from '@/hooks/use-user-info';
import { useQuery } from '@tanstack/react-query';
import { getComplianceRuleTypeOptionItems } from '@/app/(scalekit)/style-guide/lib/api/option-items';
import CircularProgress from '@mui/joy/CircularProgress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createComplianceRulePayloadSchema } from '@/app/(scalekit)/style-guide/lib/types/validation';
import type { z } from 'zod';
import Alert from '@mui/joy/Alert';

type FormData = z.infer<typeof createComplianceRulePayloadSchema>;

const severityColors: Record<number, 'primary' | 'warning' | 'danger'> = {
  1: 'primary',
  2: 'warning',
  3: 'danger',
};

const severityLabels: Record<number, string> = {
  1: 'Info',
  2: 'Warning',
  3: 'Blocker',
};

export default function ComplianceRulesPage(): React.JSX.Element {
  const { userInfo, isUserLoading } = useUserInfo();
  const customerId = userInfo?.customerId || null;
  const [openModal, setOpenModal] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState<number | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);

  const { data: activeGuide, isLoading: isLoadingGuide } = useActiveStyleGuide(customerId || '');
  const styleGuideId = activeGuide?.style_guide_id || null;

  const { data: ruleTypes = [] } = useQuery({
    queryKey: ['compliance-rule-types'],
    queryFn: getComplianceRuleTypeOptionItems,
  });

  const { data: rulesData, isLoading: isLoadingRules } = useComplianceRules(
    styleGuideId
      ? { style_guide_id: styleGuideId, severity_level: severityFilter || undefined }
      : undefined
  );

  const isLoading = isUserLoading || isLoadingGuide || isLoadingRules;

  const createMutation = useCreateComplianceRule();
  const updateMutation = useUpdateComplianceRule();
  const deleteMutation = useDeleteComplianceRule();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(createComplianceRulePayloadSchema),
    defaultValues: {
      customer_id: customerId || '',
      style_guide_id: styleGuideId || '',
      name: '',
      compliance_rule_type_option_item_id: null,
      rule_replacement: '',
      severity_level: 1,
      is_blocking: false,
    },
  });

  React.useEffect(() => {
    if (customerId) {
      setValue('customer_id', customerId);
    }
    if (styleGuideId) {
      setValue('style_guide_id', styleGuideId);
    }
  }, [customerId, styleGuideId, setValue]);

  const handleOpenCreate = () => {
    setEditingRule(null);
    reset({
      customer_id: customerId || '',
      style_guide_id: styleGuideId || '',
      name: '',
      compliance_rule_type_option_item_id: null,
      rule_replacement: '',
      severity_level: 1,
      is_blocking: false,
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (ruleId: string) => {
    const rule = rulesData?.data.find((r) => r.compliance_rule_id === ruleId);
    if (rule) {
      setEditingRule(ruleId);
      reset({
        customer_id: customerId || '',
        style_guide_id: rule.style_guide_id || '',
        name: rule.rule_name || rule.name || '',
        compliance_rule_type_option_item_id: rule.compliance_rule_type_option_item_id || null,
        rule_replacement: rule.rule_replacement || '',
        severity_level: rule.severity_level || 1,
        is_blocking: rule.is_blocking || false,
      });
      setOpenModal(true);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingRule(null);
    reset();
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (editingRule) {
        await updateMutation.mutateAsync({
          compliance_rule_id: editingRule,
          ...data,
        });
      } else {
        // Ensure customer_id and name are set
        const createPayload = {
          ...data,
          customer_id: customerId || data.customer_id || '',
          name: data.name || '',
        };
        await createMutation.mutateAsync(createPayload);
      }
      handleCloseModal();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (window.confirm('Are you sure you want to delete this compliance rule?')) {
      await deleteMutation.mutateAsync(ruleId);
    }
  };

  let filteredRules = rulesData?.data || [];
  if (searchQuery) {
    filteredRules = filteredRules.filter((rule) =>
      (rule.rule_name || rule.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (typeFilter) {
    filteredRules = filteredRules.filter(
      (rule) => rule.compliance_rule_type_option_item_id === typeFilter
    );
  }

  if (!isLoading && (!customerId || !styleGuideId)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color='warning'>
          <Typography>
            Please create a style guide first before managing compliance rules.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Breadcrumbs */}
        <Breadcrumbs separator={<BreadcrumbsSeparator />}>
          <BreadcrumbsItem href='/style-guide/'>Style Guide</BreadcrumbsItem>
          <Typography>Compliance Rules</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Stack spacing={1}>
            <Typography level='h1'>Compliance Rules</Typography>
            <Typography level='body-md' color='neutral'>
              Create, edit, and classify rules that block or flag content during composition
            </Typography>
          </Stack>
          <Button
            startDecorator={<Plus />}
            onClick={handleOpenCreate}
            aria-label='Create compliance rule'
          >
            New Rule
          </Button>
        </Stack>

        {/* Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Input
            startDecorator={<MagnifyingGlass />}
            placeholder='Search rules...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1 }}
            aria-label='Search compliance rules'
          />
          <Select
            value={typeFilter || ''}
            onChange={(_event, value) => setTypeFilter(value || null)}
            placeholder='All Types'
            sx={{ minWidth: 150 }}
            aria-label='Filter by rule type'
          >
            <Option value=''>All Types</Option>
            {ruleTypes.map((type) => (
              <Option
                key={type.compliance_rule_type_option_item_id}
                value={type.compliance_rule_type_option_item_id}
              >
                {type.display_name}
              </Option>
            ))}
          </Select>
          <Stack direction='row' spacing={1}>
            {[1, 2, 3].map((severity) => (
              <Chip
                key={severity}
                variant={severityFilter === severity ? 'solid' : 'outlined'}
                color={severityColors[severity]}
                onClick={() => setSeverityFilter(severityFilter === severity ? null : severity)}
                role='button'
                aria-pressed={severityFilter === severity}
                aria-label={`Filter by ${severityLabels[severity]} severity`}
              >
                {severityLabels[severity]}
              </Chip>
            ))}
          </Stack>
        </Stack>

        {/* Table */}
        {isLoading || isLoadingRules ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table aria-label='Compliance rules table'>
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Replacement</th>
                  <th>Created</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                      <Typography level='body-md' color='neutral'>
                        {searchQuery || severityFilter || typeFilter
                          ? 'No rules match your filters'
                          : 'No compliance rules yet'}
                      </Typography>
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.compliance_rule_id}>
                      <td>
                        <Typography fontWeight='md'>
                          {rule.rule_name || rule.name || '—'}
                        </Typography>
                      </td>
                      <td>
                        <Typography level='body-sm'>
                          {String(
                            (rule.compliance_rule_type_option_item?.display_name as
                              | string
                              | undefined) || '—'
                          )}
                        </Typography>
                      </td>
                      <td>
                        <Chip
                          color={severityColors[rule.severity_level || 1]}
                          size='sm'
                          variant='soft'
                        >
                          {severityLabels[rule.severity_level || 1]}
                        </Chip>
                      </td>
                      <td>
                        <Typography
                          level='body-sm'
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {rule.rule_replacement || '—'}
                        </Typography>
                      </td>
                      <td>
                        <Typography level='body-sm'>
                          {new Date(rule.created_at).toLocaleDateString()}
                        </Typography>
                      </td>
                      <td>
                        <Stack direction='row' spacing={1}>
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='neutral'
                            onClick={() => handleOpenEdit(rule.compliance_rule_id)}
                            aria-label={`Edit ${rule.rule_name || rule.name || 'rule'}`}
                          >
                            <PencilSimple />
                          </IconButton>
                          <IconButton
                            size='sm'
                            variant='plain'
                            color='danger'
                            onClick={() => handleDelete(rule.compliance_rule_id)}
                            aria-label={`Delete ${rule.rule_name || rule.name || 'rule'}`}
                          >
                            <Trash />
                          </IconButton>
                        </Stack>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Box>
        )}
      </Stack>

      {/* Create/Edit Modal */}
      <Modal open={openModal} onClose={handleCloseModal}>
        <ModalDialog
          role='dialog'
          aria-modal='true'
          aria-labelledby='compliance-rule-modal-title'
          sx={{ minWidth: 600 }}
        >
          <ModalClose />
          <Typography id='compliance-rule-modal-title' level='h2'>
            {editingRule ? 'Edit Compliance Rule' : 'Create Compliance Rule'}
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl error={!!errors.name} required>
                <FormLabel>Rule Name *</FormLabel>
                <Input
                  {...register('name')}
                  placeholder='Enter rule name'
                  aria-label='Rule name'
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  aria-required='true'
                />
                {errors.name && (
                  <FormHelperText id='name-error'>{errors.name.message}</FormHelperText>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Rule Type</FormLabel>
                <Select
                  value={watch('compliance_rule_type_option_item_id') || ''}
                  onChange={(_event, value) =>
                    setValue('compliance_rule_type_option_item_id', value || null)
                  }
                  placeholder='Select rule type'
                  aria-label='Rule type'
                >
                  {ruleTypes.map((type) => (
                    <Option
                      key={type.compliance_rule_type_option_item_id}
                      value={type.compliance_rule_type_option_item_id}
                    >
                      {type.display_name}
                    </Option>
                  ))}
                </Select>
              </FormControl>

              <Stack direction='row' spacing={2}>
                <FormControl sx={{ flex: 1 }}>
                  <FormLabel>Severity</FormLabel>
                  <Select
                    value={watch('severity_level')?.toString() || '1'}
                    onChange={(_event, value) =>
                      setValue('severity_level', parseInt(value || '1', 10))
                    }
                    aria-label='Severity level'
                  >
                    <Option value='1'>Info</Option>
                    <Option value='2'>Warning</Option>
                    <Option value='3'>Blocker</Option>
                  </Select>
                </FormControl>
              </Stack>

              <FormControl>
                <FormLabel>Suggested Replacement</FormLabel>
                <Textarea
                  {...register('rule_replacement')}
                  placeholder='Enter suggested replacement text or strategy'
                  minRows={3}
                  aria-label='Suggested replacement'
                />
              </FormControl>

              <Stack direction='row' spacing={2} sx={{ justifyContent: 'flex-end' }}>
                <Button variant='outlined' onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  type='submit'
                  loading={isSubmitting || createMutation.isPending || updateMutation.isPending}
                >
                  {editingRule ? 'Update' : 'Create'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
