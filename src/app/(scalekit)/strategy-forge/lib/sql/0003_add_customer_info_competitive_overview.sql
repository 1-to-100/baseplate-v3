BEGIN;

ALTER TABLE public.customer_info
ADD COLUMN IF NOT EXISTS competitive_overview text;

UPDATE public.customer_info
SET competitive_overview = ''
WHERE competitive_overview IS NULL;

ALTER TABLE public.customer_info
ALTER COLUMN competitive_overview SET NOT NULL;

COMMIT;
