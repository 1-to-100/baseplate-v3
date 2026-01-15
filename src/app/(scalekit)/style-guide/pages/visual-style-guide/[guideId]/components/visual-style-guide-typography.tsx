'use client';

import { toast } from '@/components/core/toaster';
import { Box, Button, Card, Grid, Option, Select } from '@mui/joy';
import CircularProgress from '@mui/joy/CircularProgress';
import Input from '@mui/joy/Input';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';
import { Plus } from '@phosphor-icons/react';
import * as React from 'react';
import {
  useCreateTypographyStyle,
  useFontOptions,
  usePaletteColors,
  useTypographyStyleOptions,
  useTypographyStyles,
  useUpdatePaletteColor,
  useUpdateTypographyStyle,
} from '@/app/(scalekit)/style-guide/lib/hooks';
import {
  COLOR_USAGE_OPTION,
  USAGE_OPTIONS,
} from '@/app/(scalekit)/style-guide/lib/constants/palette-colors';
import {
  FONT_SIZE_OPTIONS,
  getDefaultFontSize,
  getDefaultFontWeight,
  getDefaultLineHeight,
} from '@/app/(scalekit)/style-guide/lib/constants/typography';
import type {
  FontOption,
  PaletteColor,
  TypographyStyle,
  TypographyStyleOption,
} from '@/app/(scalekit)/style-guide/lib/types';
import { ColorEditItem, ColorPreviewItem } from './visual-style-guide-colors';

// Typography preset options enum
enum TypographyPreset {
  INTER = 'Inter',
  RALEWAY = 'Raleway',
  LATO = 'Lato',
}

const TYPOGRAPHY_PRESETS = [
  {
    id: 'typography-preset-1',
    fontFamily: TypographyPreset.INTER,
    sampleText: 'The quick brown fox jumps over the lazy dog.',
  },
  {
    id: 'typography-preset-2',
    fontFamily: TypographyPreset.RALEWAY,
    sampleText: 'The quick brown fox jumps over the lazy dog.',
  },
  {
    id: 'typography-preset-3',
    fontFamily: TypographyPreset.LATO,
    sampleText: 'The quick brown fox jumps over the lazy dog.',
  },
] as const;

type TypographyPresetSelectorProps = {
  onSelectPreset: (fontFamily: string) => void;
  onAddCustom: () => void;
};

function TypographyPresetSelector({ onSelectPreset, onAddCustom }: TypographyPresetSelectorProps) {
  return (
    <Box>
      <Stack
        direction='row'
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography level='body-sm' color='neutral'>
          Select from recommendation or add own typography
        </Typography>
        <Button variant='plain' color='primary' startDecorator={<Plus />} onClick={onAddCustom}>
          Add Your Own
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {TYPOGRAPHY_PRESETS.map((preset) => (
          <Grid key={preset.id} xs={12} sm={4}>
            <Card
              variant='soft'
              onClick={() => onSelectPreset(preset.fontFamily)}
              sx={{
                cursor: 'pointer',
                textAlign: 'center',
                py: 2,
                px: 1.5,
                border: '2px solid transparent',
                borderColor: 'neutral.outlinedBorder',
                transition: 'border-color 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.outlinedColor',
                },
              }}
            >
              <Stack>
                <Typography
                  level='title-md'
                  sx={{
                    fontFamily: `${preset.fontFamily}, sans-serif`,
                    mb: 1,
                  }}
                >
                  {preset.fontFamily}
                </Typography>
                <Typography
                  level='body-sm'
                  color='neutral'
                  sx={{
                    fontFamily: `${preset.fontFamily}, sans-serif`,
                  }}
                >
                  {preset.sampleText}
                </Typography>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

type VisualStyleGuideTypographyProps = {
  guideId: string;
  isEditableView: boolean;
};

type TypographyEditItemProps = {
  style: TypographyStyle;
  option: TypographyStyleOption | undefined;
  fontOptions: FontOption[] | undefined;
  onUpdateTypography: (styleId: string, field: string, value: unknown) => Promise<void>;
};

function TypographyEditItem({
  style,
  option,
  fontOptions,
  onUpdateTypography,
}: TypographyEditItemProps): React.JSX.Element {
  // Check if current font_family exists in fontOptions
  const currentFontFamily = String(style.font_family || '');
  const fontExistsInOptions = fontOptions?.some(
    (f) => String(f.programmatic_name || '') === currentFontFamily
  );

  return (
    <ListItem
      sx={{
        flexDirection: { xs: 'column', sm: 'row' },
        p: 0,
      }}
    >
      <Stack gap={1} sx={{ width: '100%' }}>
        <Typography level='body-sm'>
          {String(option?.display_name || option?.programmatic_name || 'Unknown')}
        </Typography>
        <Select
          value={currentFontFamily}
          onChange={(_, newValue) => {
            if (newValue) {
              onUpdateTypography(
                String(style.typography_style_id),
                'font_family',
                String(newValue)
              );
            }
          }}
          size='sm'
          aria-label={`Select font for ${String(option?.display_name || 'Unknown')}`}
        >
          {/* Show current font as option if it's not in the fontOptions list */}
          {currentFontFamily && !fontExistsInOptions && (
            <Option
              key={`current-${currentFontFamily}`}
              value={currentFontFamily}
              sx={(theme) => ({
                fontFamily: `${currentFontFamily}, ${theme.fontFamily.body}`,
              })}
            >
              {currentFontFamily}
            </Option>
          )}
          {fontOptions?.map((font) => (
            <Option
              key={String(font.font_option_id)}
              value={String(font.programmatic_name || '')}
              sx={(theme) => ({
                fontFamily: font.programmatic_name
                  ? `${font.programmatic_name}, ${theme.fontFamily.body}`
                  : theme.fontFamily.body,
              })}
            >
              {String(font.display_name || '')}
            </Option>
          ))}
        </Select>
        <Select
          value={String(style.font_size_px || 16)}
          onChange={(_, newValue) => {
            if (newValue) {
              const fontSize = parseInt(String(newValue), 10);
              if (!isNaN(fontSize) && fontSize > 0) {
                onUpdateTypography(String(style.typography_style_id), 'font_size_px', fontSize);
              }
            }
          }}
          size='sm'
          aria-label={`Select font size for ${String(option?.display_name || 'Unknown')}`}
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <Option key={size} value={String(size)}>
              {String(size)}px
            </Option>
          ))}
        </Select>
      </Stack>
    </ListItem>
  );
}

type TypographyPreviewItemProps = {
  style: TypographyStyle;
  option: TypographyStyleOption | undefined;
};

function TypographyPreviewItem({ style, option }: TypographyPreviewItemProps): React.JSX.Element {
  return (
    <ListItem
      sx={{
        p: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Grid container spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
        <Grid xs={12} sm={4}>
          <Typography level='body-sm'>
            {String(option?.display_name || option?.programmatic_name || 'Unknown')}
          </Typography>
        </Grid>
        <Grid xs={12} sm={4}>
          <Typography level='body-sm'>
            {String(style.font_family || '')}
            {style.font_family && style.font_size_px ? `, ${String(style.font_size_px)}px` : ''}
          </Typography>
        </Grid>
        <Grid xs={12} sm={4}>
          <Typography
            level='body-sm'
            sx={(theme) => ({
              fontFamily: style.font_family
                ? `${style.font_family}, ${theme.fontFamily.body}`
                : theme.fontFamily.body,
              fontSize: style.font_size_px ? `${String(style.font_size_px)}px` : undefined,
            })}
          >
            Here how your font looks
          </Typography>
        </Grid>
      </Grid>
    </ListItem>
  );
}

export default function VisualStyleGuideTypography({
  guideId,
  isEditableView,
}: VisualStyleGuideTypographyProps): React.JSX.Element {
  const { data: typographyStyles, isLoading: typographyLoading } = useTypographyStyles(guideId);
  const { data: typographyOptions } = useTypographyStyleOptions();

  const { data: fontOptions } = useFontOptions();
  const { data: colors, isLoading: colorsLoading } = usePaletteColors();

  const foregroundAndBackgroundColors = React.useMemo(() => {
    return (colors || [])
      .filter(
        (c: PaletteColor) =>
          String(c.style_guide_id || '') === String(guideId) &&
          (String(c.usage_option || '') === COLOR_USAGE_OPTION.FOREGROUND ||
            String(c.usage_option || '') === COLOR_USAGE_OPTION.BACKGROUND)
      )
      .sort(
        (a: PaletteColor, b: PaletteColor) => (a.sort_order as number) - (b.sort_order as number)
      );
  }, [colors, guideId]);

  // Merged list of colors and typography styles
  const mergedItems = React.useMemo(() => {
    const colorItems = foregroundAndBackgroundColors.map((color) => ({
      type: 'color' as const,
      data: color,
    }));
    const typographyItems = (typographyStyles || [])
      .map((style) => ({
        type: 'typography' as const,
        data: style,
        sortOrder:
          typographyOptions?.find(
            (opt) =>
              String(opt.typography_style_option_id) === String(style.typography_style_option_id)
          )?.sort_order ?? Infinity,
      }))
      .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
      .map(({ sortOrder, ...item }) => item);
    return [...colorItems, ...typographyItems];
  }, [foregroundAndBackgroundColors, typographyStyles, typographyOptions]);

  const createTypographyStyle = useCreateTypographyStyle();
  const updateTypography = useUpdateTypographyStyle();
  const updateColor = useUpdatePaletteColor();

  const handleUpdateTypography = React.useCallback(
    async (styleId: string, field: string, value: unknown) => {
      try {
        await updateTypography.mutateAsync({
          id: styleId,
          input: { [field]: value },
        });
      } catch (error) {
        toast.error('Failed to update typography style');
      }
    },
    [updateTypography]
  );

  const handleUpdateColor = React.useCallback(
    async (color: PaletteColor, field: string, value: unknown) => {
      try {
        const normalizedValue = field === 'name' && value === '' ? null : value;

        await updateColor.mutateAsync({
          id: String(color.palette_color_id),
          input: { [field]: normalizedValue },
        });
      } catch (error) {
        toast.error('Failed to update color');
      }
    },
    [updateColor]
  );

  const handleSelectTypographyPreset = React.useCallback(
    async (fontFamily: string) => {
      try {
        // Update all typography styles with the selected font family
        if (typographyStyles && typographyStyles.length > 0) {
          await Promise.all(
            typographyStyles.map((style) =>
              handleUpdateTypography(String(style.typography_style_id), 'font_family', fontFamily)
            )
          );
          toast.success(`Typography updated to ${fontFamily}`);
        } else if (typographyOptions && typographyOptions.length > 0) {
          // Create typography styles for each typography option with the selected font
          for (const typographyOption of typographyOptions) {
            await createTypographyStyle.mutateAsync({
              visual_style_guide_id: guideId,
              typography_style_option_id: typographyOption.typography_style_option_id,
              font_option_id: null,
              font_family: fontFamily,
              font_fallbacks: null,
              font_size_px: getDefaultFontSize(String(typographyOption.programmatic_name || '')),
              line_height: getDefaultLineHeight(String(typographyOption.programmatic_name || '')),
              font_weight: getDefaultFontWeight(String(typographyOption.programmatic_name || '')),
              color: null,
              css_snippet: null,
              licensing_notes: null,
              created_by_user_id: null,
            });
          }
          toast.success(`Typography styles created with ${fontFamily}`);
        } else {
          toast.error('No typography options available');
        }
      } catch (error) {
        toast.error('Failed to update typography');
      }
    },
    [typographyStyles, typographyOptions, guideId, handleUpdateTypography, createTypographyStyle]
  );

  const handleAddCustomTypography = React.useCallback(() => {
    // For now, just show a toast - actual implementation would open a modal or navigate
    toast.info('Add custom typography feature coming soon');
  }, []);

  return (
    <Box>
      <Typography level='title-sm' color='primary' sx={{ mb: 1.5 }}>
        Typography
      </Typography>

      {(() => {
        if (typographyLoading || colorsLoading) return <CircularProgress />;

        // Edit mode
        if (isEditableView)
          return (
            <>
              <TypographyPresetSelector
                onSelectPreset={handleSelectTypographyPreset}
                onAddCustom={handleAddCustomTypography}
              />
              <List sx={{ p: 0, gap: 2, mt: 2 }}>
                {mergedItems.map((item) => {
                  if (item.type === 'color') {
                    const color = item.data as PaletteColor;
                    const colorLabel =
                      (color.name as string) ||
                      USAGE_OPTIONS.find((opt) => opt.value === color.usage_option)?.label ||
                      'Color';

                    return (
                      <ColorEditItem
                        key={String(color.palette_color_id)}
                        color={color}
                        colorLabel={colorLabel}
                        onUpdateColor={handleUpdateColor}
                      />
                    );
                  } else {
                    const style = item.data as TypographyStyle;
                    const option = typographyOptions?.find(
                      (opt) =>
                        String(opt.typography_style_option_id) ===
                        String(style.typography_style_option_id)
                    );
                    return (
                      <TypographyEditItem
                        key={String(style.typography_style_id)}
                        style={style}
                        option={option}
                        fontOptions={fontOptions}
                        onUpdateTypography={handleUpdateTypography}
                      />
                    );
                  }
                })}
              </List>
            </>
          );

        // Preview
        return (
          <Card variant='outlined' sx={{ p: 0 }}>
            <List>
              {mergedItems.map((item) => {
                if (item.type === 'color') {
                  const color = item.data as PaletteColor;
                  const colorLabel =
                    (color.name as string) ||
                    USAGE_OPTIONS.find((opt) => opt.value === color.usage_option)?.label ||
                    'Color';

                  return (
                    <ColorPreviewItem
                      key={String(color.palette_color_id)}
                      color={color}
                      colorLabel={colorLabel}
                    />
                  );
                } else {
                  const style = item.data as TypographyStyle;
                  const option = typographyOptions?.find(
                    (opt) =>
                      String(opt.typography_style_option_id) ===
                      String(style.typography_style_option_id)
                  );
                  return (
                    <TypographyPreviewItem
                      key={String(style.typography_style_id)}
                      style={style}
                      option={option}
                    />
                  );
                }
              })}
            </List>
          </Card>
        );
      })()}
    </Box>
  );
}
