/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ShieldCheck, Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react';

interface IssueInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
}

const VERIFIED_EXAMPLES = [
  {
    label: 'expressjs/express #7538',
    url: 'https://github.com/expressjs/express/issues/7538',
    desc: 'res.send() with non-Uint8Array typed array data handling',
  },
  {
    label: 'vitejs/vite #23860',
    url: 'https://github.com/vitejs/vite/issues/23860',
    desc: 'this.addWatchFile in load hook on first module request',
  },
  {
    label: 'vitejs/vite #23848',
    url: 'https://github.com/vitejs/vite/issues/23848',
    desc: 'Nested worker bundling concurrency when workers start simultaneously',
  },
];

export const IssueInput: React.FC<IssueInputProps> = ({ onAnalyze, isLoading }) => {
  const [url, setUrl] = useState('');
  const [validationHint, setValidationHint] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setValidationHint('Please enter a GitHub issue URL.');
      return;
    }
    if (!trimmed.includes('github.com')) {
      setValidationHint('URL must be on github.com (e.g. https://github.com/owner/repo/issues/123).');
      return;
    }
    if (trimmed.includes('/pull/')) {
      setValidationHint('FirstPatch analyzes issues, not pull requests. Please provide an issue URL.');
      return;
    }
    setValidationHint(null);
    onAnalyze(trimmed);
  };

  const handleSelectExample = (exampleUrl: string) => {
    setUrl(exampleUrl);
    setValidationHint(null);
    onAnalyze(exampleUrl);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-16">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Evidence-Backed OSS Contribution Engine</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 [text-wrap:balance]">
          Turn GitHub issues into ready-to-code contribution plans.
        </h1>
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto [text-wrap:balance]">
          FirstPatch inspects real repository code, verifies facts against file snapshots,
          and generates structured step-by-step contribution plans grounded in repository evidence.
        </p>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 flex items-center pl-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (validationHint) setValidationHint(null);
                }}
                disabled={isLoading}
                placeholder="https://github.com/owner/repo/issues/123"
                className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none py-2 font-mono"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-semibold text-sm transition-all whitespace-nowrap shrink-0 shadow-md shadow-indigo-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Repository...</span>
                </>
              ) : (
                <>
                  <span>Analyze Issue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {validationHint && (
          <p className="mt-2 text-xs text-rose-400 font-medium px-2">
            {validationHint}
          </p>
        )}
      </form>

      {/* Verified Examples */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Verified Public Issues to Try:
          </span>
          <span className="text-xs text-slate-500">Live GitHub snapshots</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {VERIFIED_EXAMPLES.map((ex) => (
            <button
              key={ex.url}
              type="button"
              onClick={() => handleSelectExample(ex.url)}
              disabled={isLoading}
              className="text-left p-3 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all group flex items-start justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div className="min-w-0">
                <span className="font-mono text-xs font-semibold text-indigo-300 group-hover:text-indigo-200 block truncate">
                  {ex.label}
                </span>
                <span className="text-xs text-slate-400 block truncate mt-0.5">
                  {ex.desc}
                </span>
              </div>
              <CornerDownLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0 mt-1 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Security & Integrity Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-slate-300">
            Read-Only & Server-Isolated Integrity Guarantee
          </p>
          <p className="text-slate-400 leading-relaxed">
            FirstPatch reads public metadata and repository files using GitHub REST APIs.
            No repositories are cloned, no shell commands or tests are executed, and no writes or pull requests are generated.
            API keys and tokens remain exclusively on the server.
          </p>
        </div>
      </div>
    </div>
  );
};
