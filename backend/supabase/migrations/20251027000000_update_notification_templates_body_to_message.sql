-- Migration: Update notification_templates table structure
-- Date: 2025-10-27
-- Changes:
--   1. Rename body column to message
--   2. Add comment column (nullable)
--   3. Add title column (not null)

-- Rename body column to message
alter table public.notification_templates 
  rename column body to message;

-- Add comment column (nullable text field)
alter table public.notification_templates 
  add column comment text;

-- Add title column (not null text field)
alter table public.notification_templates 
  add column title text not null default '';

-- Add comments for the new columns
comment on column public.notification_templates.comment is 
  'Optional comment or notes about the notification template';

comment on column public.notification_templates.title is 
  'Title of the notification template';

