'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import FormHelperText from '@mui/joy/FormHelperText';
import { updateCompany } from '@/app/(scalekit)/strategy-forge/lib/api/companies';
import type {
  CompanyItem,
  UpdateCompanyPayload,
} from '@/app/(scalekit)/strategy-forge/lib/types/company';
import { toast } from '@/components/core/toaster';

interface HttpError {
  response?: { data?: { message?: string } };
}

interface EditCompanyModalProps {
  open: boolean;
  onClose: () => void;
  company: CompanyItem | null;
  onSuccess?: (companyId: number) => void;
}

interface FormErrors {
  name?: string;
  phone?: string;
  revenue?: string;
  employees?: string;
  industry?: string;
  email?: string;
  location?: string;
}

export default function EditCompanyModal({
  open,
  onClose,
  company,
  onSuccess,
}: EditCompanyModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    revenue: number | string;
    employees: string;
    industry: string;
    email: string;
    location: string;
    address: string;
  }>({
    name: '',
    phone: '',
    revenue: 0,
    employees: '',
    industry: '',
    email: '',
    location: '',
    address: '',
  });
  const [errors, setErrors] = useState<FormErrors | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (company && open) {
      setFormData({
        name: company.name || '',
        phone: company.phone || '',
        revenue: company.revenue || 0,
        employees: company.employees?.toString() || '',
        industry: company.categories?.[0] || '',
        email: company.email || '',
        location: company.region || company.country || '',
        address: company.address || '',
      });
      setErrors(null);
    }
  }, [company, open]);

  const updateCompanyMutation = useMutation({
    mutationFn: ({ company_id, payload }: { company_id: string; payload: UpdateCompanyPayload }) =>
      updateCompany(company_id, payload),
    onSuccess: (_, { company_id }) => {
      queryClient.invalidateQueries({
        queryKey: ['companies'],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ['company', company_id] });
      queryClient.invalidateQueries({
        queryKey: ['segment-companies'],
        exact: false,
      });

      if (onSuccess && company) {
        onSuccess(company.id);
      }

      onClose();
      toast.success('Company updated successfully.');
    },
    onError: (error: HttpError) => {
      const errorMessage = error.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error('An error occurred while updating the company.');
      }
    },
  });

  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.revenue && isNaN(Number(formData.revenue))) {
      newErrors.revenue = 'Revenue must be a valid number';
    }

    if (formData.employees && isNaN(Number(formData.employees))) {
      newErrors.employees = 'Number of employees must be a valid number';
    }

    return newErrors;
  }, [formData]);

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev ? { ...prev, [field]: undefined } : null));
  }, []);

  const handleSave = useCallback(async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    const companyId = company?.company_id;
    if (Object.keys(validationErrors).length === 0 && company && companyId) {
      const revenueNumber = Number(formData.revenue);
      const payload: UpdateCompanyPayload = {
        name: formData.name,
        revenue: revenueNumber !== 0 && !Number.isNaN(revenueNumber) ? revenueNumber : undefined,
        employees: formData.employees ? Number(formData.employees) : undefined,
        categories: formData.industry ? [formData.industry] : undefined,
        address: formData.address || formData.location || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        region: formData.location || undefined,
      };

      updateCompanyMutation.mutate({
        company_id: companyId,
        payload,
      });
    } else if (company && !companyId) {
      toast.error('Company identifier is missing. Cannot update.');
    }
  }, [formData, company, updateCompanyMutation, validateForm]);

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        sx={{
          width: { xs: '90%', sm: 700 },
          maxWidth: '100%',
          p: { xs: 2, sm: 3 },
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <ModalClose sx={{ color: '#6B7280' }} />
        <Typography
          level='h3'
          sx={{
            fontSize: { xs: '20px', sm: '22px', md: '24px' },
            fontWeight: 600,
            color: 'var(--joy-palette-text-primary)',
            mb: { xs: 1.5, sm: 2 },
          }}
        >
          Edit Company
        </Typography>
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          {/* Two Column Layout */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }}>
            {/* Left Column */}
            <Stack sx={{ flex: 1 }} spacing={{ xs: 1.5, sm: 2 }}>
              {/* Company Name */}
              <Stack>
                <Typography
                  level='body-sm'
                  sx={{
                    fontSize: { xs: '12px', sm: '14px' },
                    color: 'var(--joy-palette-text-primary)',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Company Name
                </Typography>
                <Input
                  placeholder='Enter company name'
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!errors?.name}
                  slotProps={{ input: { maxLength: 255 } }}
                  sx={{
                    borderRadius: '6px',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                />
                {errors?.name && (
                  <FormHelperText
                    sx={{
                      color: 'var(--joy-palette-danger-500)',
                      fontSize: { xs: '10px', sm: '12px' },
                    }}
                  >
                    {errors.name}
                  </FormHelperText>
                )}
              </Stack>

              {/* Phone Number */}
              <Stack>
                <Typography
                  level='body-sm'
                  sx={{
                    fontSize: { xs: '12px', sm: '14px' },
                    color: 'var(--joy-palette-text-primary)',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Phone Number
                </Typography>
                <Input
                  placeholder='Enter phone number'
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  sx={{
                    borderRadius: '6px',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                />
              </Stack>

              {/* Annual Revenue */}
              <Stack>
                <Typography
                  level='body-sm'
                  sx={{
                    fontSize: { xs: '12px', sm: '14px' },
                    color: 'var(--joy-palette-text-primary)',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Annual Revenue
                </Typography>
                <Input
                  placeholder='Enter annual revenue'
                  value={formData.revenue}
                  onChange={(e) => handleInputChange('revenue', e.target.value)}
                  error={!!errors?.revenue}
                  sx={{
                    borderRadius: '6px',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                />
                {errors?.revenue && (
                  <FormHelperText
                    sx={{
                      color: 'var(--joy-palette-danger-500)',
                      fontSize: { xs: '10px', sm: '12px' },
                    }}
                  >
                    {errors.revenue}
                  </FormHelperText>
                )}
              </Stack>

              {/* Number of Employees */}
              <Stack>
                <Typography
                  level='body-sm'
                  sx={{
                    fontSize: { xs: '12px', sm: '14px' },
                    color: 'var(--joy-palette-text-primary)',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Number of Employees
                </Typography>
                <Input
                  placeholder='Enter number of employees'
                  value={formData.employees}
                  onChange={(e) => handleInputChange('employees', e.target.value)}
                  error={!!errors?.employees}
                  sx={{
                    borderRadius: '6px',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                />
                {errors?.employees && (
                  <FormHelperText
                    sx={{
                      color: 'var(--joy-palette-danger-500)',
                      fontSize: { xs: '10px', sm: '12px' },
                    }}
                  >
                    {errors.employees}
                  </FormHelperText>
                )}
              </Stack>
            </Stack>

            {/* Right Column */}
            <Stack sx={{ flex: 1 }} spacing={{ xs: 1.5, sm: 2 }}>
              {/* Industry */}
              <Stack>
                <Typography
                  level='body-sm'
                  sx={{
                    fontSize: { xs: '12px', sm: '14px' },
                    color: 'var(--joy-palette-text-primary)',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Industry
                </Typography>
                <Input
                  disabled
                  placeholder='Enter industry'
                  value={formData.industry}
                  readOnly
                  slotProps={{ input: { maxLength: 255 } }}
                  sx={{
                    borderRadius: '6px',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                />
              </Stack>

              {/* Email */}
              <Stack>
                <Typography
                  level='body-sm'
                  sx={{
                    fontSize: { xs: '12px', sm: '14px' },
                    color: 'var(--joy-palette-text-primary)',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Email
                </Typography>
                <Input
                  placeholder='Enter email'
                  type='email'
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={!!errors?.email}
                  sx={{
                    borderRadius: '6px',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                />
                {errors?.email && (
                  <FormHelperText
                    sx={{
                      color: 'var(--joy-palette-danger-500)',
                      fontSize: { xs: '10px', sm: '12px' },
                    }}
                  >
                    {errors.email}
                  </FormHelperText>
                )}
              </Stack>

              {/* Location */}
              <Stack>
                <Typography
                  level='body-sm'
                  sx={{
                    fontSize: { xs: '12px', sm: '14px' },
                    color: 'var(--joy-palette-text-primary)',
                    mb: 0.5,
                    fontWeight: 500,
                  }}
                >
                  Location
                </Typography>
                <Input
                  placeholder='Enter location'
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  sx={{
                    borderRadius: '6px',
                    fontSize: { xs: '12px', sm: '14px' },
                  }}
                />
              </Stack>
            </Stack>
          </Stack>

          {/* Action Buttons */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 2 }}
            justifyContent='flex-end'
          >
            <Button
              variant='outlined'
              onClick={onClose}
              sx={{
                fontSize: { xs: '12px', sm: '14px' },
                px: { xs: 2, sm: 3 },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Cancel
            </Button>
            <Button
              variant='solid'
              onClick={handleSave}
              disabled={updateCompanyMutation.isPending}
              sx={{
                borderRadius: '20px',
                bgcolor: '#4F46E5',
                color: '#FFFFFF',
                fontWeight: 500,
                fontSize: { xs: '12px', sm: '14px' },
                px: { xs: 2, sm: 3 },
                py: 1,
                '&:hover': { bgcolor: '#4338CA' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
