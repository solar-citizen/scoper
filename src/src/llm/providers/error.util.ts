import { GoogleGenerativeAIError } from '@google/generative-ai';
import type { ErrorResponse } from 'ollama';

function isOllamaError(err: unknown): err is ErrorResponse {
  return typeof err === 'object' && err !== null && 'error' in err;
}

export function getOllamaErrorMessage(err: unknown): string {
  return isOllamaError(err) ? err.error : 'Unknown error occurred';
}

export function getGeminiErrorMessage(err: unknown): string {
  return err instanceof GoogleGenerativeAIError || err instanceof Error
    ? err.message
    : 'Unknown error occurred';
}
