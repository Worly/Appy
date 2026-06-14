import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { timeBetweenMs } from './time-utils';

dayjs.extend(duration);
dayjs.extend(customParseFormat);

const at = (hhmm: string) => dayjs(hhmm, "HH:mm");
const mins = (n: number) => dayjs.duration(n, "minutes");

describe('timeBetweenMs', () => {
  it('is positive for a gap (15 min)', () => {
    // 10:00 + 30m ends 10:30; next starts 10:45 → 15m gap
    expect(timeBetweenMs(at("10:00"), mins(30), at("10:45"), mins(30))).toBe(15 * 60 * 1000);
  });

  it('is zero for back-to-back', () => {
    expect(timeBetweenMs(at("10:00"), mins(30), at("10:30"), mins(30))).toBe(0);
  });

  it('is negative for an overlap (15 min)', () => {
    // 10:00 + 45m ends 10:45; next starts 10:30 → overlaps 15m
    expect(timeBetweenMs(at("10:00"), mins(45), at("10:30"), mins(30))).toBe(-15 * 60 * 1000);
  });

  it('handles multi-hour gaps (2h30m)', () => {
    expect(timeBetweenMs(at("09:00"), mins(60), at("12:30"), mins(30))).toBe(150 * 60 * 1000);
  });

  it('is negative for a fully-contained overlap (next starts inside a long prev)', () => {
    // 10:00 + 120m ends 12:00; next starts 10:30 → overlaps 90m, capped at nextDuration (30m)
    expect(timeBetweenMs(at("10:00"), mins(120), at("10:30"), mins(30))).toBe(-30 * 60 * 1000);
  });
});
