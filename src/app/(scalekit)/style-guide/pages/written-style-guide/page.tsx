'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Stack from '@mui/joy/Stack';
import Card from '@mui/joy/Card';
import { BreadcrumbsItem } from '@/components/core/breadcrumbs-item';
import { BreadcrumbsSeparator } from '@/components/core/breadcrumbs-separator';
import { Breadcrumbs } from '@mui/joy';
import { useActiveStyleGuide, useStyleGuide } from '@/app/(scalekit)/style-guide/lib/hooks';
import { useUserInfo } from '@/hooks/use-user-info';
import CircularProgress from '@mui/joy/CircularProgress';
import { StyleGuideEditor } from '@/app/(scalekit)/style-guide/lib/components/style-guide-editor/style-guide-editor';
import Alert from '@mui/joy/Alert';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import { MagicWand } from '@phosphor-icons/react/dist/ssr';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/core/toaster';

/**
 * Style Guide Editor Page
 * Primary authoring form for creating or editing a company's machine-readable style guide
 */
export default function StyleGuideEditorPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const styleGuideId = searchParams.get('id');
  const { userInfo, isUserLoading } = useUserInfo();

  const customerId = userInfo?.customerId || null;

  // Fetch active style guide if no ID provided
  const {
    data: activeGuide,
    isLoading: isLoadingActive,
    refetch: refetchActiveGuide,
  } = useActiveStyleGuide(styleGuideId ? null : customerId || null);

  // Fetch specific style guide if ID provided
  const { data: specificGuide, isLoading: isLoadingSpecific } = useStyleGuide(styleGuideId || null);

  // Track if we're generating a new style guide
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [hasTriggeredGeneration, setHasTriggeredGeneration] = React.useState(false);
  const [websiteUrl, setWebsiteUrl] = React.useState<string>('');
  const [showUrlPrompt, setShowUrlPrompt] = React.useState(false);
  const [isCheckingUrl, setIsCheckingUrl] = React.useState(false);

  // Fetch customer data to get email_domain
  const [customerEmailDomain, setCustomerEmailDomain] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchCustomerData = async () => {
      if (!customerId) return;

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('customers')
          .select('email_domain')
          .eq('customer_id', customerId)
          .single();

        if (error) {
          console.error('Error fetching customer:', error);
          return;
        }

        if (data?.email_domain) {
          setCustomerEmailDomain(data.email_domain);

          // Check both https and http to determine which works
          const domain = data.email_domain;
          const httpsUrl = `https://www.${domain}`;
          const httpUrl = `http://www.${domain}`;

          setIsCheckingUrl(true);

          try {
            // Try https first
            const httpsResponse = await fetch(httpsUrl, { method: 'HEAD', mode: 'no-cors' });
            setWebsiteUrl(httpsUrl);
            console.log('Using HTTPS for domain:', domain);
          } catch {
            // If https fails, try http
            try {
              const httpResponse = await fetch(httpUrl, { method: 'HEAD', mode: 'no-cors' });
              setWebsiteUrl(httpUrl);
              console.log('Using HTTP for domain:', domain);
            } catch {
              // If both fail, default to https
              setWebsiteUrl(httpsUrl);
              console.log('Both protocols failed, defaulting to HTTPS for domain:', domain);
            }
          }

          setIsCheckingUrl(false);
        }
      } catch (err) {
        console.error('Exception fetching customer data:', err);
        setIsCheckingUrl(false);
      }
    };

    fetchCustomerData();
  }, [customerId]);

  const handleGenerateStyleGuide = async () => {
    if (!websiteUrl) {
      toast.error('Please enter a website URL');
      return;
    }

    // Validate URL format
    try {
      new URL(websiteUrl);
    } catch {
      toast.error('Please enter a valid URL (e.g., https://www.example.com)');
      return;
    }

    setHasTriggeredGeneration(true);
    setIsGenerating(true);
    setShowUrlPrompt(false);

    try {
      console.log('Generating style guide for URL:', websiteUrl);
      const supabase = createClient();

      if (!customerId) {
        toast.error('Customer ID is required to generate a style guide');
        setIsGenerating(false);
        setHasTriggeredGeneration(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        'create-initial-written-style-guide-for-customer-id',
        {
          body: {
            customer_id: customerId,
            url: websiteUrl,
          },
        }
      );

      if (error) {
        console.error('Error generating style guide:', error);
        toast.error(`Failed to generate style guide: ${error.message}`);
        setIsGenerating(false);
        setHasTriggeredGeneration(false);
        return;
      }

      console.log('Style guide generated successfully:', data);
      toast.success('Style guide generated successfully!');

      // Refetch the active guide
      await refetchActiveGuide();
      setIsGenerating(false);
    } catch (err) {
      console.error('Exception generating style guide:', err);
      toast.error('An unexpected error occurred while generating the style guide');
      setIsGenerating(false);
      setHasTriggeredGeneration(false);
    }
  };

  const isLoading = isUserLoading || isLoadingActive || isLoadingSpecific;

  // Determine which guide to edit
  const guideToEdit = styleGuideId ? specificGuide : activeGuide;

  // Show URL prompt when no style guide exists
  React.useEffect(() => {
    if (
      !isLoading &&
      !guideToEdit &&
      customerId &&
      !hasTriggeredGeneration &&
      !isGenerating &&
      !showUrlPrompt
    ) {
      setShowUrlPrompt(true);
    }
  }, [isLoading, guideToEdit, customerId, hasTriggeredGeneration, isGenerating, showUrlPrompt]);

  if (!isLoading && !customerId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color='warning'>
          <Typography>
            Customer ID not found. Please ensure you are associated with a customer.
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
          <Typography>Edit Style Guide</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Stack spacing={1}>
          <Typography level='h1'>Edit Style Guide</Typography>
          <Typography level='body-md' color='neutral'>
            Define brand personality, voice, vocabulary constraints, and the LLM prompt template
          </Typography>
        </Stack>

        {/* Main Content */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : isGenerating ? (
          // Generating state - analyzing website
          <Card variant='outlined' sx={{ p: 6 }}>
            <Stack spacing={3} alignItems='center'>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'primary.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MagicWand size={40} weight='duotone' color='var(--joy-palette-primary-500)' />
              </Box>
              <Stack spacing={1} alignItems='center'>
                <Typography level='h3' textAlign='center'>
                  Analyzing Your Website
                </Typography>
                <Typography
                  level='body-md'
                  textAlign='center'
                  color='neutral'
                  sx={{ maxWidth: 500 }}
                >
                  We&apos;re currently reviewing your website and setting up your style guide. This
                  may take 30-60 seconds as we analyze multiple pages.
                </Typography>
                <Typography
                  level='body-sm'
                  textAlign='center'
                  color='neutral'
                  sx={{ maxWidth: 500, mt: 1 }}
                >
                  Analyzing: <strong>{websiteUrl}</strong>
                </Typography>
              </Stack>
              <CircularProgress size='lg' />
            </Stack>
          </Card>
        ) : guideToEdit && customerId && guideToEdit.style_guide_id ? (
          <StyleGuideEditor
            styleGuideId={guideToEdit.style_guide_id}
            initialData={guideToEdit}
            customerId={customerId}
          />
        ) : (
          // Empty state - prompt for URL
          <Card variant='outlined' sx={{ p: 6 }}>
            <Stack spacing={3} alignItems='center'>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'primary.50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MagicWand size={40} weight='duotone' color='var(--joy-palette-primary-500)' />
              </Box>
              <Stack spacing={1} alignItems='center' sx={{ maxWidth: 500 }}>
                <Typography level='h3' textAlign='center'>
                  Create Your Style Guide
                </Typography>
                <Typography level='body-md' textAlign='center' color='neutral'>
                  Enter your company website URL and we&apos;ll analyze it to create a comprehensive
                  style guide. Our AI will spider up to 10 pages to understand your writing style
                  and tone.
                </Typography>
              </Stack>

              <Stack spacing={2} sx={{ width: '100%', maxWidth: 500 }}>
                <FormControl>
                  <FormLabel>Company Website URL</FormLabel>
                  <Input
                    placeholder='https://www.example.com'
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    size='lg'
                    type='url'
                    disabled={isCheckingUrl}
                    endDecorator={isCheckingUrl ? <CircularProgress size='sm' /> : null}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isCheckingUrl) {
                        handleGenerateStyleGuide();
                      }
                    }}
                  />
                  <FormHelperText>
                    {customerEmailDomain
                      ? `Pre-filled from your email domain: ${customerEmailDomain}`
                      : "We'll analyze your website content to create personalized style guide recommendations"}
                  </FormHelperText>
                </FormControl>

                <Button
                  size='lg'
                  startDecorator={<MagicWand />}
                  onClick={handleGenerateStyleGuide}
                  disabled={!websiteUrl || isCheckingUrl}
                  loading={isCheckingUrl}
                >
                  Analyze Website & Generate Style Guide
                </Button>
              </Stack>
            </Stack>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
