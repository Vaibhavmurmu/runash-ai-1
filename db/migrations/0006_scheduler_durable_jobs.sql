CREATE TABLE IF NOT EXISTS scheduler_schedules (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  frequency text NOT NULL,
  recipients text,
  format text NOT NULL DEFAULT 'CSV',
  job_type text NOT NULL DEFAULT 'report_generation',
  active boolean NOT NULL DEFAULT true,
  next_run_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduler_job_queue (
  id uuid PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES scheduler_schedules(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  idempotency_key text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  lock_token text,
  locked_at timestamptz,
  next_retry_at timestamptz,
  processed_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS scheduler_workflow_runs (
  id uuid PRIMARY KEY,
  queue_id uuid REFERENCES scheduler_job_queue(id) ON DELETE SET NULL,
  schedule_id uuid NOT NULL REFERENCES scheduler_schedules(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  idempotency_key text NOT NULL,
  state text NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key)
);

CREATE TABLE IF NOT EXISTS scheduler_execution_logs (
  id bigserial PRIMARY KEY,
  schedule_id uuid REFERENCES scheduler_schedules(id) ON DELETE CASCADE,
  queue_id uuid REFERENCES scheduler_job_queue(id) ON DELETE SET NULL,
  workflow_run_id uuid REFERENCES scheduler_workflow_runs(id) ON DELETE SET NULL,
  level text NOT NULL,
  message text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduler_worker_leases (
  lease_name text PRIMARY KEY,
  worker_id text NOT NULL,
  leased_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_schedules_next_run ON scheduler_schedules(next_run_at) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_scheduler_job_queue_due ON scheduler_job_queue(COALESCE(next_retry_at, due_at), status);
CREATE INDEX IF NOT EXISTS idx_scheduler_workflow_runs_schedule_started ON scheduler_workflow_runs(schedule_id, started_at DESC);
