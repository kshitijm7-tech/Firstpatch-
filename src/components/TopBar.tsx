/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Shield } from 'lucide-react';

interface TopBarProps {
  onReset: () => void;
  onOpenHealth: () => void;
  hasResult: boolean;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onReset,
  onOpenHealth,
  hasResult,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
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
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      {hasResult && onSelectTab ? (
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
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
            onClick={() => onSelectTab('facts')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'facts'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Verified Facts
          </button>
          <button
            onClick={() => onSelectTab('files')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'files'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Relevant Files
          </button>
          <button
            onClick={() => onSelectTab('plan')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'plan'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Contribution Plan
          </button>
          <button
            onClick={() => onSelectTab('tests')}
            className={`whitespace-nowrap transition-colors ${
              activeTab === 'tests'
                ? 'text-white font-semibold border-b-2 border-indigo-500 pb-0.5'
                : 'hover:text-slate-200'
            }`}
          >
            Suggested Tests
          </button>
        </nav>
      ) : (
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            Bounded GitHub Reads
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>Zero Code Execution</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>Server-Side Grounding</span>
        </div>
      )}

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenHealth}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500"
          title="Inspect Engine Health & Configuration"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>System Status</span>
        </button>

        {hasResult && (
          <button
            onClick={onReset}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-indigo-950 focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Analyze New Issue
          </button>
        )}
      </div>
    </header>
  );
};
