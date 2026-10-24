-- V5__set_finalmtt_first.sql: Ensure FinalMTT track appears first at top of playlist

UPDATE music_box_tracks
SET created_at = NOW() + INTERVAL '1 hour',
    updated_at = NOW()
WHERE id = 'a1b2c3d4-e5f6-47a8-b9c0-112233445566' OR file_name = 'FinalMTT(19-10).wav';
