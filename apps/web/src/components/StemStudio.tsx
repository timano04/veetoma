'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AudioJob } from '@/types/job';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Mic,
  Disc3,
  Guitar,
  Piano,
  Music,
  Sliders,
  Check
} from 'lucide-react';

interface StemStudioProps {
  job: AudioJob;
  onClose?: () => void;
}

interface StemTrack {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  barColor: string;
  bgGlow: string;
  url: string | null | undefined;
}

export function StemStudio({ job }: StemStudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Dynamic tracks based on what stems are available in this job
  const tracks: StemTrack[] = useMemo(() => {
    const allPossibleTracks: StemTrack[] = [
      {
        id: 'vocals',
        label: 'Vocals',
        icon: Mic,
        color: 'text-violet-400',
        barColor: 'bg-violet-400/80',
        bgGlow: 'from-violet-500/20',
        url: job.vocalsUrl,
      },
      {
        id: 'instrumental',
        label: 'Instrumental / Beat',
        icon: Music,
        color: 'text-teal-400',
        barColor: 'bg-teal-400/80',
        bgGlow: 'from-teal-500/20',
        url: job.instrumentalUrl,
      },
      {
        id: 'drums',
        label: 'Drums',
        icon: Disc3,
        color: 'text-amber-400',
        barColor: 'bg-amber-400/80',
        bgGlow: 'from-amber-500/20',
        url: job.drumsUrl,
      },
      {
        id: 'bass',
        label: 'Bass',
        icon: Guitar,
        color: 'text-cyan-400',
        barColor: 'bg-cyan-400/80',
        bgGlow: 'from-cyan-500/20',
        url: job.bassUrl,
      },
      {
        id: 'guitar',
        label: 'Guitar',
        icon: Guitar,
        color: 'text-rose-400',
        barColor: 'bg-rose-400/80',
        bgGlow: 'from-rose-500/20',
        url: job.guitarUrl,
      },
      {
        id: 'piano',
        label: 'Piano',
        icon: Piano,
        color: 'text-indigo-400',
        barColor: 'bg-indigo-400/80',
        bgGlow: 'from-indigo-500/20',
        url: job.pianoUrl,
      },
      {
        id: 'other',
        label: 'Other / Melodic',
        icon: Piano,
        color: 'text-emerald-400',
        barColor: 'bg-emerald-400/80',
        bgGlow: 'from-emerald-500/20',
        url: job.otherUrl,
      },
    ];

    const active = allPossibleTracks.filter((t) => !!t.url);
    // If no stems populated yet, default to standard 4 stems
    return active.length > 0 ? active : allPossibleTracks.filter((t) => ['vocals', 'drums', 'bass', 'other'].includes(t.id));
  }, [job]);

  // Per-stem audio elements
  const audioElementsRef = useRef<Record<string, HTMLAudioElement | null>>({});

  // Per-stem states
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [solos, setSolos] = useState<Record<string, boolean>>({});

  // Initialize track volume/mute/solo states
  useEffect(() => {
    const initVol: Record<string, number> = {};
    const initMute: Record<string, boolean> = {};
    const initSolo: Record<string, boolean> = {};

    tracks.forEach((t) => {
      initVol[t.id] = volumes[t.id] ?? 0.85;
      initMute[t.id] = mutes[t.id] ?? false;
      initSolo[t.id] = solos[t.id] ?? false;
    });

    setVolumes(initVol);
    setMutes(initMute);
    setSolos(initSolo);
  }, [tracks]);

  const hasActiveSolo = Object.values(solos).some(Boolean);

  // Synchronized playback controls
  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    Object.values(audioElementsRef.current).forEach((el) => {
      if (el) {
        if (nextState) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      }
    });
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    Object.values(audioElementsRef.current).forEach((el) => {
      if (el) {
        el.currentTime = time;
      }
    });
  };

  const handleRestart = () => {
    handleSeek(0);
    if (!isPlaying) togglePlay();
  };

  const toggleMute = (trackId: string) => {
    setMutes((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const toggleSolo = (trackId: string) => {
    setSolos((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const changeVolume = (trackId: string, val: number) => {
    setVolumes((prev) => ({ ...prev, [trackId]: val }));
  };

  // Sync volume & effective mute to audio elements
  useEffect(() => {
    tracks.forEach((track) => {
      const audioEl = audioElementsRef.current[track.id];
      if (!audioEl) return;

      const isMutedBySolo = hasActiveSolo && !solos[track.id];
      const isMutedDirectly = mutes[track.id];

      audioEl.muted = isMutedDirectly || isMutedBySolo;
      audioEl.volume = volumes[track.id] ?? 0.85;
    });
  }, [volumes, mutes, solos, hasActiveSolo, tracks]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const target = e.currentTarget;
    setCurrentTime(target.currentTime);
    if (!duration && target.duration) {
      setDuration(target.duration);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const profileBadge = tracks.length === 2
    ? '2 Stems (Vocal & Beat)'
    : tracks.length === 6
    ? '6 Stems Pro Studio Mix'
    : '4 Stems Standard Studio';

  return (
    <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-studio-700/80">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-studio-700/60 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Stem Isolation Mixer
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {profileBadge}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track: <span className="text-slate-200 font-medium">{job.originalFilename}</span> • {tracks.length} active channels
          </p>
        </div>

        {/* Master Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleRestart}
            className="p-2.5 rounded-xl bg-studio-800 hover:bg-studio-700 text-slate-300 border border-studio-700 active:scale-95 transition-all"
            title="Restart playback"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause Mixer</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Play All Stems</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Progress Bar */}
      <div className="py-4 border-b border-studio-800/80">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span>{formatTime(currentTime)}</span>
          <span className="text-slate-500">SYNCHRONIZED MASTER CLOCK</span>
          <span>{formatTime(duration || 180)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 180}
          step={0.1}
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          className="w-full h-2 bg-studio-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Dynamic Stems Tracks List */}
      <div className="grid grid-cols-1 gap-4 mt-6">
        {tracks.map((track, idx) => {
          const isSolo = !!solos[track.id];
          const isMuted = !!mutes[track.id] || (hasActiveSolo && !isSolo);
          const Icon = track.icon;

          return (
            <div
              key={track.id}
              className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col md:flex-row items-center gap-4 ${
                isMuted
                  ? 'bg-studio-900/40 border-studio-800/60 opacity-60'
                  : 'bg-studio-850/80 border-studio-700/60 hover:border-studio-600 shadow-md'
              }`}
            >
              {/* Synchronized audio element */}
              {track.url && (
                <audio
                  ref={(el) => {
                    audioElementsRef.current[track.id] = el;
                  }}
                  src={track.url}
                  preload="metadata"
                  onTimeUpdate={idx === 0 ? handleTimeUpdate : undefined}
                  onEnded={() => {
                    if (idx === 0) setIsPlaying(false);
                  }}
                />
              )}

              {/* Track Info Badge */}
              <div className="flex items-center gap-3 w-full md:w-56 shrink-0">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${track.bgGlow} to-transparent border border-studio-700 flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${track.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-wide">
                    {track.label}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    44.1kHz • 24-bit PCM
                  </span>
                </div>
              </div>

              {/* Waveform visualizer */}
              <div className="flex-1 w-full h-12 flex items-center gap-1 px-4 bg-studio-900/80 rounded-xl border border-studio-800/80 overflow-hidden">
                {Array.from({ length: 36 }).map((_, barIdx) => {
                  const barHeight = isPlaying && !isMuted
                    ? `${20 + ((barIdx * 17 + idx * 23) % 75)}%`
                    : '12%';

                  return (
                    <div
                      key={barIdx}
                      style={{ height: barHeight }}
                      className={`flex-1 rounded-full transition-all duration-150 ${
                        isMuted ? 'bg-studio-700/50' : track.barColor
                      }`}
                    />
                  );
                })}
              </div>

              {/* Controls: Solo, Mute, Volume */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                <button
                  onClick={() => toggleSolo(track.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSolo
                      ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                      : 'bg-studio-800 text-slate-400 hover:text-white border border-studio-700'
                  }`}
                >
                  SOLO
                </button>

                <button
                  onClick={() => toggleMute(track.id)}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    mutes[track.id]
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-studio-800 text-slate-300 hover:text-white border border-studio-700'
                  }`}
                  title={mutes[track.id] ? 'Unmute' : 'Mute'}
                >
                  {mutes[track.id] ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volumes[track.id] ?? 0.85}
                    onChange={(e) => changeVolume(track.id, parseFloat(e.target.value))}
                    className="w-20 sm:w-24 h-1.5 bg-studio-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                </div>

                {/* Download Button */}
                {track.url ? (
                  <a
                    href={track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`${job.originalFilename}_${track.id}.wav`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-studio-800 hover:bg-studio-700 text-slate-200 border border-studio-700 transition-all shrink-0"
                    title={`Download ${track.label} stem`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-500 px-2 font-mono">No stem</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
