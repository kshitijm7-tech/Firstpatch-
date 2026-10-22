/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TopBar, type AppView } from './components/TopBar.js';
import { IssueInput } from './components/IssueInput.js';
import { ProgressIndicator } from './components/ProgressIndicator.js';
import { ErrorAlert } from './components/ErrorAlert.js';
import { GuideView } from './components/GuideView.js';
import { HealthModal } from './components/HealthModal.js';
import { PassportView } from './components/Passport/PassportView.js';
import { IssueDiscoveryView } from './components/Discovery/IssueDiscoveryView.js';
import { DeveloperPassportSchema, type FullAnalysisResult, type DeveloperPassport, type GitHubProfileIntelligence } from './schema.js';

const STORAGE_KEY_PASSPORT = 'firstpatch_passport_v1';

const DEFAULT_PASSPORT: DeveloperPassport = {
  github_username: '',
  languages: ['TypeScript', 'JavaScript', 'Node.js'],
  frameworks: ['React', 'Express', 'Tailwind CSS'],
  want_to_learn: ['AST Parsers', 'Compiler Design', 'Distributed Systems'],
  preferred_domains: ['Developer Tools', 'Web Frameworks', 'CLI Tools'],
  experience_level: 'intermediate',
  learning_goals: 'Contribute to developer tools, understand source ASTs, and master open-source conventions.',
  preferred_difficulty: 'intermediate',
  available_time: '3-5 hours/week',
};

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('analyzer');
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

  // Developer Passport State & LocalStorage Persistence
  const [passport, setPassport] = useState<DeveloperPassport>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY_PASSPORT) : null;
      if (saved) {
        const parsed = DeveloperPassportSchema.safeParse(JSON.parse(saved));
        if (parsed.success) return { ...DEFAULT_PASSPORT, ...parsed.data };
      }
    } catch { /* Use defaults when browser storage is unavailable or corrupt. */ }
    return DEFAULT_PASSPORT;
  });

  const [profileIntel, setProfileIntel] = useState<GitHubProfileIntelligence | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passportStorageStatus, setPassportStorageStatus] = useState<'saved' | 'unavailable'>('saved');

  // Sync passport changes to localStorage
  const handleUpdatePassport = (updated: DeveloperPassport) => {
    setPassport(updated);
    try {
      window.localStorage.setItem(STORAGE_KEY_PASSPORT, JSON.stringify(updated));
      setPassportStorageStatus('saved');
    } catch { setPassportStorageStatus('unavailable'); }
  };

  // Fetch GitHub profile intelligence
  const handleLoadGitHubProfile = async (username: string) => {
    if (!username.trim()) return;
    setIsLoadingProfile(true);
    setProfileError(null);
    setProfileIntel(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), passport }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.intelligence) {
        throw new Error(data.error || 'GitHub profile evidence could not be loaded.');
      }
      setProfileIntel(data.intelligence);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'GitHub profile evidence could not be loaded.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setErrorState(null);
    setLastUrl(url);
    setCurrentView('analyzer');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          passport,
        }),
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
    setCurrentView('analyzer');
  };

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    const elementId =
      tab === 'trail'
        ? 'section-impact-trail'
        : tab === 'pathway'
        ? 'section-learning-pathway'
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
        currentView={currentView}
        onSelectView={setCurrentView}
        onReset={handleReset}
        onOpenHealth={() => setIsHealthOpen(true)}
        hasResult={result !== null}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        githubUsername={passport.github_username}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start">
        {/* Error Banner */}
        {errorState && (
          <div className="px-4 max-w-4xl mx-auto w-full pt-4">
            <ErrorAlert
              error={errorState.message}
              code={errorState.code}
              resetTime={errorState.resetTime}
              onRetry={lastUrl ? () => handleAnalyze(lastUrl) : undefined}
              onClear={handleReset}
            />
          </div>
        )}

        {/* View 1: Developer Passport View */}
        {currentView === 'passport' && (
          <PassportView
            passport={passport}
            onUpdatePassport={handleUpdatePassport}
            profileIntel={profileIntel}
            isLoadingProfile={isLoadingProfile}
            profileError={profileError}
            passportStorageStatus={passportStorageStatus}
            onLoadGitHubProfile={handleLoadGitHubProfile}
            onGoToDiscovery={() => setCurrentView('discovery')}
          />
        )}

        {/* View 2: Personalized Issue Discovery View */}
        {currentView === 'discovery' && (
          <IssueDiscoveryView
            passport={passport}
            onSelectIssue={(issueUrl) => {
              handleAnalyze(issueUrl);
            }}
            onEditPassport={() => setCurrentView('passport')}
          />
        )}

        {/* View 3: Issue Investigation View */}
        {currentView === 'analyzer' && (
          <>
            {/* Loading Progress */}
            <ProgressIndicator isLoading={isLoading} />

            {/* Issue Input Form (shown when not viewing a result and not loading) */}
            {!result && !isLoading && (
              <div className="space-y-6">
                <IssueInput onAnalyze={handleAnalyze} isLoading={isLoading} />

                {/* Quick Passport Discovery Callout */}
                <div className="max-w-3xl mx-auto px-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-200">
                        Looking for an issue matching your experience level?
                      </p>
                      <p className="text-slate-400">
                        FirstPatch discovers issues and ranks them against your Developer Passport.
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentView('discovery')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-semibold transition-colors shrink-0 whitespace-nowrap"
                    >
                      Browse Discoveries →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Guide View */}
            {result && !isLoading && (
              <GuideView
                result={result}
                onAnalyzeNew={handleReset}
                activeTab={activeTab}
                onEditPassport={() => setCurrentView('passport')}
              />
            )}
          </>
        )}
      </main>

      {/* System Status / Health Modal */}
      <HealthModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>FirstPatch — Evidence-backed open-source contribution engine</span>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Developer Passport</span>
            <span aria-hidden="true">·</span>
            <span>Impact Trail</span>
            <span aria-hidden="true">·</span>
            <span>Zero Local Execution</span>
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
