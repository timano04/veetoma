'use client';

import React from 'react';
import { Radio, Database, Cpu, RefreshCw, Music2, Disc3, Sliders } from 'lucide-react';

interface HeaderProps {
  activeTab: 'studio' | 'musicbox';
  onTabChange: (tab: 'studio' | 'musicbox') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalJobs: number;
}

export function DashboardHeader({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  totalJobs,
}: HeaderProps) {
  return (
    <header className="border-b border-studio-700/60 bg-studio-900/70 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between py-4">
        {/* Brand & Main Navigation Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-studio-950 rounded-[10px] flex items-center justify-center">
                <Music2 className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Veetoma
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Stem Studio
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">AI Audio Source Separation Platform</p>
            </div>
          </div>

          {/* 2 Main Navigation Tabs */}
          <nav className="flex items-center p-1 rounded-xl bg-studio-950/80 border border-studio-700/60">
            <button
              type="button"
              onClick={() => onTabChange('studio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'studio'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>AI Stem Studio</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('musicbox')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'musicbox'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-studio-850/60'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Music Box</span>
              {totalJobs > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-studio-800 text-slate-300">
                  {totalJobs}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* System Status Indicators & Action Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-850/80 border border-studio-700/50 text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Neon DB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-850/80 border border-studio-700/50 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Core API</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-studio-850/80 border border-studio-700/50 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Demucs v4</span>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-studio-800 hover:bg-studio-700 active:scale-95 text-slate-200 transition-all border border-studio-600/40 disabled:opacity-50"
            title="Refresh jobs and status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
