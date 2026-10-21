const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveDay, getMonthsToShow, getTodayInJST } = require('../src/calendar.js');
const { renderCalendarHTML } = require('../src/calendar-render.js');

const baseCalendar = {
  weekly_pattern: {
    monday: 'closed',
    tuesday: 'open',
    wednesday: 'open',
    thursday: 'open',
    friday: 'open',
    saturday: 'open',
    sunday: 'open'
  },
  confirmed_until: '2026-11-15',
  exceptions: []
};

test('resolveDay: 通常営業日はweekly_patternのとおり', () => {
  const day = resolveDay(baseCalendar, '2026-10-01'); // 木曜日
  assert.equal(day.status, 'open');
  assert.equal(day.weekday, 'thursday');
});

test('resolveDay: 通常休業日はweekly_patternのとおり', () => {
  const day = resolveDay(baseCalendar, '2026-10-05'); // 月曜日
  assert.equal(day.status, 'closed');
  assert.equal(day.weekday, 'monday');
});

test('resolveDay: 例外で通常営業日を休業にできる', () => {
  const calendar = {
    ...baseCalendar,
    exceptions: [{ date: '2026-10-01', status: 'closed', note: '' }]
  };
  const day = resolveDay(calendar, '2026-10-01');
  assert.equal(day.status, 'closed');
});

test('resolveDay: 例外で通常休業日を営業にできる（メモ付き）', () => {
  const calendar = {
    ...baseCalendar,
    exceptions: [{ date: '2026-10-05', status: 'open', note: '祝日ですが営業します' }]
  };
  const day = resolveDay(calendar, '2026-10-05');
  assert.equal(day.status, 'open');
  assert.equal(day.note, '祝日ですが営業します');
});

test('resolveDay: statusのない例外はメモのみ適用し通常の状態を保つ', () => {
  const calendar = {
    ...baseCalendar,
    exceptions: [{ date: '2026-10-01', note: '15時に閉店します' }]
  };
  const day = resolveDay(calendar, '2026-10-01');
  assert.equal(day.status, 'open');
  assert.equal(day.note, '15時に閉店します');
});

test('resolveDay: 同じ日付の例外が重複したら配列の最後を優先する', () => {
  const calendar = {
    ...baseCalendar,
    exceptions: [
      { date: '2026-10-01', status: 'closed', note: '古い情報' },
      { date: '2026-10-01', status: 'open', note: '最新の情報' }
    ]
  };
  const day = resolveDay(calendar, '2026-10-01');
  assert.equal(day.status, 'open');
  assert.equal(day.note, '最新の情報');
});

test('resolveDay: weekly_patternに曜日が無ければ安全側でclosedとみなす', () => {
  const calendar = { ...baseCalendar, weekly_pattern: { tuesday: 'open' } };
  const day = resolveDay(calendar, '2026-10-01'); // 木曜日のキーが無い
  assert.equal(day.status, 'closed');
});

test('resolveDay: confirmed_untilが無ければ常に未確定', () => {
  const calendar = { ...baseCalendar, confirmed_until: undefined };
  const day = resolveDay(calendar, '2026-10-01');
  assert.equal(day.provisional, true);
});

test('resolveDay: confirmed_until以前は確定、以降は未確定', () => {
  const before = resolveDay(baseCalendar, '2026-11-15');
  const after = resolveDay(baseCalendar, '2026-11-16');
  assert.equal(before.provisional, false);
  assert.equal(after.provisional, true);
});

test('getMonthsToShow: 今月と来月の2か月だけ返す', () => {
  const months = getMonthsToShow(baseCalendar, '2026-10-15');
  assert.equal(months.length, 2);
  assert.equal(months[0].year, 2026);
  assert.equal(months[0].month, 10);
  assert.equal(months[0].days.length, 31);
  assert.equal(months[1].year, 2026);
  assert.equal(months[1].month, 11);
  assert.equal(months[1].days.length, 30);
});

test('getMonthsToShow: 12月から1月への年をまたぐ遷移', () => {
  const months = getMonthsToShow(baseCalendar, '2026-12-15');
  assert.equal(months[0].year, 2026);
  assert.equal(months[0].month, 12);
  assert.equal(months[0].days.length, 31);
  assert.equal(months[1].year, 2027);
  assert.equal(months[1].month, 1);
  assert.equal(months[1].days.length, 31);
});

test('getMonthsToShow: うるう年の2月は29日', () => {
  const months = getMonthsToShow(baseCalendar, '2028-02-10');
  assert.equal(months[0].month, 2);
  assert.equal(months[0].days.length, 29);
});

test('getTodayInJST: JSTの日付境界をまたぐ瞬間を正しく判定する', () => {
  const beforeMidnightJST = new Date('2026-10-19T14:30:00Z'); // JST 23:30（同日）
  const afterMidnightJST = new Date('2026-10-19T15:30:00Z'); // JST 翌日00:30
  assert.equal(getTodayInJST(beforeMidnightJST), '2026-10-19');
  assert.equal(getTodayInJST(afterMidnightJST), '2026-10-20');
});

test('renderCalendarHTML: 各日の日付とステータスのクラスを含む', () => {
  const months = getMonthsToShow(
    { ...baseCalendar, confirmed_until: '2026-10-01', exceptions: [] },
    '2026-10-01'
  );
  const html = renderCalendarHTML(months);
  assert.ok(html.includes('data-date="2026-10-01"'));
  assert.ok(html.includes('calendar__day--closed'));
  assert.ok(html.includes('calendar__day--provisional'));
});
