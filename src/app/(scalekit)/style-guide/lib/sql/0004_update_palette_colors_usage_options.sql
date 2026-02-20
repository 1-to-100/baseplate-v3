-- Migrate palette_colors.usage_option from old options to JoyUI standard:
-- primary -> primary, secondary -> neutral, foreground -> neutral, background -> neutral, accent -> warning
-- Must DROP constraint BEFORE UPDATE: the old constraint rejects 'neutral'/'warning'.

ALTER TABLE public.palette_colors
  DROP CONSTRAINT IF EXISTS palette_colors_usage_option_check;

UPDATE public.palette_colors
SET usage_option = CASE usage_option
  WHEN 'primary' THEN 'primary'
  WHEN 'secondary' THEN 'neutral'
  WHEN 'foreground' THEN 'neutral'
  WHEN 'background' THEN 'neutral'
  WHEN 'accent' THEN 'warning'
  ELSE usage_option
END
WHERE usage_option IN ('primary', 'secondary', 'foreground', 'background', 'accent');

ALTER TABLE public.palette_colors
  ADD CONSTRAINT palette_colors_usage_option_check
  CHECK (usage_option IN ('primary', 'neutral', 'danger', 'success', 'warning'));

COMMENT ON COLUMN public.palette_colors.usage_option IS
  'Semantic usage category (JoyUI): primary, neutral, danger, success, warning';
