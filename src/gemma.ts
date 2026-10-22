/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import {
  ModelConfigError,
  ModelOutputValidationError,
  ModelUnavailableError,
} from './errors.js';
import { GuideSchema, type RawModelGuide } from './schema.js';

/**
 * Normalizes and strips any accidental Markdown code blocks from JSON output.
 */
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Invokes the configured Gemma model using the @google/genai SDK.
 * Executes validation against GuideSchema and supports a single corrective retry if required.
 */
export async function generateContributionGuide(
  prompt: string
): Promise<{ guide: RawModelGuide; modelId: string; provider: 'google' | 'ollama'; fallbackUsed: boolean }> {
  const failures: Error[] = [];
  try {
    const modelId = requireGemmaConfig();
    const guide = await invokeGoogle(prompt, modelId);
    return { guide, modelId, provider: 'google', fallbackUsed: false };
  } catch (err) {
    failures.push(err instanceof Error ? err : new Error(String(err)));
  }

  if (process.env.OLLAMA_ENABLED === 'true') {
    const candidates = [
      ['OLLAMA_PHI_MODEL', process.env.OLLAMA_PHI_MODEL?.trim()],
      ['OLLAMA_LLAMA_MODEL', process.env.OLLAMA_LLAMA_MODEL?.trim()],
    ] as const;
    for (const [envName, modelId] of candidates) {
      if (!modelId) {
        failures.push(new ModelConfigError(`${envName} is not configured for Ollama fallback.`));
        continue;
      }
      try {
        const guide = await invokeOllama(prompt, modelId);
        return { guide, modelId, provider: 'ollama', fallbackUsed: true };
      } catch (err) {
        failures.push(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  const last = failures[failures.length - 1];
  if (last instanceof ModelConfigError) throw last;
  throw new ModelUnavailableError('Gemma 4 was unavailable and configured Ollama fallbacks could not produce a valid guide.');
}

function requireGemmaConfig(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new ModelConfigError('Server configuration missing: GEMINI_API_KEY is not configured in environment or Secrets.');
  const modelId = process.env.GEMMA_MODEL?.trim();
  if (!modelId) throw new ModelConfigError('Server configuration missing: GEMMA_MODEL is not configured.');
  if (!/^(?:(?:models\/)?|google\/)gemma[-:]4(?:[-:].*)?$/i.test(modelId)) {
    throw new ModelConfigError('Server configuration must use an accessible Gemma 4 model in GEMMA_MODEL.');
  }
  return modelId;
}

async function invokeGoogle(prompt: string, modelId: string): Promise<RawModelGuide> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim(), httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  try {
    const response = await ai.models.generateContent({ model: modelId, contents: prompt, config: { responseMimeType: 'application/json', temperature: 0.2 } });
    const first = attemptParseAndValidate(response.text || '');
    if (first.success) return first.data;
    const retry = await ai.models.generateContent({ model: modelId, contents: `${prompt}\n\nReturn valid JSON only. Previous validation error: ${first.error}`, config: { responseMimeType: 'application/json', temperature: 0.1 } });
    const second = attemptParseAndValidate(retry.text || '');
    if (second.success) return second.data;
    throw new ModelOutputValidationError(`Model output failed schema validation after corrective retry. Reason: ${second.error}`);
  } catch (err: unknown) {
    if (err instanceof ModelOutputValidationError) throw err;
    const message = String((err as Error)?.message || '');
    if (message.includes('404') || /not found|not accessible/i.test(message)) throw new ModelConfigError(`The configured model "${modelId}" was not found or is not accessible with the current API credentials.`);
    if (message.includes('429') || /quota|ResourceExhausted/i.test(message)) throw new ModelUnavailableError('AI model quota exceeded or rate limit reached.');
    throw new ModelUnavailableError('The AI model service encountered a temporary error while processing the request.');
  }
}

async function invokeOllama(prompt: string, modelId: string): Promise<RawModelGuide> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const baseUrl = (process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434').replace(/\/$/, '');
    const request = async (content: string) => fetch(`${baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: modelId, stream: false, format: 'json', options: { temperature: 0.1, num_ctx: 16384 }, messages: [{ role: 'user', content }] }), signal: controller.signal });
    const response = await request(prompt);
    if (!response.ok) throw new ModelUnavailableError(`Ollama model "${modelId}" is unavailable.`);
    const data = await response.json() as { message?: { content?: string } };
    const parsed = attemptParseAndValidate(data.message?.content || '');
    if (parsed.success) return parsed.data;
    const retry = await request(`${prompt}\n\nReturn only JSON matching the requested schema. Validation error: ${parsed.error}`);
    if (!retry.ok) throw new ModelUnavailableError(`Ollama model "${modelId}" is unavailable.`);
    const retryData = await retry.json() as { message?: { content?: string } };
    const retryParsed = attemptParseAndValidate(retryData.message?.content || '');
    if (!retryParsed.success) throw new ModelOutputValidationError(`Ollama output failed schema validation after retry: ${retryParsed.error}`);
    return retryParsed.data;
  } catch (err) {
    if (err instanceof ModelOutputValidationError || err instanceof ModelUnavailableError) throw err;
    throw new ModelUnavailableError(`Ollama model "${modelId}" could not be reached.`);
  } finally {
    clearTimeout(timer);
  }
}

function attemptParseAndValidate(
  text: string
): { success: true; data: RawModelGuide } | { success: false; error: string } {
  try {
    const cleaned = cleanJsonOutput(text);
    const parsed = JSON.parse(cleaned);
    const validated = GuideSchema.safeParse(parsed);

    if (validated.success) {
      return { success: true, data: validated.data };
    } else {
      const errorDetails = validated.error.issues
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
        .join('; ');
      return { success: false, error: errorDetails };
    }
  } catch (jsonErr) {
    return {
      success: false,
      error: `JSON parse error: ${(jsonErr as Error).message}`,
    };
  }
}
