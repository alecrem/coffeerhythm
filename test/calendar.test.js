const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveDay,
  getMonthsToShow,
  getTodayInJST,
  normalizeDate,
  normalizeCalendarData
} = require('../src/calendar.js');
const { renderCalendarHTML, renderDay, renderParagraphs } = require('../src/calendar-render.js');

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

test('normalizeDate: DateをYYYY-MM-DDの文字列にする', () => {
  assert.equal(normalizeDate(new Date('2026-12-30T00:00:00.000Z')), '2026-12-30');
  assert.equal(normalizeDate('2026-12-30'), '2026-12-30');
});

test('normalizeDate: 月日が1桁でも0で埋める', () => {
  assert.equal(normalizeDate(new Date('2026-01-05T00:00:00.000Z')), '2026-01-05');
});

test('normalizeCalendarData: js-yamlがDateで読んだ日付でも文字列の場合と同じ結果になる', () => {
  // js-yaml は引用符なしの `2026-12-30` を Date として読む。
  const fromYaml = {
    ...baseCalendar,
    confirmed_until: new Date('2026-12-31T00:00:00.000Z'),
    exceptions: [{ date: new Date('2026-12-30T00:00:00.000Z'), status: 'closed', note: '年末休業' }]
  };
  const asStrings = {
    ...baseCalendar,
    confirmed_until: '2026-12-31',
    exceptions: [{ date: '2026-12-30', status: 'closed', note: '年末休業' }]
  };

  const normalized = resolveDay(normalizeCalendarData(fromYaml), '2026-12-30');
  assert.deepEqual(normalized, resolveDay(normalizeCalendarData(asStrings), '2026-12-30'));
  assert.equal(normalized.status, 'closed');
  assert.equal(normalized.provisional, false);
});

test('normalizeCalendarData: 正規化しないとDateの例外は取りこぼされる（バグの再現）', () => {
  const fromYaml = {
    ...baseCalendar,
    exceptions: [{ date: new Date('2026-12-30T00:00:00.000Z'), status: 'closed', note: '年末休業' }]
  };
  assert.equal(resolveDay(fromYaml, '2026-12-30').status, 'open');
});

test('normalizeCalendarData: 元のオブジェクトを書き換えない', () => {
  const exception = { date: new Date('2026-12-30T00:00:00.000Z'), status: 'closed' };
  const data = { ...baseCalendar, exceptions: [exception] };
  normalizeCalendarData(data);
  assert.ok(exception.date instanceof Date);
});

test('normalizeCalendarData: confirmed_untilが未設定なら未設定のまま', () => {
  const normalized = normalizeCalendarData({ ...baseCalendar, confirmed_until: undefined });
  assert.equal(normalized.confirmed_until, undefined);
  assert.deepEqual(normalized.exceptions, []);
});

test('normalizeCalendarData: 空のデータでも壊れない', () => {
  const normalized = normalizeCalendarData(undefined);
  assert.deepEqual(normalized.exceptions, []);
  assert.equal(resolveDay(normalized, '2026-10-01').status, 'closed');
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

test('renderCalendarHTML: 曜日の見出しは月曜始まりの順で並ぶ', () => {
  const months = getMonthsToShow(baseCalendar, '2026-10-01');
  const html = renderCalendarHTML(months);
  assert.ok(html.includes('calendar__weekday-row'));
  const rowMatch = html.match(/<div class="calendar__weekday-row"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(rowMatch);
  const labels = rowMatch[1].match(/<span class="calendar__weekday[^"]*">(.)<\/span>/g).map((s) => s.replace(/<[^>]+>/g, ''));
  assert.deepEqual(labels, ['月', '火', '水', '木', '金', '土', '日']);
});

test('renderCalendarHTML: 日曜の見出しと日付には専用のクラスがつく（休の文字色は変えない）', () => {
  const months = getMonthsToShow(baseCalendar, '2026-11-01'); // 2026-11-01 は日曜日
  const html = renderCalendarHTML(months);
  assert.ok(html.includes('<span class="calendar__weekday calendar__weekday--sunday">日</span>'));
  assert.ok(html.includes('<span class="calendar__day-number calendar__day-number--sunday">1</span>'));
  assert.ok(!html.includes('calendar__day-status--sunday'));
});

test('renderCalendarHTML: 1日の曜日の分だけ空のマスを先頭に置く（木曜始まり）', () => {
  // 2026-10-01 は木曜日（月曜始まりで4番目、インデックス3）
  const months = getMonthsToShow(baseCalendar, '2026-10-01');
  const monthHtml = renderCalendarHTML(months).split('calendar__month-title')[1];
  const emptyCells = monthHtml.split('calendar__day--empty').length - 1;
  assert.equal(emptyCells, 3);
  assert.ok(monthHtml.indexOf('calendar__day--empty') < monthHtml.indexOf('data-date="2026-10-01"'));
});

test('renderCalendarHTML: 月初が日曜日なら空のマスを6個置く（月曜始まりで最後の列）', () => {
  const months = getMonthsToShow(baseCalendar, '2026-11-01'); // 2026-11-01 は日曜日
  const html = renderCalendarHTML(months).split('calendar__month-title')[1];
  const emptyCells = html.split('calendar__day--empty').length - 1;
  assert.equal(emptyCells, 6);
});

test('renderDay: メモはtitle属性だけでなく本文としても表示する', () => {
  const html = renderDay(resolveDay(
    { ...baseCalendar, exceptions: [{ date: '2026-10-01', note: '15時に閉店します' }] },
    '2026-10-01'
  ));
  assert.ok(html.includes('title="15時に閉店します"'));
  assert.ok(html.includes('<span class="calendar__day-note">15時に閉店します</span>'));
});

test('renderDay: メモのHTMLをエスケープする', () => {
  const html = renderDay({
    date: '2026-10-01',
    weekday: 'thursday',
    status: 'open',
    note: '<script>alert("x")</script>',
    provisional: false
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renderDay: 休業日には「休」を表示する', () => {
  const html = renderDay(resolveDay(baseCalendar, '2026-10-05')); // 月曜日は休み
  assert.ok(html.includes('>休</span>'));
});

test('renderDay: 想定外のstatusはclass属性にそのまま入らない', () => {
  const html = renderDay({
    date: '2026-10-01',
    weekday: 'thursday',
    status: 'open" onmouseover="x',
    note: '',
    provisional: false
  });
  assert.ok(!html.includes('onmouseover'));
  assert.ok(html.includes('calendar__day--closed'));
});

test('renderParagraphs: 空行区切りで段落を分け、段落内の改行はbrにする', () => {
  const html = renderParagraphs('1行目\n2行目\n\n3行目');
  assert.equal(html, '<p>1行目<br>2行目</p><p>3行目</p>');
});

test('renderParagraphs: HTMLをエスケープする（太字記法などはそのまま文字として出す）', () => {
  const html = renderParagraphs('**太字のつもり** <script>alert(1)</script>');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('**太字のつもり**'));
});

test('renderParagraphs: 空文字・未設定は空文字を返す', () => {
  assert.equal(renderParagraphs(''), '');
  assert.equal(renderParagraphs(undefined), '');
});

test('renderCalendarHTML: hours_noteは今月のカレンダーの下にだけ表示する', () => {
  const months = getMonthsToShow(baseCalendar, '2026-10-01');
  const html = renderCalendarHTML(months, '営業時間 10:00〜17:00 (L.O. 16:30)');
  const monthBlocks = html.split('calendar__month-title');
  assert.ok(monthBlocks[1].includes('calendar__hours-note'));
  assert.ok(monthBlocks[1].includes('営業時間 10:00〜17:00 (L.O. 16:30)'));
  assert.ok(!monthBlocks[2].includes('calendar__hours-note'));
});

test('renderCalendarHTML: hours_noteが無ければ何も追加しない', () => {
  const months = getMonthsToShow(baseCalendar, '2026-10-01');
  const html = renderCalendarHTML(months);
  assert.ok(!html.includes('calendar__hours-note'));
});

test('renderDay: 各日にスクリーンリーダー向けの曜日テキストを入れる', () => {
  const html = renderDay(resolveDay(baseCalendar, '2026-10-01')); // 木曜日
  assert.ok(html.includes('<span class="sr-only">木曜日</span>'));
});

test('renderDay: 営業中の「営業」ラベルは読み上げ用のみ、休業中の「休」は画面にも出す', () => {
  const openDay = renderDay(resolveDay(baseCalendar, '2026-10-01')); // 営業
  const closedDay = renderDay(resolveDay(baseCalendar, '2026-10-05')); // 休業（月曜）
  assert.ok(openDay.includes('calendar__day-status calendar__day-status--open sr-only'));
  assert.ok(closedDay.includes('calendar__day-status calendar__day-status--closed">'));
  assert.ok(!closedDay.includes('calendar__day-status--closed sr-only'));
});

test('renderDay: 未確定の日はスクリーンリーダー向けに「未確定」と伝える', () => {
  const provisionalDay = renderDay(resolveDay(baseCalendar, '2026-11-20')); // confirmed_untilより後
  const confirmedDay = renderDay(resolveDay(baseCalendar, '2026-10-01')); // confirmed_untilより前
  assert.ok(provisionalDay.includes('<span class="sr-only">未確定</span>'));
  assert.ok(!confirmedDay.includes('未確定'));
});
