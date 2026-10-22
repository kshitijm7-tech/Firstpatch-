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
): Promise<{ guide: RawModelGuide; modelId: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new ModelConfigError(
      'Server configuration missing: GEMINI_API_KEY is not configured in environment or Secrets.'
    );
  }

  const modelId = process.env.GEMMA_MODEL?.trim();
  if (!modelId) {
    throw new ModelConfigError(
      'Server configuration missing: GEMMA_MODEL is not configured. Please set GEMMA_MODEL in your environment variables or Secrets panel.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let rawOutputText = '';

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    rawOutputText = response.text || '';
  } catch (err: unknown) {
    const errMsg = (err as Error)?.message || '';
    if (errMsg.includes('404') || errMsg.includes('not found')) {
      throw new ModelConfigError(
        `The configured model "${modelId}" was not found or is not accessible with the current API credentials.`
      );
    }
    if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand')) {
      throw new ModelUnavailableError(
        'The AI model service is currently experiencing temporary high demand. Please try again in 10-20 seconds.'
      );
    }
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('ResourceExhausted')) {
      throw new ModelUnavailableError(
        'AI model quota exceeded or rate limit reached. Please check your AI Studio quota or try again in a few minutes.'
      );
    }
    throw new ModelUnavailableError(
      'The AI model service encountered a temporary error while processing the request. Please try again.'
    );
  }

  if (!rawOutputText) {
    throw new ModelOutputValidationError('The model returned an empty response.');
  }

  // Attempt 1: Parse and validate
  const firstParseResult = attemptParseAndValidate(rawOutputText);
  if (firstParseResult.success) {
    return { guide: firstParseResult.data, modelId };
  }

  // Single corrective retry if initial response failed schema validation
  const retryPrompt = `${prompt}

[SYSTEM NOTICE - PREVIOUS ATTEMPT FAILED VALIDATION]:
Your previous JSON output did not pass validation:
Errors: ${firstParseResult.error}

Please regenerate the full JSON response adhering strictly to the JSON schema. Return only valid JSON.`;

  try {
    const retryResponse = await ai.models.generateContent({
      model: modelId,
      contents: retryPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const retryText = retryResponse.text || '';
    const retryParseResult = attemptParseAndValidate(retryText);

    if (retryParseResult.success) {
      return { guide: retryParseResult.data, modelId };
    }

    throw new ModelOutputValidationError(
      `Model output failed schema validation after corrective retry. Reason: ${retryParseResult.error}`
    );
  } catch (err) {
    if (err instanceof ModelOutputValidationError) throw err;
    throw new ModelUnavailableError(
      'Model service error during corrective validation retry.'
    );
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
