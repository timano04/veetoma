-- V3__create_music_box_tracks.sql: Table for dedicated Music Box audio tracks and metadata

CREATE TABLE music_box_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL DEFAULT 'Unknown Artist',
    album VARCHAR(255),
    duration_seconds INT NOT NULL DEFAULT 0,
    file_name VARCHAR(255) NOT NULL,
    audio_url TEXT NOT NULL,
    cover_url TEXT,
    genre VARCHAR(100),
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    format VARCHAR(20) NOT NULL DEFAULT 'WAV',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_music_box_tracks_created_at ON music_box_tracks (created_at DESC);

-- Seed initial tracks including the user's real FinalMTT(19-10).wav
INSERT INTO music_box_tracks (id, title, artist, album, duration_seconds, file_name, audio_url, cover_url, genre, file_size_bytes, format)
VALUES 
    (
        'a1b2c3d4-e5f6-47a8-b9c0-112233445566',
        'FinalMTT (19-10)',
        'Veetoma Master Series',
        'Original Mixes',
        240,
        'FinalMTT(19-10).wav',
        'http://localhost:8080/api/files/music/FinalMTT(19-10).wav',
        'http://localhost:8080/api/files/music/covers/finalmtt.png',
        'Electronic / Master',
        105973442,
        'WAV'
    ),
    (
        'b2c3d4e5-f6a7-48b9-c0d1-223344556677',
        'Happy Money (OST Trời Buồn Ngủ Quá)',
        'Chí',
        'Film Soundtrack',
        214,
        'Happy_Money.mp3',
        'http://localhost:8080/api/files/music/Happy_Money.mp3',
        'http://localhost:8080/api/files/music/covers/happy_money.jpg',
        'Indie Pop / OST',
        8573027,
        'MP3'
    ),
    (
        'c3d4e5f6-a7b8-49c0-d1e2-334455667788',
        'Nhất Bái Thiên Địa',
        'The Flob (prod. CHIN)',
        'The Flob Singles',
        214,
        'The_Flob_Nhat_Bai.mp3',
        'http://localhost:8080/api/files/music/The_Flob_Nhat_Bai.mp3',
        'http://localhost:8080/api/files/music/covers/the_flob.jpg',
        'Alternative Rock',
        8573027,
        'MP3'
    )
ON CONFLICT (id) DO NOTHING;
