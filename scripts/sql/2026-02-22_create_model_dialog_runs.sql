create table if not exists model_dialog_runs (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  model_id text not null,
  source_module text not null,
  input_summary text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_model_dialog_runs_user_created_at
  on model_dialog_runs(user_id, created_at desc);

create index if not exists idx_model_dialog_runs_status
  on model_dialog_runs(status);
