export class GithubRateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs: number,
    public readonly isSecondary = false,
  ) {
    super(message);
    this.name = 'GithubRateLimitError';
  }
}
