/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TopBar } from './components/TopBar.js';
import { IssueInput } from './components/IssueInput.js';
import { ProgressIndicator } from './components/ProgressIndicator.js';
import { ErrorAlert } from './components/ErrorAlert.js';
import { GuideView } from './components/GuideView.js';
import { HealthModal } from './components/HealthModal.js';
import type { FullAnalysisResult } from './schema.js';

export default function App() {
  const [result, setResult] = useState<FullAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUrl, setLastUrl] = useState<string>('');
  const [errorState, setErrorState] = useState<{
    message: string;
    code: string;
    resetTime?: string;
  } | null>(null);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setErrorState(null);
    setLastUrl(url);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorState({
          message: data.error || 'Failed to analyze repository issue.',
          code: data.code || `HTTP_${response.status}`,
          resetTime: data.resetTime,
        });
        setResult(null);
      } else {
        setResult(data as FullAnalysisResult);
        setActiveTab('overview');
      }
    } catch (err: unknown) {
      setErrorState({
        message: 'Could not communicate with the analysis server. Please check your network and try again.',
        code: 'NETWORK_ERROR',
      });
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setErrorState(null);
    setIsLoading(false);
  };

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    const elementId =
      tab === 'trail'
        ? 'section-impact-trail'
        : tab === 'facts'
        ? 'section-facts'
        : tab === 'files'
        ? 'section-files'
        : tab === 'plan'
        ? 'section-plan'
        : tab === 'tests'
        ? 'section-tests'
        : 'root';

    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <TopBar
        onReset={handleReset}
        onOpenHealth={() => setIsHealthOpen(true)}
        hasResult={result !== null}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start">
        {/* Error Banner */}
        {errorState && (
          <div className="px-4">
            <ErrorAlert
              error={errorState.message}
              code={errorState.code}
              resetTime={errorState.resetTime}
              onRetry={lastUrl ? () => handleAnalyze(lastUrl) : undefined}
              onClear={handleReset}
            />
          </div>
        )}

        {/* Loading Progress */}
        <ProgressIndicator isLoading={isLoading} />

        {/* Issue Input Form (shown when not viewing a result and not loading) */}
        {!result && !isLoading && (
          <IssueInput onAnalyze={handleAnalyze} isLoading={isLoading} />
        )}

        {/* Complete Guide View */}
        {result && !isLoading && (
          <GuideView
            result={result}
            onAnalyzeNew={handleReset}
            activeTab={activeTab}
          />
        )}
      </main>

      {/* System Status / Health Modal */}
      <HealthModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>FirstPatch — Evidence-backed open-source contribution engine</span>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Read-Only</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Execution</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsHealthOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              System Health
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
