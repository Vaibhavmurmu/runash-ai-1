-- One-time backfill from users.bio.sellerSettings to public.seller_settings.
-- Safe to rerun; keeps existing structured values if legacy blob fields are missing.

INSERT INTO public.seller_settings (
  user_id,
  business_name,
  business_type,
  description,
  business_hours,
  delivery_radius,
  minimum_order,
  return_policy,
  payment_methods,
  shipping_options,
  certifications,
  updated_at
)
SELECT
  u.id AS user_id,
  COALESCE(NULLIF(u.bio::jsonb -> 'sellerSettings' ->> 'businessName', ''), COALESCE(u.name, '')) AS business_name,
  COALESCE(NULLIF(u.bio::jsonb -> 'sellerSettings' ->> 'businessType', ''), 'organic-farm') AS business_type,
  COALESCE(u.bio::jsonb -> 'sellerSettings' ->> 'description', '') AS description,
  COALESCE(u.bio::jsonb -> 'sellerSettings' ->> 'businessHours', '') AS business_hours,
  COALESCE(u.bio::jsonb -> 'sellerSettings' ->> 'deliveryRadius', '') AS delivery_radius,
  COALESCE(u.bio::jsonb -> 'sellerSettings' ->> 'minimumOrder', '') AS minimum_order,
  COALESCE(u.bio::jsonb -> 'sellerSettings' ->> 'returnPolicy', '') AS return_policy,
  COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(u.bio::jsonb -> 'sellerSettings' -> 'paymentMethods', '["credit_card"]'::jsonb))
    ),
    ARRAY['credit_card']::text[]
  ) AS payment_methods,
  COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(u.bio::jsonb -> 'sellerSettings' -> 'shippingOptions', '["local_delivery"]'::jsonb))
    ),
    ARRAY['local_delivery']::text[]
  ) AS shipping_options,
  COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(u.bio::jsonb -> 'sellerSettings' -> 'certifications', '[]'::jsonb))
    ),
    ARRAY[]::text[]
  ) AS certifications,
  NOW() AS updated_at
FROM public.users u
WHERE u.role = 'seller'
  AND u.bio IS NOT NULL
  AND (u.bio::jsonb ? 'sellerSettings')
ON CONFLICT (user_id)
DO UPDATE SET
  business_name = COALESCE(NULLIF(EXCLUDED.business_name, ''), public.seller_settings.business_name),
  business_type = COALESCE(NULLIF(EXCLUDED.business_type, ''), public.seller_settings.business_type),
  description = COALESCE(EXCLUDED.description, public.seller_settings.description),
  business_hours = COALESCE(EXCLUDED.business_hours, public.seller_settings.business_hours),
  delivery_radius = COALESCE(EXCLUDED.delivery_radius, public.seller_settings.delivery_radius),
  minimum_order = COALESCE(EXCLUDED.minimum_order, public.seller_settings.minimum_order),
  return_policy = COALESCE(EXCLUDED.return_policy, public.seller_settings.return_policy),
  payment_methods = COALESCE(EXCLUDED.payment_methods, public.seller_settings.payment_methods),
  shipping_options = COALESCE(EXCLUDED.shipping_options, public.seller_settings.shipping_options),
  certifications = COALESCE(EXCLUDED.certifications, public.seller_settings.certifications),
  updated_at = NOW();
