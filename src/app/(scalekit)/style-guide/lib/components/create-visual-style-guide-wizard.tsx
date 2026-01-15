'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import Card from '@mui/joy/Card';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import CircularProgress from '@mui/joy/CircularProgress';
import Radio from '@mui/joy/Radio';
import RadioGroup from '@mui/joy/RadioGroup';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Input from '@mui/joy/Input';
import Alert from '@mui/joy/Alert';
import {
  MagicWand as MagicWandIcon,
  Plus as PlusIcon,
  Sparkle as SparkleIcon,
} from '@phosphor-icons/react/dist/ssr';
import {
  useCreateVisualStyleGuide,
  useTypographyStyleOptions,
  useLogoTypeOptions,
  useCreateLogoAsset,
  useCreatePaletteColor,
  useCreateTypographyStyle,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import { COLOR_USAGE_OPTION } from '@/app/(scalekit)/style-guide/lib/constants/palette-colors';
import {
  getDefaultFontSize,
  getDefaultFontWeight,
  getDefaultLineHeight,
} from '@/app/(scalekit)/style-guide/lib/constants/typography';
import { paths } from '@/paths';
import { toast } from '@/components/core/toaster';
import { useUserInfo } from '@/hooks/use-user-info';
import { useQuery } from '@tanstack/react-query';
import { getCustomerById } from '@/lib/api/customers';
import { createClient } from '@/lib/supabase/client';

type WizardStep = 'select-method' | 'crawling' | 'creating';

export function CreateVisualStyleGuideWizard(): React.JSX.Element {
  const router = useRouter();
  const { userInfo } = useUserInfo();
  const createGuide = useCreateVisualStyleGuide();
  const createLogoAsset = useCreateLogoAsset();
  const createPaletteColor = useCreatePaletteColor();
  const createTypographyStyle = useCreateTypographyStyle();
  const { data: typographyOptions } = useTypographyStyleOptions();
  const { data: logoTypeOptions } = useLogoTypeOptions();

  // Fetch customer information
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', userInfo?.customerId],
    queryFn: () => {
      if (!userInfo?.customerId) throw new Error('Customer ID is required');
      return getCustomerById(userInfo.customerId);
    },
    enabled: !!userInfo?.customerId,
  });

  // Fetch email_domain directly from Supabase
  const { data: customerData } = useQuery({
    queryKey: ['customer-email-domain', userInfo?.customerId],
    queryFn: async () => {
      if (!userInfo?.customerId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('customers')
        .select('email_domain, name')
        .eq('customer_id', userInfo.customerId)
        .single();

      if (error) {
        console.error('Error fetching customer email domain:', error);
        return null;
      }
      return data;
    },
    enabled: !!userInfo?.customerId,
  });

  // Generate default name from customer name
  const defaultName = React.useMemo(() => {
    if (customer?.name) {
      return `${customer.name} Visual Style Guide`;
    }
    if (customerData?.name) {
      return `${customerData.name} Visual Style Guide`;
    }
    return 'Visual Style Guide';
  }, [customer?.name, customerData?.name]);

  const [step, setStep] = React.useState<WizardStep>('select-method');
  const [method, setMethod] = React.useState<'scan' | 'blank' | 'default'>('scan');
  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  // Pre-populate name when customer data is loaded
  React.useEffect(() => {
    if (customer?.name && !name) {
      setName(defaultName);
    }
  }, [customer?.name, defaultName, name]);

  // Pre-populate URL based on customer email_domain
  React.useEffect(() => {
    if (customerData?.email_domain && !url) {
      setUrl(`https://www.${customerData.email_domain}`);
    }
  }, [customerData?.email_domain, url]);

  const handleMethodSelect = React.useCallback((selectedMethod: 'scan' | 'blank' | 'default') => {
    setMethod(selectedMethod);
  }, []);

  const handleScanUrl = React.useCallback(async () => {
    if (!url || !userInfo?.customerId) {
      toast.error('Please enter a URL to scan');
      return;
    }

    if (!name.trim()) {
      toast.error('Please enter a name for the style guide');
      return;
    }

    setStep('crawling');
    setProgress(0);

    try {
      const supabase = createClient();

      // Step 1: Create empty visual style guide
      console.log('Creating empty visual style guide...');
      const { data: guideData, error: guideError } = await supabase
        .from('visual_style_guides')
        .insert({
          customer_id: userInfo.customerId,
          name: name.trim(),
          description: `Visual style guide for ${name.trim()}`,
          imagery_guidelines: 'Analyzing website for imagery guidelines...',
        })
        .select('visual_style_guide_id')
        .single();

      if (guideError || !guideData) {
        throw new Error(
          'Failed to create visual style guide: ' + (guideError?.message || 'Unknown error')
        );
      }

      const visualStyleGuideId = guideData.visual_style_guide_id;
      console.log('Created visual style guide:', visualStyleGuideId);
      setProgress(20);

      // Step 2: Call all three extraction functions in parallel
      console.log('Starting parallel extraction...');
      const requestBody = {
        visual_style_guide_id: visualStyleGuideId,
        starting_url: url,
      };

      const [fontsResult, colorsResult, logosResult] = await Promise.allSettled([
        supabase.functions.invoke('extract-fonts', { body: requestBody }),
        supabase.functions.invoke('extract-colors', { body: requestBody }),
        supabase.functions.invoke('extract-logos', { body: requestBody }),
      ]);

      setProgress(100);

      // Check results
      const errors: string[] = [];

      if (fontsResult.status === 'rejected' || fontsResult.value?.error) {
        const error =
          fontsResult.status === 'rejected' ? fontsResult.reason : fontsResult.value.error;
        errors.push(`Fonts extraction failed: ${error?.message || 'Unknown error'}`);
        console.error('Fonts extraction error:', error);
      } else {
        console.log('✓ Fonts extracted successfully');
      }

      if (colorsResult.status === 'rejected' || colorsResult.value?.error) {
        const error =
          colorsResult.status === 'rejected' ? colorsResult.reason : colorsResult.value.error;
        errors.push(`Colors extraction failed: ${error?.message || 'Unknown error'}`);
        console.error('Colors extraction error:', error);
      } else {
        console.log('✓ Colors extracted successfully');
      }

      if (logosResult.status === 'rejected' || logosResult.value?.error) {
        const error =
          logosResult.status === 'rejected' ? logosResult.reason : logosResult.value.error;
        errors.push(`Logos extraction failed: ${error?.message || 'Unknown error'}`);
        console.error('Logos extraction error:', error);
      } else {
        console.log('✓ Logos extracted successfully');
      }

      if (errors.length > 0) {
        console.warn('Some extractions failed:', errors);
        toast.warning(
          `Visual style guide created, but some extractions failed. Check the guide for details.`
        );
      } else {
        toast.success('Visual style guide created and analyzed successfully!');
      }

      // Navigate to the created guide
      router.push(paths.dashboard.visualOs.overview(visualStyleGuideId));
    } catch (error) {
      console.error('Error in scan process:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to scan website');
      setStep('select-method');
      setProgress(0);
    }
  }, [url, name, userInfo?.customerId, router]);

  const handleCreateGuide = React.useCallback(
    async (isFromScan = false) => {
      if (!name.trim()) {
        toast.error('Please enter a name for the style guide');
        return;
      }

      setIsCreating(true);
      setStep('creating');

      try {
        // Create the visual style guide
        const guideData = await createGuide.mutateAsync({
          name: name.trim(),
          description: null,
          default_logo_asset_id: null,
          imagery_guidelines: null,
        });

        if (!guideData || !guideData.visual_style_guide_id) {
          throw new Error('Failed to create guide');
        }

        const guideId = guideData.visual_style_guide_id;

        // For blank or default guides, create initial assets
        if (method === 'default') {
          // Create logo asset entries for each logo type
          if (logoTypeOptions && logoTypeOptions.length > 0) {
            for (const logoType of logoTypeOptions) {
              try {
                await createLogoAsset.mutateAsync({
                  visual_style_guide_id: guideId,
                  logo_type_option_id: logoType.logo_type_option_id,
                  is_default: false,
                  is_vector: false,
                  is_circular_crop: false,
                  circular_safe_area: null,
                  width: null,
                  height: null,
                  svg_text: null,
                  file_blob: null,
                  storage_path: null,
                  file_url: null,
                  created_by_user_id: null,
                });
              } catch (error) {
                console.warn(`Failed to create logo asset for ${logoType.display_name}:`, error);
              }
            }
          }

          // Create typography style entries for each typography option
          if (typographyOptions && typographyOptions.length > 0) {
            const defaultFontFamily = method === 'default' ? 'Inter' : '';
            for (const typographyOption of typographyOptions) {
              try {
                await createTypographyStyle.mutateAsync({
                  visual_style_guide_id: guideId,
                  typography_style_option_id: typographyOption.typography_style_option_id,
                  font_option_id: null,
                  font_family: defaultFontFamily,
                  font_fallbacks: null,
                  font_size_px:
                    method === 'default'
                      ? getDefaultFontSize(String(typographyOption.programmatic_name || ''))
                      : 16,
                  line_height:
                    method === 'default'
                      ? getDefaultLineHeight(String(typographyOption.programmatic_name || ''))
                      : null,
                  font_weight:
                    method === 'default'
                      ? getDefaultFontWeight(String(typographyOption.programmatic_name || ''))
                      : null,
                  color: null,
                  css_snippet: null,
                  licensing_notes: null,
                  created_by_user_id: null,
                });
              } catch (error) {
                console.warn(
                  `Failed to create typography style for ${typographyOption.display_name}:`,
                  error
                );
              }
            }
          }

          // Create default palette colors
          const defaultColors = [
            {
              hex: method === 'default' ? '#000000' : '#000000',
              name: 'Foreground Text',
              usage: COLOR_USAGE_OPTION.FOREGROUND,
              sort_order: 1,
            },
            {
              hex: method === 'default' ? '#FFFFFF' : '#FFFFFF',
              name: 'Background',
              usage: COLOR_USAGE_OPTION.BACKGROUND,
              sort_order: 2,
            },
            {
              hex: method === 'default' ? '#1976D2' : '#0000FF',
              name: 'Primary',
              usage: COLOR_USAGE_OPTION.PRIMARY,
              sort_order: 3,
            },
            {
              hex: method === 'default' ? '#757575' : '#666666',
              name: 'Secondary',
              usage: COLOR_USAGE_OPTION.SECONDARY,
              sort_order: 4,
            },
          ];

          for (const color of defaultColors) {
            try {
              await createPaletteColor.mutateAsync({
                hex: color.hex,
                name: color.name,
                usage_option: color.usage,
                sort_order: color.sort_order,
                contrast_ratio_against_background: null,
                style_guide_id: guideId,
              });
            } catch (error) {
              console.warn(`Failed to create palette color ${color.name}:`, error);
            }
          }
        }

        toast.success('Visual style guide created successfully');
        router.push(paths.dashboard.visualOs.overview(guideId || ''));
      } catch (error) {
        console.error('Error creating guide:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create visual style guide');
        setStep('select-method');
      } finally {
        setIsCreating(false);
      }
    },
    [
      name,
      method,
      createGuide,
      logoTypeOptions,
      typographyOptions,
      router,
      createLogoAsset,
      createPaletteColor,
      createTypographyStyle,
    ]
  );

  if (step === 'crawling' || step === 'creating') {
    return (
      <Card sx={{ p: 4 }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <CircularProgress
            determinate={step === 'crawling'}
            value={progress}
            size='lg'
            aria-label={step === 'crawling' ? 'Extracting website data' : 'Creating style guide'}
          />
          <Typography level='title-lg'>
            {step === 'crawling'
              ? 'Scanning website and extracting brand identity...'
              : 'Creating visual style guide...'}
          </Typography>
          {step === 'crawling' && (
            <Typography level='body-sm' color='neutral'>
              This may take a few moments
            </Typography>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 4 }}>
      <Stack spacing={4}>
        <Stack spacing={2}>
          <Typography level='title-lg'>Choose a creation method</Typography>
          <Typography level='body-sm' color='neutral'>
            Select how you&apos;d like to create your visual style guide
          </Typography>
        </Stack>

        <RadioGroup
          value={method}
          onChange={(e) => handleMethodSelect(e.target.value as 'scan' | 'blank' | 'default')}
        >
          <FormControl>
            <Radio value='scan' label='Scan your site' />
            <FormHelperText>
              We&apos;ll crawl the website and use AI to extract logos, colors, and typography
            </FormHelperText>
          </FormControl>
          <FormControl>
            <Radio value='blank' label='Start with blank guide' />
            <FormHelperText>
              Create an empty guide and manually add all assets and settings
            </FormHelperText>
          </FormControl>
          <FormControl>
            <Radio value='default' label='Start with default guide' />
            <FormHelperText>
              Create a guide with pre-populated default values that you can customize
            </FormHelperText>
          </FormControl>
        </RadioGroup>

        {method === 'scan' && (
          <FormControl>
            <FormLabel>Website URL</FormLabel>
            <Input
              placeholder='https://example.com'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              startDecorator={<MagicWandIcon />}
            />
          </FormControl>
        )}

        <FormControl>
          <FormLabel>Style Guide Name *</FormLabel>
          <Input
            placeholder={isLoadingCustomer ? 'Loading...' : defaultName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoadingCustomer}
          />
        </FormControl>

        <Stack direction='row' spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button variant='outlined' onClick={() => router.back()} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={() => (method === 'scan' ? handleScanUrl() : handleCreateGuide())}
            disabled={isCreating || !name.trim() || (method === 'scan' && !url.trim())}
            loading={isCreating}
          >
            {method === 'scan' ? 'Scan & Create' : 'Create Guide'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
