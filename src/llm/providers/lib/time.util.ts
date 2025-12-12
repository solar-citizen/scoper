import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

export function convertToMilliseconds(time?: string) {
  if (!time) {
    return 0;
  }

  const match = /^(\d+)([smhd])$/i.exec(time);

  if (!match) {
    console.error(`Invalid time string format: ${time}`);
    return 0;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const base = dayjs.duration({ [unit]: value }).asMilliseconds();

  const buffer = dayjs.duration({ [unit]: 1 }).asMilliseconds();

  return base + buffer;
}

export const isHourDelay = (delay: string) => /h/i.test(delay);
