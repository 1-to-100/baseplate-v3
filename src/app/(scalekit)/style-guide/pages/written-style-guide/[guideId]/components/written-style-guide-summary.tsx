'use client';

import * as React from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Stack from '@mui/joy/Stack';
import Table from '@mui/joy/Table';
import Typography from '@mui/joy/Typography';
import { PencilLine } from '@phosphor-icons/react';
import type { StyleGuideResponse } from '@/app/(scalekit)/style-guide/lib/api/style-guides';
import type { FramingConcept } from '@/app/(scalekit)/style-guide/lib/api/framing-concepts';
import type { VocabularyEntry } from '@/app/(scalekit)/style-guide/lib/api/vocabulary-entries';

type WrittenStyleGuideSummaryProps = {
  guide: StyleGuideResponse;
  framingConcepts: FramingConcept[];
  preferredVocabulary: VocabularyEntry[];
  prohibitedVocabulary: VocabularyEntry[];
  isLoading: boolean;
  onEditClick: () => void;
};

// Narrative Voice options mapping
const NARRATIVE_VOICE_OPTIONS: Record<string, string> = {
  first_person_singular: 'First Person Singular',
  first_person_plural: 'First Person Plural',
  third_person: 'Third Person',
};

function SummaryRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <tr>
      <td style={{ width: '200px', verticalAlign: 'top', padding: '12px 16px' }}>
        <Typography level='body-sm' fontWeight='md' color='neutral'>
          {label}
        </Typography>
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
        {typeof value === 'string' ? (
          <Typography level='body-sm' sx={{ whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>
            {value || '—'}
          </Typography>
        ) : (
          value || (
            <Typography level='body-sm' color='neutral'>
              —
            </Typography>
          )
        )}
      </td>
    </tr>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <Typography level='body-sm' color='neutral'>
        —
      </Typography>
    );
  }

  return (
    <Stack direction='row' flexWrap='wrap' gap={0.5}>
      {items.map((item, index) => (
        <Chip key={index} size='sm' variant='soft' color='neutral'>
          {item.trim()}
        </Chip>
      ))}
    </Stack>
  );
}

function ConceptList({
  concepts,
  emptyMessage,
}: {
  concepts: { name: string; description: string | null }[];
  emptyMessage: string;
}) {
  if (concepts.length === 0) {
    return (
      <Typography level='body-sm' color='neutral'>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5}>
      {concepts.map((concept, index) => (
        <Typography key={index} level='body-sm' sx={{ lineHeight: '20px' }}>
          <Typography component='span' fontWeight='sm'>
            {concept.name}
          </Typography>
          {concept.description && (
            <>
              {' — "'}
              {concept.description}
              {'"'}
            </>
          )}
        </Typography>
      ))}
    </Stack>
  );
}

function VocabularyList({
  entries,
  emptyMessage,
  showReason = false,
}: {
  entries: VocabularyEntry[];
  emptyMessage: string;
  showReason?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <Typography level='body-sm' color='neutral'>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Stack spacing={0.5}>
      {entries.map((entry) => (
        <Typography key={entry.vocabulary_entry_id} level='body-sm' sx={{ lineHeight: '20px' }}>
          <Typography component='span' fontWeight='sm'>
            {entry.name}
          </Typography>
          {showReason && entry.suggested_replacement ? (
            <>
              {' — "'}
              {entry.suggested_replacement}
              {'"'}
            </>
          ) : entry.example_usage ? (
            <>
              {' — "'}
              {entry.example_usage}
              {'"'}
            </>
          ) : null}
        </Typography>
      ))}
    </Stack>
  );
}

export default function WrittenStyleGuideSummary({
  guide,
  framingConcepts,
  preferredVocabulary,
  prohibitedVocabulary,
  isLoading,
  onEditClick,
}: WrittenStyleGuideSummaryProps): React.JSX.Element {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size='sm' />
      </Box>
    );
  }

  const brandVoiceItems = guide.brand_voice
    ? guide.brand_voice
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

  // Get display names from option items
  const narrativeVoice: string | null = guide.narrative_voice
    ? NARRATIVE_VOICE_OPTIONS[guide.narrative_voice] || guide.narrative_voice
    : null;
  const formality: string | null = guide.formality_option_item?.display_name ?? null;
  const sentenceLength: string | null = guide.sentence_length_option_item?.display_name ?? null;
  const pacing: string | null = guide.pacing_option_item?.display_name ?? null;
  const emotionalTone: string | null = guide.emotional_tone_option_item?.display_name ?? null;
  const humorUsage: string | null = guide.humor_usage_option_item?.display_name ?? null;
  const storytellingStyle: string | null =
    guide.storytelling_style_option_item?.display_name ?? null;
  const useOfJargon: string | null = guide.use_of_jargon_option_item?.display_name ?? null;
  const languageLevel: string | null = guide.language_level_option_item?.display_name ?? null;

  return (
    <Stack spacing={2}>
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Typography level='title-sm'>Content</Typography>
        <Button
          variant='plain'
          color='primary'
          size='sm'
          startDecorator={<PencilLine size={16} />}
          onClick={onEditClick}
        >
          Edit
        </Button>
      </Stack>

      <Table
        sx={{
          '& tbody tr:hover': {
            bgcolor: 'transparent',
          },
          '& td, & th': {
            borderBottom: '1px solid var(--joy-palette-divider)',
          },
        }}
      >
        <tbody>
          <SummaryRow label='Brand Personality' value={guide.brand_personality} multiline />
          <SummaryRow label='Brand Voice' value={<ChipList items={brandVoiceItems} />} />
          <SummaryRow label='Narrative Voice' value={narrativeVoice} />
          <SummaryRow label='Formality' value={formality} />
          <SummaryRow
            label='Framing Concepts'
            value={
              <ConceptList
                concepts={framingConcepts.map((fc) => ({
                  name: fc.name,
                  description: fc.description,
                }))}
                emptyMessage='No framing concepts defined'
              />
            }
          />
          <SummaryRow
            label='Preferred Vocabulary'
            value={
              <VocabularyList
                entries={preferredVocabulary}
                emptyMessage='No preferred vocabulary defined'
              />
            }
          />
          <SummaryRow
            label='Prohibited Vocabulary'
            value={
              <VocabularyList
                entries={prohibitedVocabulary}
                emptyMessage='No prohibited vocabulary defined'
                showReason
              />
            }
          />
          <SummaryRow label='Sentence Length' value={sentenceLength} />
          <SummaryRow label='Pacing' value={pacing} />
          <SummaryRow label='Emotional Tone' value={emotionalTone} />
          <SummaryRow
            label='Inclusivity Guidelines'
            value={guide.inclusivity_guidelines}
            multiline
          />
          <SummaryRow label='Humor Usage' value={humorUsage} />
          <SummaryRow label='Storytelling Style' value={storytellingStyle} />
          <SummaryRow label='Use of Jargon' value={useOfJargon} />
          <SummaryRow label='Language Level' value={languageLevel} />
        </tbody>
      </Table>
    </Stack>
  );
}
