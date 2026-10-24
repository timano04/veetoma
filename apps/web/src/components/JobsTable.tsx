'use client';

import React from 'react';
import { AudioJob, AudioJobStatus } from '@/types/job';
import { Play, Clock, CheckCircle, XCircle, Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';
import { triggerSimulation } from '@/lib/api';

interface JobsTableProps {
  jobs: AudioJob[];
  selectedJobId: string | null;
  onSelectJob: (job: AudioJob) => void;
  onJobUpdated: () => void;
}

export function JobsTable({ jobs, selectedJobId, onSelectJob, onJobUpdated }: JobsTableProps) {
  const getStatusBadge = (status: AudioJobStatus) => {
    switch (status) {
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            QUEUED
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            RUNNING
          </span>
        );
      case 'SUCCEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            SUCCEEDED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const handleSimulate = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    await triggerSimulation(jobId);
    setTimeout(() => {
      onJobUpdated();
    }, 500);
  };

  if (jobs.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-studio-700/60">
        <p className="text-slate-400 text-sm">No audio separation jobs yet.</p>
        <p className="text-xs text-slate-500 mt-1">Upload a music track above to start isolating stems.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-studio-700/60 shadow-xl shadow-black/20">
      <div className="px-6 py-4 border-b border-studio-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Audio Separation Pipeline
          </h2>
        </div>
        <span className="text-xs text-slate-400">{jobs.length} total tasks</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-studio-700/40 bg-studio-900/60 text-xs uppercase text-slate-400">
              <th className="py-3 px-6 font-medium">Track Name</th>
              <th className="py-3 px-6 font-medium">Status</th>
              <th className="py-3 px-6 font-medium">Stems Available</th>
              <th className="py-3 px-6 font-medium">Created At</th>
              <th className="py-3 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-studio-800/60">
            {jobs.map((job) => {
              const isSelected = selectedJobId === job.id;
              const hasStems = !!(job.vocalsUrl || job.drumsUrl || job.bassUrl || job.otherUrl);

              return (
                <tr
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/10 hover:bg-indigo-600/15'
                      : 'hover:bg-studio-800/40'
                  }`}
                >
                  <td className="py-4 px-6 font-medium text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-studio-800 border border-studio-700 flex items-center justify-center shrink-0">
                        <Play className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="text-slate-100 font-medium truncate max-w-xs sm:max-w-md">
                          {job.originalFilename}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ID: {job.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6">
                    {getStatusBadge(job.status)}
                  </td>

                  <td className="py-4 px-6">
                    {job.status === 'SUCCEEDED' ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>
                          {job.stemCount === 6 || job.guitarUrl
                            ? '6 Stems Ready (Pro Mix)'
                            : job.stemCount === 2 || job.instrumentalUrl
                            ? '2 Stems Ready (Vocal/Beat)'
                            : '4 Stems Ready (V/D/B/O)'}
                        </span>
                      </div>
                    ) : job.status === 'RUNNING' ? (
                      <span className="text-xs text-cyan-400/90 font-mono">
                        Inferencing ({job.stemCount === 6 ? '6 Stems' : job.stemCount === 2 ? '2 Stems' : '4 Stems'})...
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Pending ({job.stemCount === 6 ? '6 Stems' : job.stemCount === 2 ? '2 Stems' : '4 Stems'})
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-6 text-xs text-slate-400">
                    {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.status === 'QUEUED' && (
                        <button
                          type="button"
                          onClick={(e) => handleSimulate(e, job.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all"
                          title="Simulate AI worker separation"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Simulate AI</span>
                        </button>
                      )}

                      {job.status === 'SUCCEEDED' && (
                        <button
                          type="button"
                          onClick={() => onSelectJob(job)}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-studio-700/80 hover:bg-studio-700 text-slate-200'
                          }`}
                        >
                          <span>Open Mixer</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
