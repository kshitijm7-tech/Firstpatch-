/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Shield, User, Compass, SearchCode, Sparkles } from 'lucide-react';

export type AppView = 'passport' | 'discovery' | 'analyzer';

interface TopBarProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  onReset: () => void;
  onOpenHealth: () => void;
  hasResult: boolean;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  githubUsername?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onSelectView,
  onReset,
  onOpenHealth,
  hasResult,
  activeTab,
  onSelectTab,
  githubUsername,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
      {/* Zone 1: Logo & App Switcher */}
      <div className="flex items-center gap-6 shrink-0">
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/30 transition-colors">
            <span className="font-mono font-bold text-sm tracking-tighter">1P</span>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap block">
              FirstPatch
            </span>
          </div>
        </button>

        {/* Primary View Switcher */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => onSelectView('passport')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentView === 'passport'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Passport</span>
            {githubUsername && (
              <span className="hidden sm:inline-block font-mono text-[10px] opacity-80">
                @{githubUsername}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectView('discovery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentView === 'discovery'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover</span>
          </button>

          <button
            onClick={() => onSelectView('analyzer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentView === 'analyzer'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SearchCode className="w-3.5 h-3.5" />
            <span>Investigate Issue</span>
          </button>
        </nav>
      </div>

      {/* Zone 2: Sub-tabs when analyzing an issue */}
      {currentView === 'analyzer' && hasResult && onSelectTab ? (
        <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-400">
          <button
            onClick={() => onSelectTab('overview')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onSelectTab('trail')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'trail'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Impact Trail
          </button>
          <button
            onClick={() => onSelectTab('pathway')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'pathway'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Learning Pathway
          </button>
          <button
            onClick={() => onSelectTab('facts')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'facts'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Facts
          </button>
          <button
            onClick={() => onSelectTab('files')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'files'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Files
          </button>
          <button
            onClick={() => onSelectTab('plan')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'plan'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Plan
          </button>
          <button
            onClick={() => onSelectTab('tests')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'tests'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Tests (NOT RUN)
          </button>
        </nav>
      ) : (
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-indigo-400/90">
            <Shield className="w-3.5 h-3.5" />
            Evidence-Backed
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>Zero Local Code Execution</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>Gemma 4 Guided</span>
        </div>
      )}

      {/* Zone 3: Actions & System Health */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenHealth}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500"
          title="Inspect Engine Health & Configuration"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">System Status</span>
        </button>

        {currentView === 'analyzer' && hasResult && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-indigo-950 focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            New Issue
          </button>
        )}
      </div>
    </header>
  );
};
