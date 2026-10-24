'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Sparkles, CheckCircle2, AlertCircle, Mic, Layers, Guitar, Sliders } from 'lucide-react';
import { uploadAudioFile, createJob } from '@/lib/api';
import { AudioJob, SeparationProfile } from '@/types/job';

interface UploadZoneProps {
  onJobCreated: (job: AudioJob) => void;
}

const PROFILES: SeparationProfile[] = [
  {
    id: 'htdemucs_2s',
    name: '2 Stems (Vocal & Instrumental)',
    badge: 'Karaoke / Sample',
    description: 'Tách riêng Vocals & Toàn bộ Beat nhạc nền',
    stemCount: 2,
    stems: ['🎤 Vocals', '🎼 Instrumental']
  },
  {
    id: 'htdemucs',
    name: '4 Stems (Standard Studio)',
    badge: 'Khuyên dùng',
    description: 'Tách chuẩn 4 nguồn âm thanh độc lập',
    stemCount: 4,
    stems: ['🎤 Vocals', '🥁 Drums', '🎸 Bass', '🎹 Other']
  },
  {
    id: 'htdemucs_6s',
    name: '6 Stems (Guitar & Pro Studio)',
    badge: 'Pro Producer',
    description: 'Chuyên sâu tách thêm Guitar điện/acoustic & Piano',
    stemCount: 6,
    stems: ['🎤 Vocals', '🥁 Drums', '🎸 Bass', '🎸 Guitar', '🎹 Piano', '🎹 Other']
  }
];

export function UploadZone({ onJobCreated }: UploadZoneProps) {
  const [selectedModel, setSelectedModel] = useState<'htdemucs_2s' | 'htdemucs' | 'htdemucs_6s'>('htdemucs');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProfile = PROFILES.find((p) => p.id === selectedModel) || PROFILES[1];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) {
      setError('Please upload a valid audio file (.mp3, .wav, .flac, .m4a)');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setSuccessMsg(null);
      const job = await uploadAudioFile(file, selectedModel);
      setSuccessMsg(`"${file.name}" uploaded successfully! Enqueued with ${activeProfile.name}.`);
      onJobCreated(job);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Check backend connection.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleCreateDemoJob = async () => {
    try {
      setIsUploading(true);
      setError(null);
      const demoNames = [
        'Neon_Dreams_Master_Mix.wav',
        'Cyberpunk_Bassline_Session.mp3',
        'Acoustic_Guitar_Harmony.wav',
        'Tokyo_Midnight_Funk.mp3'
      ];
      const randomName = demoNames[Math.floor(Math.random() * demoNames.length)];
      const stems = selectedModel === 'htdemucs_6s' ? 6 : selectedModel === 'htdemucs_2s' ? 2 : 4;
      const job = await createJob({
        originalFilename: randomName,
        inputFileUrl: `https://storage.veetoma.io/demo/${randomName}`,
        modelName: selectedModel,
        stemCount: stems
      });
      setSuccessMsg(`Created demo job "${randomName}" with ${activeProfile.name}.`);
      onJobCreated(job);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create sample job');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. Separation Profile Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PROFILES.map((profile) => {
          const isSelected = selectedModel === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setSelectedModel(profile.id)}
              className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-500/10 scale-[1.01]'
                  : 'bg-studio-900/60 border-studio-700/60 hover:border-studio-600 hover:bg-studio-850/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white tracking-wide">
                  {profile.name}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isSelected
                      ? 'bg-indigo-500/30 text-indigo-300 border-indigo-400/30'
                      : 'bg-studio-800 text-slate-400 border-studio-700'
                  }`}
                >
                  {profile.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1">{profile.description}</p>
              <div className="flex flex-wrap gap-1 mt-2.5">
                {profile.stems.map((s) => (
                  <span
                    key={s}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-200'
                        : 'bg-studio-800/80 text-slate-400'
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center ${
          isDragging
            ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
            : 'border-studio-700/80 bg-studio-900/40 hover:border-indigo-500/50 hover:bg-studio-850/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />

        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-indigo-500/10">
            {isUploading ? (
              <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white tracking-wide">
              {isUploading ? 'Uploading & Processing audio track...' : 'Drop your audio track here'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Supports MP3, WAV, FLAC, M4A up to 100MB • Mode:{' '}
              <span className="text-indigo-300 font-medium">{activeProfile.name}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {activeProfile.stems.map((stem) => (
              <span
                key={stem}
                className="px-3 py-1 rounded-full text-xs font-medium bg-studio-800 text-slate-300 border border-studio-700"
              >
                {stem}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Demo Trigger & Alerts */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          {error && (
            <span className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </span>
          )}
          {successMsg && (
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCreateDemoJob();
          }}
          disabled={isUploading}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-indigo-500/10 border border-indigo-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Test ({activeProfile.badge})</span>
        </button>
      </div>
    </div>
  );
}
