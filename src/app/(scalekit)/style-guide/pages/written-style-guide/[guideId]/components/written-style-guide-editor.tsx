'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import Chip from '@mui/joy/Chip';
import ChipDelete from '@mui/joy/ChipDelete';
import CircularProgress from '@mui/joy/CircularProgress';
import Divider from '@mui/joy/Divider';
import FormControl from '@mui/joy/FormControl';
import FormHelperText from '@mui/joy/FormHelperText';
import FormLabel from '@mui/joy/FormLabel';
import IconButton from '@mui/joy/IconButton';
import Input from '@mui/joy/Input';
import Radio from '@mui/joy/Radio';
import RadioGroup from '@mui/joy/RadioGroup';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Stack from '@mui/joy/Stack';
import Table from '@mui/joy/Table';
import Textarea from '@mui/joy/Textarea';
import Typography from '@mui/joy/Typography';
import { FloppyDisk, Plus, Trash, X } from '@phosphor-icons/react';
import { toast } from '@/components/core/toaster';
import {
  getFormalityOptionItems,
  getSentenceOptionItems,
  getPacingOptionItems,
  getHumorUsageOptionItems,
  getStorytellingOptionItems,
  getUseOfJargonOptionItems,
  getLanguageLevelOptionItems,
  getEmotionalToneOptionItems,
} from '@/app/(scalekit)/style-guide/lib/api/option-items';
import {
  useUpdateStyleGuide,
  useCreateFramingConcept,
  useUpdateFramingConcept,
  useDeleteFramingConcept,
  useCreateVocabularyEntry,
  useUpdateVocabularyEntry,
  useDeleteVocabularyEntry,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import { updateStyleGuidePayloadSchema } from '@/app/(scalekit)/style-guide/lib/types/validation';
import type { StyleGuideResponse } from '@/app/(scalekit)/style-guide/lib/api/style-guides';
import type { FramingConcept } from '@/app/(scalekit)/style-guide/lib/api/framing-concepts';
import type { VocabularyEntry } from '@/app/(scalekit)/style-guide/lib/api/vocabulary-entries';
import type { z } from 'zod';

type FormData = z.infer<typeof updateStyleGuidePayloadSchema>;

type WrittenStyleGuideEditorProps = {
  guide: StyleGuideResponse;
  framingConcepts: FramingConcept[];
  preferredVocabulary: VocabularyEntry[];
  prohibitedVocabulary: VocabularyEntry[];
  isLoading: boolean;
  onSaveSuccess: () => void;
};

// Narrative Voice options
const NARRATIVE_VOICE_OPTIONS = [
  {
    value: 'first_person_singular',
    label: 'First Person Singular',
    description: '"I recommend...", "In my experience..."',
  },
  {
    value: 'first_person_plural',
    label: 'First Person Plural',
    description: '"We believe...", "Our approach..."',
  },
  {
    value: 'third_person',
    label: 'Third Person',
    description: '"The company offers...", "Users can..."',
  },
];

export default function WrittenStyleGuideEditor({
  guide,
  framingConcepts,
  preferredVocabulary,
  prohibitedVocabulary,
  isLoading,
  onSaveSuccess,
}: WrittenStyleGuideEditorProps): React.JSX.Element {
  // Fetch option items
  const { data: formalityOptions = [] } = useQuery({
    queryKey: ['formality-options'],
    queryFn: getFormalityOptionItems,
  });
  const { data: sentenceOptions = [] } = useQuery({
    queryKey: ['sentence-options'],
    queryFn: getSentenceOptionItems,
  });
  const { data: pacingOptions = [] } = useQuery({
    queryKey: ['pacing-options'],
    queryFn: getPacingOptionItems,
  });
  const { data: humorOptions = [] } = useQuery({
    queryKey: ['humor-options'],
    queryFn: getHumorUsageOptionItems,
  });
  const { data: storytellingOptions = [] } = useQuery({
    queryKey: ['storytelling-options'],
    queryFn: getStorytellingOptionItems,
  });
  const { data: jargonOptions = [] } = useQuery({
    queryKey: ['jargon-options'],
    queryFn: getUseOfJargonOptionItems,
  });
  const { data: languageOptions = [] } = useQuery({
    queryKey: ['language-options'],
    queryFn: getLanguageLevelOptionItems,
  });
  const { data: emotionalToneOptions = [] } = useQuery({
    queryKey: ['emotional-tone-options'],
    queryFn: getEmotionalToneOptionItems,
  });

  // Mutations
  const updateStyleGuide = useUpdateStyleGuide();
  const createFramingConcept = useCreateFramingConcept();
  const updateFramingConcept = useUpdateFramingConcept();
  const deleteFramingConcept = useDeleteFramingConcept();
  const createVocabularyEntry = useCreateVocabularyEntry();
  const updateVocabularyEntry = useUpdateVocabularyEntry();
  const deleteVocabularyEntry = useDeleteVocabularyEntry();

  // Local state for editable lists
  const [localFramingConcepts, setLocalFramingConcepts] = React.useState(framingConcepts);
  const [localPreferredVocab, setLocalPreferredVocab] = React.useState(preferredVocabulary);
  const [localProhibitedVocab, setLocalProhibitedVocab] = React.useState(prohibitedVocabulary);
  const [newFramingConcept, setNewFramingConcept] = React.useState({ name: '', description: '' });
  const [newPreferredTerm, setNewPreferredTerm] = React.useState({ name: '', example_usage: '' });
  const [newProhibitedTerm, setNewProhibitedTerm] = React.useState({
    name: '',
    suggested_replacement: '',
  });

  // Update local state when props change
  React.useEffect(() => {
    setLocalFramingConcepts(framingConcepts);
  }, [framingConcepts]);

  React.useEffect(() => {
    setLocalPreferredVocab(preferredVocabulary);
  }, [preferredVocabulary]);

  React.useEffect(() => {
    setLocalProhibitedVocab(prohibitedVocabulary);
  }, [prohibitedVocabulary]);

  // Parse brand voice into chips
  const brandVoiceItems = guide.brand_voice
    ? guide.brand_voice
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  const [localBrandVoice, setLocalBrandVoice] = React.useState<string[]>(brandVoiceItems);
  const [brandVoiceInput, setBrandVoiceInput] = React.useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(updateStyleGuidePayloadSchema),
    defaultValues: {
      style_guide_id: guide.style_guide_id,
      guide_name: guide.guide_name,
      brand_personality: guide.brand_personality || '',
      brand_voice: guide.brand_voice || '',
      narrative_voice: guide.narrative_voice || '',
      formality_option_item_id: guide.formality_option_item_id || null,
      sentence_length_option_item_id: guide.sentence_length_option_item_id || null,
      pacing_option_item_id: guide.pacing_option_item_id || null,
      humor_usage_option_item_id: guide.humor_usage_option_item_id || null,
      storytelling_style_option_item_id: guide.storytelling_style_option_item_id || null,
      use_of_jargon_option_item_id: guide.use_of_jargon_option_item_id || null,
      language_level_option_item_id: guide.language_level_option_item_id || null,
      emotional_tone_option_item_id: guide.emotional_tone_option_item_id || null,
      inclusivity_guidelines: guide.inclusivity_guidelines || '',
    },
  });

  // Update brand_voice when chips change
  React.useEffect(() => {
    setValue('brand_voice', localBrandVoice.join(', '));
  }, [localBrandVoice, setValue]);

  const handleAddBrandVoice = () => {
    if (brandVoiceInput.trim() && !localBrandVoice.includes(brandVoiceInput.trim())) {
      setLocalBrandVoice([...localBrandVoice, brandVoiceInput.trim()]);
      setBrandVoiceInput('');
    }
  };

  const handleRemoveBrandVoice = (item: string) => {
    setLocalBrandVoice(localBrandVoice.filter((v) => v !== item));
  };

  const handleAddFramingConcept = async () => {
    if (!newFramingConcept.name.trim()) {
      toast.error('Please enter a concept name');
      return;
    }

    try {
      await createFramingConcept.mutateAsync({
        style_guide_id: guide.style_guide_id,
        name: newFramingConcept.name,
        description: newFramingConcept.description || null,
      });
      setNewFramingConcept({ name: '', description: '' });
      onSaveSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteFramingConcept = async (conceptId: string) => {
    try {
      await deleteFramingConcept.mutateAsync(conceptId);
      onSaveSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleAddPreferredTerm = async () => {
    if (!newPreferredTerm.name.trim()) {
      toast.error('Please enter a term');
      return;
    }

    try {
      await createVocabularyEntry.mutateAsync({
        style_guide_id: guide.style_guide_id,
        name: newPreferredTerm.name,
        vocabulary_type: 'preferred',
        example_usage: newPreferredTerm.example_usage || null,
      });
      setNewPreferredTerm({ name: '', example_usage: '' });
      onSaveSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleAddProhibitedTerm = async () => {
    if (!newProhibitedTerm.name.trim()) {
      toast.error('Please enter a term');
      return;
    }

    try {
      await createVocabularyEntry.mutateAsync({
        style_guide_id: guide.style_guide_id,
        name: newProhibitedTerm.name,
        vocabulary_type: 'prohibited',
        suggested_replacement: newProhibitedTerm.suggested_replacement || null,
      });
      setNewProhibitedTerm({ name: '', suggested_replacement: '' });
      onSaveSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteVocabulary = async (entryId: string) => {
    try {
      await deleteVocabularyEntry.mutateAsync(entryId);
      onSaveSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await updateStyleGuide.mutateAsync(data);
      onSaveSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size='sm' />
      </Box>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={4}>
        {/* Header with save button */}
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <Typography level='title-sm'>Content</Typography>
          <Button
            type='submit'
            variant='solid'
            color='primary'
            size='sm'
            startDecorator={<FloppyDisk size={16} />}
            loading={isSubmitting}
          >
            Save Changes
          </Button>
        </Stack>

        {/* Brand Personality */}
        <FormControl error={!!errors.brand_personality}>
          <FormLabel>Brand Personality</FormLabel>
          <Controller
            name='brand_personality'
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                value={field.value || ''}
                placeholder="Summarize your brand's personality in one or two sentences."
                minRows={3}
              />
            )}
          />
          <FormHelperText>
            Describe the overall personality and tone (e.g., &quot;Pragmatic and confident, focusing
            on clarity and actionable insights&quot;)
          </FormHelperText>
        </FormControl>

        {/* Brand Voice with Chips */}
        <FormControl>
          <FormLabel>Brand Voice</FormLabel>
          <Stack spacing={1}>
            <Stack direction='row' spacing={1}>
              <Input
                value={brandVoiceInput}
                onChange={(e) => setBrandVoiceInput(e.target.value)}
                placeholder='e.g., Trustworthy, Conversational'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBrandVoice();
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button
                variant='soft'
                onClick={handleAddBrandVoice}
                disabled={!brandVoiceInput.trim()}
              >
                Add
              </Button>
            </Stack>
            {localBrandVoice.length > 0 && (
              <Stack direction='row' flexWrap='wrap' gap={0.5}>
                {localBrandVoice.map((item, index) => (
                  <Chip
                    key={index}
                    size='sm'
                    variant='soft'
                    color='primary'
                    endDecorator={<ChipDelete onDelete={() => handleRemoveBrandVoice(item)} />}
                  >
                    {item}
                  </Chip>
                ))}
              </Stack>
            )}
          </Stack>
          <FormHelperText>
            Comma-separated list of 3-5 adjectives describing your brand&apos;s voice
          </FormHelperText>
        </FormControl>

        <Divider />

        {/* Narrative Voice */}
        <FormControl>
          <FormLabel>Narrative Voice</FormLabel>
          <Controller
            name='narrative_voice'
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <Stack spacing={1}>
                  {NARRATIVE_VOICE_OPTIONS.map((option) => (
                    <Radio
                      key={option.value}
                      value={option.value}
                      label={
                        <Stack>
                          <Typography level='body-sm' fontWeight='md'>
                            {option.label}
                          </Typography>
                          <Typography level='body-xs' color='neutral'>
                            {option.description}
                          </Typography>
                        </Stack>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </RadioGroup>
            )}
          />
        </FormControl>

        <Divider />

        {/* Formality */}
        <FormControl>
          <FormLabel>Formality</FormLabel>
          <Controller
            name='formality_option_item_id'
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <Stack spacing={1}>
                  {formalityOptions.map((option) => (
                    <Radio
                      key={option.formality_option_item_id}
                      value={option.formality_option_item_id}
                      label={
                        <Stack>
                          <Typography level='body-sm' fontWeight='md'>
                            {option.display_name}
                          </Typography>
                          {option.description && (
                            <Typography level='body-xs' color='neutral'>
                              {option.description}
                            </Typography>
                          )}
                        </Stack>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </RadioGroup>
            )}
          />
        </FormControl>

        <Divider />

        {/* Framing Concepts Table */}
        <Stack spacing={2}>
          <Typography level='title-sm'>Framing Concepts</Typography>
          <Table
            sx={{
              '& td, & th': {
                borderBottom: '1px solid var(--joy-palette-divider)',
                verticalAlign: 'top',
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: '200px' }}>Name</th>
                <th>Description</th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {localFramingConcepts.map((concept) => (
                <tr key={concept.framing_concept_id}>
                  <td>
                    <Typography level='body-sm'>{concept.name}</Typography>
                  </td>
                  <td>
                    <Typography level='body-sm'>{concept.description || '—'}</Typography>
                  </td>
                  <td>
                    <IconButton
                      size='sm'
                      variant='plain'
                      color='danger'
                      onClick={() => handleDeleteFramingConcept(concept.framing_concept_id)}
                    >
                      <Trash size={18} />
                    </IconButton>
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <Input
                    size='sm'
                    value={newFramingConcept.name}
                    onChange={(e) =>
                      setNewFramingConcept({ ...newFramingConcept, name: e.target.value })
                    }
                    placeholder='Enter concept name'
                  />
                </td>
                <td>
                  <Input
                    size='sm'
                    value={newFramingConcept.description}
                    onChange={(e) =>
                      setNewFramingConcept({ ...newFramingConcept, description: e.target.value })
                    }
                    placeholder='Enter description'
                  />
                </td>
                <td>
                  <IconButton
                    size='sm'
                    variant='soft'
                    color='primary'
                    onClick={handleAddFramingConcept}
                    disabled={!newFramingConcept.name.trim()}
                  >
                    <Plus size={18} />
                  </IconButton>
                </td>
              </tr>
            </tbody>
          </Table>
          <Button
            variant='plain'
            color='primary'
            size='sm'
            startDecorator={<Plus size={16} />}
            onClick={handleAddFramingConcept}
            disabled={!newFramingConcept.name.trim()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add Concept
          </Button>
        </Stack>

        <Divider />

        {/* Preferred Vocabulary Table */}
        <Stack spacing={2}>
          <Typography level='title-sm'>Preferred Vocabulary</Typography>
          <Table
            sx={{
              '& td, & th': {
                borderBottom: '1px solid var(--joy-palette-divider)',
                verticalAlign: 'top',
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: '200px' }}>Term</th>
                <th>Definition</th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {localPreferredVocab.map((entry) => (
                <tr key={entry.vocabulary_entry_id}>
                  <td>
                    <Typography level='body-sm'>{entry.name}</Typography>
                  </td>
                  <td>
                    <Typography level='body-sm'>{entry.example_usage || '—'}</Typography>
                  </td>
                  <td>
                    <IconButton
                      size='sm'
                      variant='plain'
                      color='danger'
                      onClick={() => handleDeleteVocabulary(entry.vocabulary_entry_id)}
                    >
                      <Trash size={18} />
                    </IconButton>
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <Input
                    size='sm'
                    value={newPreferredTerm.name}
                    onChange={(e) =>
                      setNewPreferredTerm({ ...newPreferredTerm, name: e.target.value })
                    }
                    placeholder='Enter term'
                  />
                </td>
                <td>
                  <Input
                    size='sm'
                    value={newPreferredTerm.example_usage}
                    onChange={(e) =>
                      setNewPreferredTerm({ ...newPreferredTerm, example_usage: e.target.value })
                    }
                    placeholder='Enter definition'
                  />
                </td>
                <td>
                  <IconButton
                    size='sm'
                    variant='soft'
                    color='primary'
                    onClick={handleAddPreferredTerm}
                    disabled={!newPreferredTerm.name.trim()}
                  >
                    <Plus size={18} />
                  </IconButton>
                </td>
              </tr>
            </tbody>
          </Table>
          <Button
            variant='plain'
            color='primary'
            size='sm'
            startDecorator={<Plus size={16} />}
            onClick={handleAddPreferredTerm}
            disabled={!newPreferredTerm.name.trim()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add Term
          </Button>
        </Stack>

        <Divider />

        {/* Prohibited Vocabulary Table */}
        <Stack spacing={2}>
          <Typography level='title-sm'>Prohibited Vocabulary</Typography>
          <Table
            sx={{
              '& td, & th': {
                borderBottom: '1px solid var(--joy-palette-divider)',
                verticalAlign: 'top',
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: '200px' }}>Term</th>
                <th>Reason to Avoid</th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {localProhibitedVocab.map((entry) => (
                <tr key={entry.vocabulary_entry_id}>
                  <td>
                    <Typography level='body-sm'>{entry.name}</Typography>
                  </td>
                  <td>
                    <Typography level='body-sm'>{entry.suggested_replacement || '—'}</Typography>
                  </td>
                  <td>
                    <IconButton
                      size='sm'
                      variant='plain'
                      color='danger'
                      onClick={() => handleDeleteVocabulary(entry.vocabulary_entry_id)}
                    >
                      <Trash size={18} />
                    </IconButton>
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <Input
                    size='sm'
                    value={newProhibitedTerm.name}
                    onChange={(e) =>
                      setNewProhibitedTerm({ ...newProhibitedTerm, name: e.target.value })
                    }
                    placeholder='Enter term'
                  />
                </td>
                <td>
                  <Input
                    size='sm'
                    value={newProhibitedTerm.suggested_replacement}
                    onChange={(e) =>
                      setNewProhibitedTerm({
                        ...newProhibitedTerm,
                        suggested_replacement: e.target.value,
                      })
                    }
                    placeholder='Enter reason to avoid'
                  />
                </td>
                <td>
                  <IconButton
                    size='sm'
                    variant='soft'
                    color='primary'
                    onClick={handleAddProhibitedTerm}
                    disabled={!newProhibitedTerm.name.trim()}
                  >
                    <Plus size={18} />
                  </IconButton>
                </td>
              </tr>
            </tbody>
          </Table>
          <Button
            variant='plain'
            color='primary'
            size='sm'
            startDecorator={<Plus size={16} />}
            onClick={handleAddProhibitedTerm}
            disabled={!newProhibitedTerm.name.trim()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add Term
          </Button>
        </Stack>

        <Divider />

        {/* Sentence Length */}
        <FormControl>
          <FormLabel>Sentence Length Preference</FormLabel>
          <Controller
            name='sentence_length_option_item_id'
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || ''}
                onChange={(_, value) => field.onChange(value || null)}
                placeholder='Select sentence length'
              >
                {sentenceOptions.map((option) => (
                  <Option
                    key={option.sentence_option_items_id}
                    value={option.sentence_option_items_id}
                  >
                    {option.display_name}
                  </Option>
                ))}
              </Select>
            )}
          />
        </FormControl>

        {/* Pacing */}
        <FormControl>
          <FormLabel>Pacing</FormLabel>
          <Controller
            name='pacing_option_item_id'
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || ''}
                onChange={(_, value) => field.onChange(value || null)}
                placeholder='Select pacing'
              >
                {pacingOptions.map((option) => (
                  <Option key={option.pacing_option_item_id} value={option.pacing_option_item_id}>
                    {option.display_name}
                  </Option>
                ))}
              </Select>
            )}
          />
        </FormControl>

        <Divider />

        {/* Emotional Tone */}
        <FormControl>
          <FormLabel>Emotional Tone</FormLabel>
          <Controller
            name='emotional_tone_option_item_id'
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <Stack spacing={1}>
                  {emotionalToneOptions.map((option) => (
                    <Radio
                      key={option.emotional_tone_option_item_id}
                      value={option.emotional_tone_option_item_id}
                      label={
                        <Stack>
                          <Typography level='body-sm' fontWeight='md'>
                            {option.display_name}
                          </Typography>
                          {option.description && (
                            <Typography level='body-xs' color='neutral'>
                              {option.description}
                            </Typography>
                          )}
                        </Stack>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </RadioGroup>
            )}
          />
        </FormControl>

        <Divider />

        {/* Inclusivity Guidelines */}
        <FormControl error={!!errors.inclusivity_guidelines}>
          <FormLabel>Inclusivity Guidelines</FormLabel>
          <Controller
            name='inclusivity_guidelines'
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                value={field.value || ''}
                placeholder='Define inclusivity rules and constraints for content generation'
                minRows={3}
              />
            )}
          />
          <FormHelperText>
            E.g., &quot;Use gender-neutral pronouns. Prioritize accessibility in language.&quot;
          </FormHelperText>
        </FormControl>

        <Divider />

        {/* Humor Usage */}
        <FormControl>
          <FormLabel>Humor Usage</FormLabel>
          <Controller
            name='humor_usage_option_item_id'
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <Stack spacing={1}>
                  {humorOptions.map((option) => (
                    <Radio
                      key={option.humor_usage_option_item_id}
                      value={option.humor_usage_option_item_id}
                      label={
                        <Stack>
                          <Typography level='body-sm' fontWeight='md'>
                            {option.display_name}
                          </Typography>
                          {option.description && (
                            <Typography level='body-xs' color='neutral'>
                              {option.description}
                            </Typography>
                          )}
                        </Stack>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </RadioGroup>
            )}
          />
        </FormControl>

        <Divider />

        {/* Storytelling Style */}
        <FormControl>
          <FormLabel>Storytelling Style</FormLabel>
          <Controller
            name='storytelling_style_option_item_id'
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <Stack spacing={1}>
                  {storytellingOptions.map((option) => (
                    <Radio
                      key={option.storytelling_option_item_id}
                      value={option.storytelling_option_item_id}
                      label={
                        <Stack>
                          <Typography level='body-sm' fontWeight='md'>
                            {option.display_name}
                          </Typography>
                          {option.description && (
                            <Typography level='body-xs' color='neutral'>
                              {option.description}
                            </Typography>
                          )}
                        </Stack>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </RadioGroup>
            )}
          />
        </FormControl>

        <Divider />

        {/* Use of Jargon */}
        <FormControl>
          <FormLabel>Use of Jargon</FormLabel>
          <Controller
            name='use_of_jargon_option_item_id'
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              >
                <Stack spacing={1}>
                  {jargonOptions.map((option) => (
                    <Radio
                      key={option.use_of_jargon_option_item_id}
                      value={option.use_of_jargon_option_item_id}
                      label={
                        <Stack>
                          <Typography level='body-sm' fontWeight='md'>
                            {option.display_name}
                          </Typography>
                          {option.description && (
                            <Typography level='body-xs' color='neutral'>
                              {option.description}
                            </Typography>
                          )}
                        </Stack>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </RadioGroup>
            )}
          />
        </FormControl>

        <Divider />

        {/* Language Level */}
        <FormControl>
          <FormLabel>Language Level</FormLabel>
          <Controller
            name='language_level_option_item_id'
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || ''}
                onChange={(_, value) => field.onChange(value || null)}
                placeholder='Select language level'
              >
                {languageOptions.map((option) => (
                  <Option
                    key={option.language_level_option_item_id}
                    value={option.language_level_option_item_id}
                  >
                    {option.display_name}
                  </Option>
                ))}
              </Select>
            )}
          />
        </FormControl>
      </Stack>
    </form>
  );
}
