export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryDelay: string,
    public readonly retryDelayMs: number,
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}
