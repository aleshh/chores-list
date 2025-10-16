-- Add day_part to chores to split daily chores into morning/evening
alter table chores add column if not exists day_part text check (day_part in ('morning','evening'));

-- Default existing daily chores to 'morning'
update chores set day_part = 'morning' where type = 'daily' and (day_part is null or day_part not in ('morning','evening'));

