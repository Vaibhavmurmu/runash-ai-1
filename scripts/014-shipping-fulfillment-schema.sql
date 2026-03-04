-- Shipping fulfillment schema for seller shipment lifecycle and reconciliation workers.

create table if not exists public.shipments (
  id bigserial primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  seller_user_id bigint not null,
  provider text not null,
  service_level text not null,
  status text not null default 'draft',
  tracking_number text,
  tracking_url text,
  label_url text,
  package_weight_grams integer,
  exception_reason text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shipments_order_id on public.shipments(order_id);
create index if not exists idx_shipments_seller_user_id on public.shipments(seller_user_id);
create index if not exists idx_shipments_tracking_number on public.shipments(tracking_number);
create index if not exists idx_shipments_status on public.shipments(status);

create table if not exists public.shipment_tracking_events (
  id bigserial primary key,
  shipment_id bigint not null references public.shipments(id) on delete cascade,
  event_type text not null,
  event_code text not null,
  status text not null,
  location text,
  event_timestamp timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_shipment_tracking_events_shipment_id on public.shipment_tracking_events(shipment_id);
create index if not exists idx_shipment_tracking_events_timestamp on public.shipment_tracking_events(event_timestamp desc);

create table if not exists public.fulfillment_tasks (
  id bigserial primary key,
  shipment_id bigint not null references public.shipments(id) on delete cascade,
  task_type text not null,
  payload jsonb not null default '{}'::jsonb,
  run_after timestamptz not null default now(),
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fulfillment_tasks_run_after on public.fulfillment_tasks(status, run_after);
create index if not exists idx_fulfillment_tasks_shipment_id on public.fulfillment_tasks(shipment_id);
