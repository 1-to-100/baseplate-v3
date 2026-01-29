-- Migration: Add narrative_voice and emotional_tone fields to style_guides

-- ============================================
-- Step 1: Create emotional_tone_option_items table
-- ============================================
CREATE TABLE IF NOT EXISTS public.emotional_tone_option_items (
  emotional_tone_option_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- Step 2: Populate emotional_tone_option_items with default values
-- ============================================
INSERT INTO public.emotional_tone_option_items (name, display_name, description, sort_order, is_active) 
VALUES
  ('warm', 'Warm', 'Friendly and welcoming tone that makes readers feel comfortable', 1, true),
  ('neutral', 'Neutral', 'Balanced and professional tone without strong emotion', 2, true),
  ('enthusiastic', 'Enthusiastic', 'Energetic and passionate tone that shows excitement', 3, true),
  ('serious', 'Serious', 'Formal and authoritative tone that conveys importance', 4, true),
  ('empathetic', 'Empathetic', 'Understanding and compassionate tone that shows care', 5, true),
  ('confident', 'Confident', 'Assured and self-assured tone that inspires trust', 6, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Step 3: Add narrative_voice column to style_guides
-- ============================================
ALTER TABLE public.style_guides 
ADD COLUMN IF NOT EXISTS narrative_voice TEXT;

-- ============================================
-- Step 4: Add emotional_tone_option_item_id column to style_guides
-- ============================================
ALTER TABLE public.style_guides 
ADD COLUMN IF NOT EXISTS emotional_tone_option_item_id UUID;

-- ============================================
-- Step 5: Add foreign key constraint
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'style_guides_emotional_tone_option_item_id_fkey'
  ) THEN
    ALTER TABLE public.style_guides
    ADD CONSTRAINT style_guides_emotional_tone_option_item_id_fkey 
    FOREIGN KEY (emotional_tone_option_item_id) 
    REFERENCES public.emotional_tone_option_items(emotional_tone_option_item_id);
  END IF;
END $$;

-- ============================================
-- Step 6: Add index for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_style_guides_emotional_tone 
ON public.style_guides(emotional_tone_option_item_id);

-- ============================================
-- Step 7: Enable RLS and add policies
-- ============================================
ALTER TABLE public.emotional_tone_option_items ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'emotional_tone_option_items' 
    AND policyname = 'Allow all users to read emotional tone options'
  ) THEN
    CREATE POLICY "Allow all users to read emotional tone options"
    ON public.emotional_tone_option_items
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- ============================================
-- Step 8: Grant permissions
-- ============================================
GRANT SELECT ON public.emotional_tone_option_items TO authenticated;
GRANT SELECT ON public.emotional_tone_option_items TO anon;

-- ============================================
-- Step 9: Refresh schema cache (important!)
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- Verification - Run these separately after migration
-- ============================================
-- SELECT COUNT(*) as emotional_tone_options FROM public.emotional_tone_option_items;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'style_guides' AND column_name IN ('narrative_voice', 'emotional_tone_option_item_id');
