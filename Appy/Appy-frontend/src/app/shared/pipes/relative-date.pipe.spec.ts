import dayjs from 'dayjs';
import { dateDayDiff, getDateRelation, RelativeDatePipe } from './relative-date.pipe';
import { TranslateService } from 'src/app/components/translate/translate.service';

const EN: { [key: string]: string } = {
  'relativeDate.TODAY': 'Today',
  'relativeDate.TOMORROW': 'Tomorrow',
  'relativeDate.YESTERDAY': 'Yesterday',
  'relativeDate.IN_DAYS': 'in {n} days',
  'relativeDate.DAYS_AGO': '{n} days ago',
};
const fakeTranslate = { translate: (k: string) => EN[k] ?? k } as unknown as TranslateService;

describe('dateDayDiff', () => {
  it('is 0 for today', () => {
    const now = dayjs();
    expect(dateDayDiff(now, now)).toBe(0);
  });
  it('ignores time of day', () =>
    expect(dateDayDiff(dayjs().endOf('day'), dayjs().startOf('day'))).toBe(0));
  it('is +3 three days ahead', () => expect(dateDayDiff(dayjs().add(3, 'day'))).toBe(3));
  it('is -2 two days ago', () => expect(dateDayDiff(dayjs().subtract(2, 'day'))).toBe(-2));
});

describe('getDateRelation', () => {
  it('today', () => expect(getDateRelation(dayjs())).toBe('today'));
  it('future', () => expect(getDateRelation(dayjs().add(1, 'day'))).toBe('future'));
  it('past', () => expect(getDateRelation(dayjs().subtract(1, 'day'))).toBe('past'));
});

describe('RelativeDatePipe', () => {
  let pipe: RelativeDatePipe;
  beforeEach(() => (pipe = new RelativeDatePipe(fakeTranslate)));

  it('returns null for null/undefined/invalid', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
    expect(pipe.transform(dayjs('not-a-date'))).toBeNull();
  });
  it('today', () => expect(pipe.transform(dayjs())).toBe('Today'));
  it('late today still reads Today', () =>
    expect(pipe.transform(dayjs().endOf('day'))).toBe('Today'));
  it('tomorrow', () => expect(pipe.transform(dayjs().add(1, 'day'))).toBe('Tomorrow'));
  it('yesterday', () => expect(pipe.transform(dayjs().subtract(1, 'day'))).toBe('Yesterday'));
  it('in N days', () => expect(pipe.transform(dayjs().add(5, 'day'))).toBe('in 5 days'));
  it('N days ago', () => expect(pipe.transform(dayjs().subtract(4, 'day'))).toBe('4 days ago'));
});

import { DateRelationPipe } from './date-relation.pipe';

describe('DateRelationPipe', () => {
  let pipe: DateRelationPipe;
  beforeEach(() => (pipe = new DateRelationPipe()));

  it('returns null for null/undefined', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
  });
  it('today', () => expect(pipe.transform(dayjs())).toBe('today'));
  it('future', () => expect(pipe.transform(dayjs().add(2, 'day'))).toBe('future'));
  it('past', () => expect(pipe.transform(dayjs().subtract(2, 'day'))).toBe('past'));
});
