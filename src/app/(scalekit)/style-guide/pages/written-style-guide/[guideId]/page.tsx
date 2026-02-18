'use client';

import {
  useStyleGuide,
  useFramingConcepts,
  useVocabularyEntries,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import { toast } from '@/components/core/toaster';
import { Grid, Sheet } from '@mui/joy';
import Alert from '@mui/joy/Alert';
import Box from '@mui/joy/Box';
import CircularProgress from '@mui/joy/CircularProgress';
import Stack from '@mui/joy/Stack';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserInfo } from '@/hooks/use-user-info';
import { isCustomerAdminOrManager, isSystemAdministrator } from '@/lib/user-utils';
import WrittenStyleGuideHeader from './components/written-style-guide-header';
import WrittenStyleGuideBreadcrumbs from './components/written-style-guide-breadcrumbs';
import WrittenStyleGuideSummary from './components/written-style-guide-summary';
import WrittenStyleGuideEditor from './components/written-style-guide-editor';
import WrittenStyleGuideActivityTracker from './components/written-style-guide-activity-tracker';

export default function WrittenStyleGuideOverviewPage(): React.JSX.Element {
  const params = useParams();
  const guideId = params?.guideId as string;
  const { userInfo, isUserLoading } = useUserInfo();

  const [isEditableView, setIsEditableView] = React.useState<boolean>(false);
  const [isReanalyzing, setIsReanalyzing] = React.useState<boolean>(false);

  const canEditStyleGuide = isSystemAdministrator(userInfo) || isCustomerAdminOrManager(userInfo);

  const { data: guide, isLoading, refetch } = useStyleGuide(guideId);
  const {
    data: framingConceptsData,
    isLoading: framingConceptsLoading,
    refetch: refetchFramingConcepts,
  } = useFramingConcepts({
    style_guide_id: guideId,
  });
  const {
    data: vocabularyData,
    isLoading: vocabularyLoading,
    refetch: refetchVocabulary,
  } = useVocabularyEntries({
    style_guide_id: guideId,
  });

  const framingConcepts = framingConceptsData?.data || [];
  const vocabularyEntries = vocabularyData?.data || [];

  const preferredVocabulary = vocabularyEntries.filter((v) => v.vocabulary_type === 'preferred');
  const prohibitedVocabulary = vocabularyEntries.filter((v) => v.vocabulary_type === 'prohibited');

  const handlePublish = React.useCallback(() => {
    toast.info('Publish functionality coming soon');
  }, []);

  const handleReanalyze = React.useCallback(async () => {
    if (!guide || !guide.customer_id) {
      toast.error('Unable to reanalyze: guide data not available');
      return;
    }

    setIsReanalyzing(true);

    try {
      const supabase = createClient();

      // Get customer email_domain to build URL
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email_domain, name')
        .eq('customer_id', guide.customer_id)
        .single();

      if (customerError || !customerData?.email_domain) {
        throw new Error('Failed to get customer email domain');
      }

      const url = `https://www.${customerData.email_domain}`;

      // Delete existing framing concepts and vocabulary entries
      console.log('Clearing existing style guide related data...');
      const [conceptsDelete, vocabularyDelete] = await Promise.all([
        supabase.from('framing_concepts').delete().eq('style_guide_id', guideId),
        supabase.from('vocabulary_entries').delete().eq('style_guide_id', guideId),
      ]);

      if (conceptsDelete.error || vocabularyDelete.error) {
        console.warn('Some deletions failed, continuing anyway...');
      }

      // Call the edge function to regenerate
      const { data, error } = await supabase.functions.invoke(
        'create-initial-written-style-guide-for-customer-id',
        {
          body: {
            customer_id: guide.customer_id,
            url: url,
            style_guide_id: guideId,
          },
        }
      );

      if (error) {
        console.error('Error reanalyzing style guide:', error);
        toast.error(`Failed to reanalyze: ${error.message}`);
        setIsReanalyzing(false);
        return;
      }

      toast.success('Style guide reanalyzed successfully!');
      await Promise.all([refetch(), refetchFramingConcepts(), refetchVocabulary()]);
    } catch (error) {
      console.error('Error reanalyzing style guide:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reanalyze style guide');
    } finally {
      setIsReanalyzing(false);
    }
  }, [guide, guideId, refetch]);

  if (isLoading || isUserLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!guide) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert color='danger'>Style guide not found</Alert>
      </Box>
    );
  }

  const showEditableView = isEditableView && canEditStyleGuide;

  return (
    <Box sx={{ p: 'var(--Content-padding)' }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <WrittenStyleGuideHeader
            name={String(guide.guide_name || 'Written Style')}
            onPublish={handlePublish}
            isEditableView={showEditableView}
            handleWrittenStyleGuideEdit={(next) => {
              if (canEditStyleGuide) {
                setIsEditableView(next);
              }
            }}
            onReanalyze={canEditStyleGuide ? handleReanalyze : undefined}
            isReanalyzing={isReanalyzing}
            canEdit={canEditStyleGuide}
          />
          <WrittenStyleGuideBreadcrumbs guideName={String(guide.guide_name || 'Written Style')} />
        </Stack>
        <Sheet
          sx={{
            borderTop: '1px solid var(--joy-palette-divider)',
            p: 2,
          }}
        >
          <Grid container spacing={3}>
            <Grid
              xs={12}
              md={9}
              sx={{
                borderRight: { md: '1px solid var(--joy-palette-divider)' },
                pr: { md: 2.5 },
              }}
            >
              {showEditableView ? (
                <WrittenStyleGuideEditor
                  guide={guide}
                  framingConcepts={framingConcepts}
                  preferredVocabulary={preferredVocabulary}
                  prohibitedVocabulary={prohibitedVocabulary}
                  isLoading={framingConceptsLoading || vocabularyLoading}
                  onSaveSuccess={() => {
                    refetch();
                    refetchFramingConcepts();
                    refetchVocabulary();
                  }}
                />
              ) : (
                <WrittenStyleGuideSummary
                  guide={guide}
                  framingConcepts={framingConcepts}
                  preferredVocabulary={preferredVocabulary}
                  prohibitedVocabulary={prohibitedVocabulary}
                  isLoading={framingConceptsLoading || vocabularyLoading}
                  onEditClick={() => {
                    if (canEditStyleGuide) {
                      setIsEditableView(true);
                    }
                  }}
                />
              )}
            </Grid>

            <Grid xs={12} md={3}>
              <WrittenStyleGuideActivityTracker />
            </Grid>
          </Grid>
        </Sheet>
      </Stack>
    </Box>
  );
}
