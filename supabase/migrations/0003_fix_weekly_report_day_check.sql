-- The app writes 'sunday'/'monday' for weekly_report_day (used as the
-- "week starts on" setting), but the original check constraint only
-- allowed 'saturday'/'sunday', so saving 'monday' always failed.
update public.profiles set weekly_report_day = 'sunday' where weekly_report_day = 'saturday';

alter table public.profiles drop constraint profiles_weekly_report_day_check;
alter table public.profiles add constraint profiles_weekly_report_day_check
  check (weekly_report_day = any (array['sunday'::text, 'monday'::text]));
