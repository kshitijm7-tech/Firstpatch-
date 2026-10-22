/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Clock, RefreshCw, XCircle, KeyRound, Globe, FileCode } from 'lucide-react';

interface ErrorAlertProps {
  error: string;
  code: string;
  resetTime?: string;
  onRetry?: () => void;
  onClear: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  code,
  resetTime,
  onRetry,
  onClear,
}) => {
  const getErrorMeta = () => {
    switch (code) {
      case 'INVALID_URL':
        return {
          title: 'Invalid GitHub Issue URL',
          icon: Globe,
          suggestion: 'Ensure the URL begins with https://github.com/{owner}/{repo}/issues/{number} and points to an open or closed issue.',
        };
      case 'PULL_REQUEST_NOT_SUPPORTED':
        return {
          title: 'Pull Requests Are Not Supported',
          icon: FileCode,
          suggestion: 'FirstPatch analyzes unaddressed GitHub issues. Please provide an issue URL instead of a pull request.',
        };
      case 'GITHUB_NOT_FOUND':
        return {
          title: 'Issue or Repository Not Found',
          icon: AlertTriangle,
          suggestion: 'Confirm that the repository and issue number exist, are publicly accessible, and have no typos.',
        };
      case 'GITHUB_RATE_LIMIT':
        return {
          title: 'GitHub API Rate Limit Reached',
          icon: Clock,
          suggestion: resetTime
            ? `GitHub's unauthenticated API quota is temporarily exhausted. Quota resets at ${resetTime}. For continuous usage, configure a GITHUB_TOKEN in your environment.`
            : 'GitHub rate limit exceeded. Please wait a moment or configure GITHUB_TOKEN.',
        };
      case 'MODEL_CONFIG_ERROR':
        return {
          title: 'Model Configuration Required',
          icon: KeyRound,
          suggestion: 'Set GEMMA_MODEL and GEMINI_API_KEY in your environment variables or the AI Studio Secrets panel.',
        };
      case 'MODEL_UNAVAILABLE':
        return {
          title: 'AI Model Temporarily Unavailable',
          icon: RefreshCw,
          suggestion: 'The model quota or API service is momentarily busy. Please try again in 10-30 seconds.',
        };
      case 'REQUEST_TIMEOUT':
        return {
          title: 'Operation Timed Out',
          icon: Clock,
          suggestion: 'GitHub API or the model request took longer than allowed. Please check your network connection and retry.',
        };
      default:
        return {
          title: 'Analysis Error',
          icon: XCircle,
          suggestion: 'An unexpected issue occurred while parsing repository context. Please check the URL and try again.',
        };
    }
  };

  const meta = getErrorMeta();
  const IconComponent = meta.icon;

  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 rounded-2xl bg-slate-900 border border-rose-500/30 shadow-2xl">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
          <IconComponent className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">
              {meta.title}
            </h2>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {code}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            {error}
          </p>

          <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Suggested Action: </span>
            {meta.suggestion}
          </div>

          <div className="mt-4 flex items-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Analysis</span>
              </button>
            )}
            <button
              onClick={onClear}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Back to Input
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
