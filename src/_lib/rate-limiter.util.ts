import { Logger } from '@nestjs/common';

export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private tokens: number;
  private lastRefillTime: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRate: number,
  ) {
    this.tokens = capacity;
    this.lastRefillTime = Date.now();
  }

  async consume(tokensNeeded = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return;
    }

    const waitTimeMs = ((tokensNeeded - this.tokens) / this.refillRate) * 1000;

    this.logger.log(
      `
        Rate limit: insufficient tokens (${this.tokens.toFixed(2)}/${this.capacity}). 
        Waiting ${Math.ceil(waitTimeMs / 1000)}s...
      `,
    );

    await new Promise((resolve) => setTimeout(resolve, waitTimeMs));

    this.refill();
    this.tokens -= tokensNeeded;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }
}
