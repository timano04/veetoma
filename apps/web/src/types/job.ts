export type AudioJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface AudioJob {
  id: string;
  userId?: string | null;
  originalFilename: string;
  inputFileUrl: string;
  status: AudioJobStatus;
  modelName?: string;
  stemCount?: number;
  vocalsUrl?: string | null;
  drumsUrl?: string | null;
  bassUrl?: string | null;
  otherUrl?: string | null;
  guitarUrl?: string | null;
  pianoUrl?: string | null;
  instrumentalUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPayload {
  originalFilename: string;
  inputFileUrl?: string;
  userId?: string;
  modelName?: string;
  stemCount?: number;
}

export interface SeparationProfile {
  id: 'htdemucs_2s' | 'htdemucs' | 'htdemucs_6s';
  name: string;
  badge: string;
  description: string;
  stemCount: number;
  stems: string[];
}

export interface StudioSpace {
  id: string;
  title: string;
  step: 1 | 2 | 3 | 4;
  file: File | null;
  filePreviewUrl: string | null;
  profile: 'htdemucs_2s' | 'htdemucs' | 'htdemucs_6s';
  jobId: string | null;
  job: AudioJob | null;
  error: string | null;
}
