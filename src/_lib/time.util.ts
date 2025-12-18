export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const oneSecondMs = 1_000;

export const oneMinuteMs = 60_000;

export const oneHourMs = 3_600_000;
