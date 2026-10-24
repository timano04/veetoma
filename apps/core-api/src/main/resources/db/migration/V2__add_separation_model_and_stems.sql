-- V2__add_separation_model_and_stems.sql: Support 2, 4, and 6 stems separation profiles

ALTER TABLE audio_jobs
    ADD COLUMN IF NOT EXISTS model_name VARCHAR(50) NOT NULL DEFAULT 'htdemucs',
    ADD COLUMN IF NOT EXISTS stem_count INT NOT NULL DEFAULT 4,
    ADD COLUMN IF NOT EXISTS guitar_url TEXT,
    ADD COLUMN IF NOT EXISTS piano_url TEXT,
    ADD COLUMN IF NOT EXISTS instrumental_url TEXT;
