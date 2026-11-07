-- Migration: index food_entries by user and day.
-- food_entries had no index on user_id or entry_date, so every per-user,
-- per-date read (the diary, usage-ranked food search, recent and top foods)
-- scanned the whole table. INCLUDE (food_id) lets the food search usage score
-- be read from the index alone.

CREATE INDEX IF NOT EXISTS idx_food_entries_user_entry_date
    ON public.food_entries (user_id, entry_date)
    INCLUDE (food_id);
