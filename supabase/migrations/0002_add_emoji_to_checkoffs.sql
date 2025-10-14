-- Add emoji column to checkoffs to persist the reward shown on completion
alter table checkoffs add column if not exists emoji text;
-- Optional: future queries may filter by emoji; no index needed now.

