-- V1__init_schema.sql: Initialize App Users and Audio Jobs tables for Veetoma

-- Enable extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table for managing application users
CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table for managing audio processing and stem separation jobs
CREATE TABLE audio_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    original_filename VARCHAR(255) NOT NULL,
    input_file_url TEXT NOT NULL, -- Original audio file URL on Cloudflare R2
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED', -- Status flow: QUEUED, RUNNING, SUCCEEDED, FAILED

-- Store isolated audio stems URLs after AI processing (Vocals, Drums, Bass, Other)
vocals_url TEXT,
    drums_url TEXT,
    bass_url TEXT,
    other_url TEXT,
    
    error_message TEXT, -- Store error logs if AI processing fails
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes to optimize query performance by User ID and Job Status
CREATE INDEX idx_audio_jobs_user_id ON audio_jobs (user_id);

CREATE INDEX idx_audio_jobs_status ON audio_jobs (status);