import { AudioJob, CreateJobPayload } from '@/types/job';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/jobs';
const SERVER_BASE = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8080';

export function resolveModelName(profile: string): string {
  if (profile === '2' || profile === 'two_stems') return 'htdemucs_2s';
  if (profile === '6' || profile === 'six_stems') return 'htdemucs_6s';
  if (profile === '4' || profile === 'standard') return 'htdemucs';
  return profile || 'htdemucs';
}

/**
 * Uploads an audio file with chosen stem separation profile to Spring Boot Core API.
 * Uses direct backend connection with automatic proxy fallback.
 */
export async function uploadAudioJob(file: File, profile: string = 'htdemucs'): Promise<AudioJob> {
  const modelName = resolveModelName(profile);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('modelName', modelName);
  formData.append('autoRun', 'true');
  formData.append('autoSimulate', 'false');

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Server returned HTTP ${res.status}: ${errText || res.statusText}`);
    }
    return await res.json();
  } catch (directErr: any) {
    console.warn('Direct upload failed, attempting Next.js proxy rewrite...', directErr);
    try {
      const proxyRes = await fetch('/api/proxy/jobs/upload', {
        method: 'POST',
        body: formData,
      });
      if (!proxyRes.ok) {
        const errText = await proxyRes.text().catch(() => '');
        throw new Error(errText || `Server returned HTTP ${proxyRes.status}`);
      }
      return await proxyRes.json();
    } catch (proxyErr: any) {
      const msg = proxyErr?.message || directErr?.message || 'Failed to upload audio file';
      throw new Error(msg);
    }
  }
}

// Backward-compatible alias
export const uploadAudioFile = uploadAudioJob;

/**
 * Retrieves the current status and stems metadata for an Audio Job by ID.
 */
export async function getJobStatus(jobId: string): Promise<AudioJob> {
  try {
    const res = await fetch(`${API_BASE}/${jobId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch {
    const proxyRes = await fetch(`/api/proxy/jobs/${jobId}`, { cache: 'no-store' });
    if (!proxyRes.ok) {
      throw new Error('Unable to retrieve job status');
    }
    return await proxyRes.json();
  }
}

// Backward-compatible alias
export const fetchJobById = getJobStatus;

/**
 * Fetches the entire pipeline history of audio jobs.
 */
export async function fetchJobs(): Promise<AudioJob[]> {
  try {
    const res = await fetch(`${API_BASE}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const proxyRes = await fetch('/api/proxy/jobs', { cache: 'no-store' });
    if (!proxyRes.ok) throw new Error('Unable to fetch jobs list');
    return await proxyRes.json();
  }
}

/**
 * Generates direct streaming URL for a separated stem.
 */
export function getStemStreamUrl(jobId: string, stemName: string): string {
  const cleanName = stemName.endsWith('.wav') ? stemName : `${stemName}.wav`;
  return `/api/stems/${jobId}/${cleanName}`;
}

/**
 * Triggers background simulation (for testing/demo).
 */
export async function triggerSimulation(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/${id}/simulate`, { method: 'POST' });
  } catch {
    await fetch(`/api/proxy/jobs/${id}/simulate`, { method: 'POST' });
  }
}

export async function createJob(payload: CreateJobPayload): Promise<AudioJob> {
  try {
    const res = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const proxyRes = await fetch('/api/proxy/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!proxyRes.ok) throw new Error('Failed to create job');
    return await proxyRes.json();
  }
}

export interface MusicBoxTrackDTO {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds?: number;
  fileName: string;
  audioUrl: string;
  coverUrl: string;
  genre?: string;
  fileSizeBytes?: number;
  format?: string;
}

/**
 * Fetches the independent music tracks list from Music Box API.
 */
export async function fetchMusicBoxTracks(): Promise<MusicBoxTrackDTO[]> {
  try {
    const res = await fetch(`${SERVER_BASE}/api/music-box/tracks`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (directErr) {
    console.warn('Direct fetchMusicBoxTracks failed, trying proxy rewrite...', directErr);
    try {
      const proxyRes = await fetch('/api/proxy/music-box/tracks', { cache: 'no-store' });
      if (!proxyRes.ok) throw new Error('Unable to fetch music box tracks');
      return await proxyRes.json();
    } catch {
      return [];
    }
  }
}

/**
 * Silently pings the backend and Modal GPU worker in the background to pre-warm the container.
 * When the user arrives on the AI Stem Studio page, this warms up the Demucs container with min_containers=0.
 */
export async function prewarmWorker(): Promise<void> {
  try {
    // Ping via direct backend URL or Next.js proxy rewrite without blocking UI
    fetch(`${API_BASE}/warmup`, { method: 'GET', keepalive: true }).catch(() => {
      fetch('/api/proxy/jobs/warmup', { method: 'GET', keepalive: true }).catch(() => {});
    });
  } catch {}
}

