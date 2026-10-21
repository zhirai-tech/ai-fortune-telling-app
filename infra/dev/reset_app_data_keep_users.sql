BEGIN;
TRUNCATE TABLE
  public.divination_records,
  public.daily_fortunes,
  public.redeem_codes,
  public.ai_provider_configs
RESTART IDENTITY CASCADE;
COMMIT;
