-- Migration: Update notification_templates and notifications type columns to array
-- Date: 2025-10-27
-- Changes:
--   1. Change notification_templates.type to array and set NOT NULL
--   2. Change notifications.type to array and keep NOT NULL

-- Update notification_templates: change type column to array and set NOT NULL
alter table public.notification_templates 
  alter column type type NotificationType[] using array[type],
  alter column type set not null;

-- Update comment for notification_templates.type column
comment on column public.notification_templates.type is 
  'Array of notification types (email, in_app) for this template';

-- Update notifications: change type column to array and keep NOT NULL
alter table public.notifications 
  alter column type type NotificationType[] using array[type];

-- Update comment for notifications.type column
comment on column public.notifications.type is 
  'Array of notification types (email, in_app) for this notification';
