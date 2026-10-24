-- V4__add_goigam_track_and_samurai_cover.sql: Add Goi Gam track and update FinalMTT cover to samurai

-- 1. Update FinalMTT cover to samurai artwork
UPDATE music_box_tracks
SET cover_url = 'http://localhost:8080/api/files/music/covers/samurai.jpg',
    updated_at = NOW()
WHERE id = 'a1b2c3d4-e5f6-47a8-b9c0-112233445566';

-- 2. Insert Goi Gam track
INSERT INTO music_box_tracks (
    id,
    title,
    artist,
    album,
    duration_seconds,
    file_name,
    audio_url,
    cover_url,
    genre,
    file_size_bytes,
    format,
    created_at,
    updated_at
) VALUES (
    'd4e5f6a7-b8c9-40d1-e2f3-445566778899',
    'Gối Gấm (Timano Remake)',
    'Phương Mỹ Chi (Timano Remake)',
    'Vũ Trụ Cò Bay (Remake)',
    228,
    'GoiGam - PhuongMyChi - TimanoRemake.mp3',
    'http://localhost:8080/api/files/music/GoiGam - PhuongMyChi - TimanoRemake.mp3',
    'http://localhost:8080/api/files/music/covers/goigam.jpg',
    'Folk Pop / Electronic',
    5498933,
    'MP3',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE 
SET title = EXCLUDED.title,
    artist = EXCLUDED.artist,
    album = EXCLUDED.album,
    file_name = EXCLUDED.file_name,
    audio_url = EXCLUDED.audio_url,
    cover_url = EXCLUDED.cover_url,
    genre = EXCLUDED.genre,
    file_size_bytes = EXCLUDED.file_size_bytes,
    format = EXCLUDED.format,
    updated_at = NOW();
