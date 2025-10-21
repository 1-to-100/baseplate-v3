INSERT INTO "public"."subscriptions" (
    "name",
    "description",
    "created_at",
    "updated_at"
  )
VALUES (
    'Free',
    'Perfect for individuals and small teams getting started',
    '2025-09-09 09:33:57.149+00',
    '2025-09-09 09:50:13.465+00'
  ),
  (
    'Starter',
    'Great for growing teams that need more resources',
    '2025-09-09 09:33:57.827+00',
    '2025-09-09 09:50:14.122+00'
  ),
  (
    'Professional',
    'For established teams that need comprehensive features',
    '2025-09-09 09:33:58.511+00',
    '2025-09-09 09:50:14.770+00'
  ),
  (
    'Enterprise',
    'For large organizations with custom requirements',
    '2025-09-09 09:33:59.170+00',
    '2025-09-09 09:50:15.421+00'
  )
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at;