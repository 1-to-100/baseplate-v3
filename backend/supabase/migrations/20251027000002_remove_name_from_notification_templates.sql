-- Migration: Remove name and subject columns from notification_templates
-- Date: 2025-10-27
-- Changes:
--   1. Drop name column from notification_templates table
--   2. Drop subject column from notification_templates table

-- Remove name column from notification_templates
alter table public.notification_templates 
  drop column if exists name;

-- Remove subject column from notification_templates
alter table public.notification_templates 
  drop column if exists subject;
