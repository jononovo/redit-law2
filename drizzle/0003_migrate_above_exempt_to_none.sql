UPDATE rail4_cards
SET profile_permissions = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'human_permission_required' = 'above_exempt'
      THEN (elem - 'confirmation_exempt_limit' - 'human_permission_required') || '{"human_permission_required": "none"}'::jsonb
      ELSE elem - 'confirmation_exempt_limit'
    END
  )::text
  FROM jsonb_array_elements(profile_permissions::jsonb) AS elem
)
WHERE profile_permissions IS NOT NULL
  AND profile_permissions::jsonb @> '[{"human_permission_required": "above_exempt"}]'::jsonb;

UPDATE rail4_cards
SET profile_permissions = (
  SELECT jsonb_agg(elem - 'confirmation_exempt_limit')::text
  FROM jsonb_array_elements(profile_permissions::jsonb) AS elem
)
WHERE profile_permissions IS NOT NULL
  AND profile_permissions::text LIKE '%confirmation_exempt_limit%'
  AND NOT (profile_permissions::jsonb @> '[{"human_permission_required": "above_exempt"}]'::jsonb);
