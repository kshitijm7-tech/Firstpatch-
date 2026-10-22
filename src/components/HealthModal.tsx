/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HealthData {
  status: string;
  timestamp: string;
  config: {
    geminiApiKeyConfigured: boolean;
    gemmaModelConfigured: boolean;
    modelId: string | null;
    githubTokenConfigured: boolean;
  };
  service: string;
}

export const HealthModal: React.FC<HealthModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch('/api/health')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to reach /api/health');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Engine Configuration & Health</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
              Checking server configuration...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400">Server Health</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  {data.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400">Configured Model (GEMMA_MODEL)</span>
                <span className="text-xs font-mono font-medium text-indigo-300">
                  {data.config.modelId || 'Not Configured'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400">Gemini/Gemma API Key</span>
                {data.config.geminiApiKeyConfigured ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Present on Server
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Missing in Secrets
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-xs text-slate-400">GitHub Token (Optional)</span>
                {data.config.githubTokenConfigured ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active (High Rate Limit)
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-mono">
                    Unauthenticated (60 req/hr)
                  </span>
                )}
              </div>

              <div className="pt-2 flex items-start gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  No secret tokens or private keys are transmitted to client browsers.
                  Configuration is verified server-side.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
