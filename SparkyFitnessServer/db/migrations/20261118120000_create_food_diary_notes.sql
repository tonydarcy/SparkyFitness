-- Migration: Create food_diary_notes, one free-text note per person per diary
-- day (how the day went, why intake was off, anything worth remembering when
-- looking back). Diary data: delegates with diary access can read and write it.
-- Date: 2026-11-18

CREATE TABLE IF NOT EXISTS public.food_diary_notes (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    -- An empty note is never stored: clearing the note deletes the row.
    note TEXT NOT NULL CHECK (char_length(note) BETWEEN 1 AND 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    updated_by_user_id UUID REFERENCES public."user"(id) ON DELETE SET NULL,
    CONSTRAINT uq_food_diary_notes_user_date UNIQUE (user_id, entry_date)
);
