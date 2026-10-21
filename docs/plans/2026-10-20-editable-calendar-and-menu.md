# 編集可能な営業カレンダーとメニュー Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a non-technical editor change the shop's opening calendar and menu through a web form (Decap CMS), with every change landing as a GitHub commit, while the public page always shows the calendar resolved against the visitor's real current date (Asia/Tokyo).

**Architecture:** Eleventy builds `src/` + `content/*.yml`/`*.md` into `public/`. The calendar's open/closed logic lives in one dependency-free, UMD-style JS module (`src/calendar.js`) that is loaded unmodified as a plain `<script>` tag both on the public page and inside the Decap CMS preview pane, so what the editor sees in the live preview is pixel-for-pixel what gets published — no server/build-time date baked in. Decap's GitHub backend authenticates through a small OAuth proxy running on a dedicated Cloudflare Worker in `worker/`.

**Tech Stack:** Eleventy (`@11ty/eleventy`), Nunjucks templates, `js-yaml`, `markdown-it`, Decap CMS (loaded from CDN, no bundler), Cloudflare Pages, Cloudflare Workers, Node's built-in `node:test` runner.

**Spec:** `spec.md` (section "計画中: 編集可能な営業カレンダーとメニュー")

## Global Constraints

- 日本語のみ。UI文言・メモ・エラーメッセージもすべて日本語。
- 公開ページ（`/`, `/menu/`）には計測・トラッキング目的のサードパーティリソースを読み込まない。`admin/` は編集者専用で、この制約の対象外（Decap CMS を CDN から読み込む）。
- `src/calendar.js` と `src/calendar-render.js` は純粋関数のみを公開する。関数内で `Date.now()` や `new Date()`（引数なし）を呼ばない。「今日」は常に呼び出し側から引数で渡す。
- カレンダーの表示範囲は常に「今月＋来月」の2か月だけ（`confirmed_until` がもっと先でもそれ以上は表示しない）。
- `weekly_pattern` に曜日のキーが欠けていたら `closed` とみなす（安全側のデフォルト）。
- `confirmed_until` が未設定なら、表示するすべての日を「未確定」として扱う。
- `exceptions` に同じ日付が複数あれば、配列の最後の要素を優先する。
- 日付の比較・曜日の算出は `"YYYY-MM-DD"` 文字列と UTC 解析で行う（訪問者の端末のタイムゾーンに影響されないようにする）。「今日」そのものは Asia/Tokyo のローカル日付を使う。

## Review Focus

- 「今日」の判定が端末のタイムゾーンに関係なく Asia/Tokyo の日付になっているか（深夜0時〜9時のあいだ、UTCでの日付とJSTでの日付がずれる）→ Task 2 の `getTodayInJST` テストで固定する。
- `confirmed_until` が未設定のとき、確定しているかのように見せていないか → Task 2 の `resolveDay` テストで固定する。
- `weekly_pattern` にキーが欠けている曜日があってもクラッシュせず、安全側（`closed`）に倒れるか → Task 2 のテストで固定する。
- `exceptions` に同じ日付が重複登録されても、どちらが勝つか決定的で、クラッシュしないか → Task 2 のテストで固定する。
- 12月→1月のような年をまたぐ月の遷移や、28〜31日と長さの違う月でも日付の並びが崩れないか（オフバイワン）→ Task 2 の `getMonthsToShow` テストで固定する。

---

## Task 1: Eleventy への移行（表示内容は現状維持）

既存の手書き `public/index.html` を、Eleventy が生成する静的ページに置き換える。この時点では内容は今のサイトと同じ（カレンダーもメニューもまだ無い）。ゴールは「ビルドパイプラインが動く」ことの確認。

**Files:**
- Create: `package.json`
- Create: `.eleventy.js`
- Create: `src/_includes/base.njk`
- Create: `src/index.njk`
- Create: `src/style.css`（`public/style.css` の内容をそのまま移動）
- Create: `src/assets/`（`public/assets/` の4ファイルをそのまま移動）
- Modify: `.gitignore`（`node_modules/` と `public/` を追加）
- Delete: `public/index.html`, `public/style.css`, `public/assets/`（内容は上記に移動済み。`public/` は以後ビルド生成物）
- Delete（git管理から外す）: `public/`（`git rm -r --cached public`）

**Interfaces:**
- Produces: `public/index.html`, `public/style.css`, `public/assets/*`（`npm run build` の生成物。以後のタスクが読み込む固定の出力先）

- [ ] **Step 1: package.json を作成する**

```json
{
  "name": "coffeerhythm",
  "private": true,
  "scripts": {
    "build": "eleventy",
    "serve": "eleventy --serve",
    "test": "node --test"
  },
  "dependencies": {
    "@11ty/eleventy": "^3.0.0",
    "js-yaml": "^4.1.0",
    "markdown-it": "^14.1.0"
  }
}
```

- [ ] **Step 2: 依存関係をインストールする**

Run: `npm install`
Expected: `node_modules/` が作成され、`package-lock.json` が生成される。

- [ ] **Step 3: .gitignore に node_modules と public を追加する**

`.gitignore` の内容を次のようにする：

```
.DS_Store
originals/
node_modules/
public/
```

- [ ] **Step 4: public/ を git の管理から外す（生成物化）**

Run: `git rm -r --cached public`
Expected: `public/` 以下のファイルが staging から削除される（ワーキングツリーのファイルはまだ残っている）。

- [ ] **Step 5: assets と style.css を src/ に移す**

Run: `mkdir -p src/assets && git mv public/assets/apple-touch-icon.png public/assets/favicon.png public/assets/logo.png public/assets/og.jpg src/assets/ && git mv public/style.css src/style.css`

- [ ] **Step 6: 既存の public/.DS_Store を削除する**

Run: `rm -f public/.DS_Store`

- [ ] **Step 7: レイアウト src/_includes/base.njk を作成する**

```njk
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>{{ title }}</title>
<meta name="description" content="{{ description }}">

<meta property="og:type" content="website">
<meta property="og:title" content="{{ title }}">
<meta property="og:description" content="{{ description }}">
<meta property="og:image" content="https://coffeerhythm.pages.dev/assets/og.jpg">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">

<link rel="canonical" href="https://coffeerhythm.pages.dev{{ page.url }}">
<link rel="icon" href="/assets/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="stylesheet" href="/style.css">
</head>
<body>

<header class="hero">
  <h1 class="hero__logo">
    <a href="/"><img src="/assets/logo.png" width="600" height="600" alt="珈琲リズム Coffee Rhythm"></a>
  </h1>
</header>

<main>
{{ content | safe }}
</main>

<footer class="foot">
  <div class="wrap">
    <p class="foot__name">珈琲リズム</p>
    <a class="foot__link" href="https://www.instagram.com/coffeerhythm_itoshima" target="_blank" rel="noopener">@coffeerhythm_itoshima</a>
  </div>
</footer>

</body>
</html>
```

- [ ] **Step 8: src/index.njk を作成する（現状と同じ内容）**

```njk
---
layout: base.njk
title: 珈琲リズム｜福岡県糸島市のコーヒー店
description: 福岡県糸島市神在西のコーヒー店「珈琲リズム」。
---
<section class="access">
  <div class="wrap">
    <h2 class="section-title">アクセス</h2>
    <p class="access__address">
      〒819-1148<br>
      福岡県糸島市神在西2丁目23-6 1F
    </p>
    <div class="access__links">
      <a class="btn" href="https://maps.app.goo.gl/J6tgGn87mfY3inyw6" target="_blank" rel="noopener">
        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22s7-7.1 7-12a7 7 0 1 0-14 0c0 4.9 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        Googleマップで開く
      </a>
      <a class="btn" href="https://maps.apple.com/?q=%E7%A6%8F%E5%B2%A1%E7%9C%8C%E7%B3%B8%E5%B3%B6%E5%B8%82%E7%A5%9E%E5%9C%A8%E8%A5%BF2%E4%B8%81%E7%9B%AE23-6" target="_blank" rel="noopener">
        <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22s7-7.1 7-12a7 7 0 1 0-14 0c0 4.9 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/>
        </svg>
        Appleマップで開く
      </a>
    </div>

    <!-- 店舗の座標: 33.5465637, 130.1730767（コード中でここにしか書かれていない）
         bbox は上の座標から算出した表示範囲なので、座標を直すときは bbox も更新すること。 -->
    <div class="map">
      <iframe
        src="https://www.openstreetmap.org/export/embed.html?bbox=130.1690767%2C33.5443637%2C130.1770767%2C33.5487637&amp;layer=mapnik&amp;marker=33.5465637%2C130.1730767"
        title="珈琲リズム周辺の地図" loading="lazy"></iframe>
    </div>
    <p class="map__credit">地図データ &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</p>
  </div>
</section>

<section class="instagram">
  <div class="wrap">
    <p class="note">毎月の営業カレンダーはこちらでお知らせしています。</p>
    <a class="btn" href="https://www.instagram.com/coffeerhythm_itoshima" target="_blank" rel="noopener">
      <svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="12" r="4.75" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="17.7" cy="6.3" r="1.4" fill="currentColor"/>
      </svg>
      Instagramを見る
    </a>
  </div>
</section>
```

- [ ] **Step 9: .eleventy.js を作成する**

```js
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/style.css': 'style.css' });

  return {
    dir: {
      input: 'src',
      output: 'public',
      includes: '_includes',
      data: '_data'
    }
  };
};
```

- [ ] **Step 10: 旧ファイルを削除する**

Run: `rm -f public/index.html`

- [ ] **Step 11: ビルドして内容を確認する**

Run: `npm run build`
Expected: `public/index.html`, `public/style.css`, `public/assets/*` が生成される。

Run: `grep -c '福岡県糸島市神在西2丁目23-6' public/index.html`
Expected: `1`（住所が1回出現する）

Run: `grep -c 'maps.app.goo.gl/J6tgGn87mfY3inyw6' public/index.html`
Expected: `1`

- [ ] **Step 12: ブラウザで見た目を確認する**

Run: `npm run serve`（終わったら Ctrl+C で止める）し、`http://localhost:8080/` を開いて、移行前の見た目と同じことを確認する。

- [ ] **Step 13: commit する**

```bash
git add package.json package-lock.json .eleventy.js .gitignore src public
git commit -m "Eleventyでのビルドに移行（表示内容は変更なし）"
```

---

## Task 2: カレンダーの判定ロジック（純粋関数、TDD）

`src/calendar.js`（曜日・例外・未確定の判定）と `src/calendar-render.js`（HTML文字列への変換）を、ブラウザにも Node の `node --test` にも読み込める形で作る。このタスクではまだページに組み込まない。

**Files:**
- Create: `src/calendar.js`
- Create: `src/calendar-render.js`
- Create: `test/calendar.test.js`

**Interfaces:**
- Produces:
  - `resolveDay(calendarData, dateISO) → { date, weekday, status, note, provisional }`
  - `getMonthsToShow(calendarData, todayISO) → [{ year, month, days: [dayObj, ...] }, { year, month, days: [...] }]`（必ず2要素）
  - `getTodayInJST(now = new Date()) → "YYYY-MM-DD"`
  - `renderCalendarHTML(months) → HTML文字列`
  - `calendarData` の形: `{ weekly_pattern: { monday: 'open'|'closed', ... }, confirmed_until: "YYYY-MM-DD"|undefined, exceptions: [{ date, status?, note? }, ...] }`

- [ ] **Step 1: 失敗するテストを書く**

`test/calendar.test.js`:

```js
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
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npm test`
Expected: `src/calendar.js`/`src/calendar-render.js` が存在しないため `MODULE_NOT_FOUND` で失敗する。

- [ ] **Step 3: src/calendar.js を実装する**

```js
(function (global) {
  'use strict';

  var WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function weekdayOf(dateISO) {
    var d = new Date(dateISO + 'T00:00:00Z');
    return WEEKDAYS[d.getUTCDay()];
  }

  function daysInMonth(year, month) {
    // month は1始まり（1=1月）
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDate(year, month, day) {
    return year + '-' + pad2(month) + '-' + pad2(day);
  }

  function findException(exceptions, dateISO) {
    var found;
    (exceptions || []).forEach(function (exception) {
      if (exception.date === dateISO) {
        found = exception;
      }
    });
    return found;
  }

  function resolveDay(calendarData, dateISO) {
    var weekday = weekdayOf(dateISO);
    var weeklyStatus = (calendarData.weekly_pattern || {})[weekday] || 'closed';
    var exception = findException(calendarData.exceptions, dateISO);

    var status = weeklyStatus;
    var note = '';

    if (exception) {
      if (exception.status) {
        status = exception.status;
      }
      if (exception.note) {
        note = exception.note;
      }
    }

    var confirmedUntil = calendarData.confirmed_until;
    var provisional = !confirmedUntil || dateISO > confirmedUntil;

    return {
      date: dateISO,
      weekday: weekday,
      status: status,
      note: note,
      provisional: provisional
    };
  }

  function getMonthsToShow(calendarData, todayISO) {
    var year = parseInt(todayISO.slice(0, 4), 10);
    var month = parseInt(todayISO.slice(5, 7), 10);

    var firstMonth = { year: year, month: month };
    var secondMonth = month === 12
      ? { year: year + 1, month: 1 }
      : { year: year, month: month + 1 };

    return [firstMonth, secondMonth].map(function (m) {
      var total = daysInMonth(m.year, m.month);
      var days = [];
      for (var day = 1; day <= total; day++) {
        days.push(resolveDay(calendarData, formatDate(m.year, m.month, day)));
      }
      return { year: m.year, month: m.month, days: days };
    });
  }

  function getTodayInJST(now) {
    now = now || new Date();
    var formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now);
  }

  var CoffeeRhythmCalendar = {
    resolveDay: resolveDay,
    getMonthsToShow: getMonthsToShow,
    getTodayInJST: getTodayInJST
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoffeeRhythmCalendar;
  } else {
    global.CoffeeRhythmCalendar = CoffeeRhythmCalendar;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: src/calendar-render.js を実装する**

```js
(function (global) {
  'use strict';

  var MONTH_LABELS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderDay(day) {
    var classes = ['calendar__day', 'calendar__day--' + day.status];
    if (day.provisional) {
      classes.push('calendar__day--provisional');
    }

    var dayNumber = parseInt(day.date.slice(8, 10), 10);
    var title = day.note ? ' title="' + escapeHtml(day.note) + '"' : '';

    return '<li class="' + classes.join(' ') + '" data-date="' + day.date + '"' + title + '>' +
      '<span class="calendar__day-number">' + dayNumber + '</span>' +
      '</li>';
  }

  function renderMonth(month) {
    return '<div class="calendar__month">' +
      '<h3 class="calendar__month-title">' + month.year + '年' + MONTH_LABELS[month.month] + '</h3>' +
      '<ul class="calendar__grid">' +
      month.days.map(renderDay).join('') +
      '</ul>' +
      '</div>';
  }

  function renderCalendarHTML(months) {
    return '<div class="calendar__months">' + months.map(renderMonth).join('') + '</div>';
  }

  var CoffeeRhythmCalendarRender = {
    renderCalendarHTML: renderCalendarHTML
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoffeeRhythmCalendarRender;
  } else {
    global.CoffeeRhythmCalendarRender = CoffeeRhythmCalendarRender;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `npm test`
Expected: すべてのテストが `pass` になる。

- [ ] **Step 6: commit する**

```bash
git add src/calendar.js src/calendar-render.js test/calendar.test.js
git commit -m "カレンダーの判定ロジックを純粋関数として追加"
```

---

## Task 3: 営業カレンダーをトップページに表示する

`content/calendar.yml` を追加し、Eleventy のデータファイルとして読み込み、Task 2 のモジュールを `<script>` で読み込んでブラウザ側で描画する。

**Files:**
- Create: `content/calendar.yml`
- Create: `src/_data/calendar.js`
- Modify: `.eleventy.js`（calendar.js / calendar-render.js のパススルーを追加）
- Modify: `src/index.njk`（カレンダーのセクションを追加）
- Modify: `src/style.css`（カレンダー用のCSSを追加）

**Interfaces:**
- Consumes: `CoffeeRhythmCalendar.getTodayInJST()`, `CoffeeRhythmCalendar.getMonthsToShow(calendarData, todayISO)`, `CoffeeRhythmCalendarRender.renderCalendarHTML(months)`（Task 2 で定義）
- Produces: Eleventy グローバルデータ `calendar`（`content/calendar.yml` をパースした `{ weekly_pattern, confirmed_until, exceptions }`）

- [ ] **Step 1: content/calendar.yml を作成する**

```yaml
weekly_pattern:
  monday: closed
  tuesday: open
  wednesday: open
  thursday: open
  friday: open
  saturday: open
  sunday: open

confirmed_until:

exceptions: []
```

- [ ] **Step 2: src/_data/calendar.js を作成する**

```js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

module.exports = function () {
  const filePath = path.join(__dirname, '..', '..', 'content', 'calendar.yml');
  const raw = fs.readFileSync(filePath, 'utf8');
  return yaml.load(raw);
};
```

- [ ] **Step 3: .eleventy.js に calendar.js / calendar-render.js のパススルーを追加する**

```js
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/style.css': 'style.css' });
  eleventyConfig.addPassthroughCopy({ 'src/calendar.js': 'calendar.js' });
  eleventyConfig.addPassthroughCopy({ 'src/calendar-render.js': 'calendar-render.js' });

  return {
    dir: {
      input: 'src',
      output: 'public',
      includes: '_includes',
      data: '_data'
    }
  };
};
```

- [ ] **Step 4: src/index.njk の先頭にカレンダーのセクションを追加する**

`<section class="access">` の直前に挿入:

```njk
<section class="calendar">
  <div class="wrap">
    <h2 class="section-title">営業カレンダー</h2>
    <div id="calendar-root" class="calendar__root">
      <p class="note">カレンダーを読み込み中です…</p>
    </div>
    <p class="calendar__legend">グレーの日付は未確定です。最新情報は<a href="https://www.instagram.com/coffeerhythm_itoshima" target="_blank" rel="noopener">Instagram</a>でもご確認いただけます。</p>
  </div>
</section>
```

ファイルの末尾（`</section>` の instagram セクションの後）に追加:

```njk
<script src="/calendar.js"></script>
<script src="/calendar-render.js"></script>
<script>
(function () {
  var data = {{ calendar | dump | safe }};
  var today = window.CoffeeRhythmCalendar.getTodayInJST();
  var months = window.CoffeeRhythmCalendar.getMonthsToShow(data, today);
  document.getElementById('calendar-root').innerHTML =
    window.CoffeeRhythmCalendarRender.renderCalendarHTML(months);
})();
</script>
```

- [ ] **Step 5: src/style.css の末尾にカレンダー用のCSSを追加する**

```css
/* ---------- 営業カレンダー ---------- */

.calendar__root { margin-bottom: 1rem; }

.calendar__months {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.calendar__month-title {
  margin: 0 0 .75rem;
  font-size: 1rem;
  letter-spacing: .06em;
}

.calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: .35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.calendar__day {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: .5rem;
  font-size: .875rem;
  background: rgba(17, 71, 39, .08);
}

.calendar__day--open { background: rgba(17, 71, 39, .12); }

.calendar__day--closed {
  background: transparent;
  color: rgba(26, 21, 18, .4);
}

.calendar__day--provisional { opacity: .55; }

.calendar__legend {
  margin: 1rem 0 0;
  font-size: .8125rem;
  color: rgba(26, 21, 18, .6);
}
```

- [ ] **Step 6: ビルドして確認する**

Run: `npm run build`
Expected: `public/calendar.js`, `public/calendar-render.js` が生成され、`public/index.html` に `calendar-root` が含まれる。

Run: `npm run serve` し `http://localhost:8080/` を開いて、営業カレンダーのセクションに今月・来月のマス目が表示され、月曜が薄く（休業）表示されることを目視で確認する。

- [ ] **Step 7: commit する**

```bash
git add content/calendar.yml src/_data/calendar.js .eleventy.js src/index.njk src/style.css
git commit -m "トップページに営業カレンダーを表示する"
```

---

## Task 4: メニューページ

`content/menu.md`（自由記述の Markdown）を `/menu/` ページとして表示する。

**Files:**
- Create: `content/menu.md`
- Create: `src/_data/menu.js`
- Create: `src/menu.njk`
- Modify: `.eleventy.js`（markdown-it は Node 側のみなのでパススルー不要。変更なし）
- Modify: `src/index.njk`（メニューへのリンクを追加）

**Interfaces:**
- Produces: Eleventy グローバルデータ `menu.html`（`content/menu.md` を HTML に変換した文字列）

- [ ] **Step 1: content/menu.md を作成する**

```md
メニューは準備中です。
```

- [ ] **Step 2: src/_data/menu.js を作成する**

```js
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();

module.exports = function () {
  const filePath = path.join(__dirname, '..', '..', 'content', 'menu.md');
  const raw = fs.readFileSync(filePath, 'utf8');
  return { html: md.render(raw) };
};
```

- [ ] **Step 3: src/menu.njk を作成する**

```njk
---
layout: base.njk
title: メニュー｜珈琲リズム
description: 珈琲リズムのメニューです。
permalink: /menu/
---
<section class="menu">
  <div class="wrap">
    <h2 class="section-title">メニュー</h2>
    <div class="menu__body">
      {{ menu.html | safe }}
    </div>
    <p><a class="btn" href="/">トップへ戻る</a></p>
  </div>
</section>
```

- [ ] **Step 4: src/index.njk にメニューへのリンクを追加する**

`<section class="instagram">` の直前に挿入:

```njk
<section class="menu-link">
  <div class="wrap">
    <p class="note">メニューはこちらでご案内しています。</p>
    <a class="btn" href="/menu/">メニューを見る</a>
  </div>
</section>
```

- [ ] **Step 5: ビルドして確認する**

Run: `npm run build`
Expected: `public/menu/index.html` が生成される。

Run: `npm run serve` し `http://localhost:8080/menu/` を開いて「メニューは準備中です。」が表示され、「トップへ戻る」でトップページに戻れることを確認する。トップページの「メニューを見る」ボタンからも `/menu/` に遷移できることを確認する。

- [ ] **Step 6: commit する**

```bash
git add content/menu.md src/_data/menu.js src/menu.njk src/index.njk
git commit -m "メニューページを追加する"
```

---

## Task 5: Decap CMS の管理画面

`admin/` に Decap CMS を設置する。GitHub backend、`editorial_workflow`、カレンダーのプレビューは Task 2 のモジュールをそのまま再利用する。

**Files:**
- Create: `admin/config.yml`
- Create: `admin/index.html`
- Create: `admin/preview-templates/calendar.js`
- Modify: `.eleventy.js`（`admin/` のパススルーを追加）

**Interfaces:**
- Consumes: `CoffeeRhythmCalendar.getTodayInJST()`, `CoffeeRhythmCalendar.getMonthsToShow(calendarData, todayISO)`, `CoffeeRhythmCalendarRender.renderCalendarHTML(months)`（Task 2。production と全く同じファイルを `/calendar.js` 経由で読み込む）

- [ ] **Step 1: .eleventy.js に admin/ のパススルーを追加する**

```js
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/style.css': 'style.css' });
  eleventyConfig.addPassthroughCopy({ 'src/calendar.js': 'calendar.js' });
  eleventyConfig.addPassthroughCopy({ 'src/calendar-render.js': 'calendar-render.js' });
  eleventyConfig.addPassthroughCopy({ admin: 'admin' });

  return {
    dir: {
      input: 'src',
      output: 'public',
      includes: '_includes',
      data: '_data'
    }
  };
};
```

- [ ] **Step 2: admin/config.yml を作成する**

Worker のデプロイ先URL（Task 6）が確定するまで `base_url` はプレースホルダーのままにし、Task 6 の完了後に実際のURLへ書き換える。

```yaml
backend:
  name: github
  repo: alecrem/coffeerhythm
  branch: main
  base_url: https://coffeerhythm-oauth.YOUR_SUBDOMAIN.workers.dev
  auth_endpoint: auth

publish_mode: editorial_workflow

media_folder: content/images
public_folder: /assets

collections:
  - name: calendar
    label: 営業カレンダー
    files:
      - name: calendar
        label: 営業カレンダー
        file: content/calendar.yml
        fields:
          - label: 休みの曜日（デフォルト）
            name: weekly_pattern
            widget: object
            fields:
              - { label: 月曜日, name: monday, widget: select, options: [open, closed] }
              - { label: 火曜日, name: tuesday, widget: select, options: [open, closed] }
              - { label: 水曜日, name: wednesday, widget: select, options: [open, closed] }
              - { label: 木曜日, name: thursday, widget: select, options: [open, closed] }
              - { label: 金曜日, name: friday, widget: select, options: [open, closed] }
              - { label: 土曜日, name: saturday, widget: select, options: [open, closed] }
              - { label: 日曜日, name: sunday, widget: select, options: [open, closed] }
          - label: この日付まで確定
            name: confirmed_until
            widget: date
            required: false
            format: 'YYYY-MM-DD'
            date_format: 'YYYY-MM-DD'
            time_format: false
          - label: 例外（休み・特別営業・時間変更）
            name: exceptions
            widget: list
            required: false
            fields:
              - { label: 日付, name: date, widget: date, format: 'YYYY-MM-DD', date_format: 'YYYY-MM-DD', time_format: false }
              - { label: 状態（空欄なら通常どおり）, name: status, widget: select, options: [open, closed], required: false }
              - { label: メモ（例：15時に閉店します）, name: note, widget: string, required: false }

  - name: menu
    label: メニュー
    files:
      - name: menu
        label: メニュー
        file: content/menu.md
        fields:
          - { label: 本文, name: body, widget: markdown }
```

- [ ] **Step 3: admin/index.html を作成する**

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>管理画面｜珈琲リズム</title>
  <meta name="robots" content="noindex">
</head>
<body>
  <script src="https://unpkg.com/decap-cms@^3.3.0/dist/decap-cms.js"></script>
  <script src="/calendar.js"></script>
  <script src="/calendar-render.js"></script>
  <script src="preview-templates/calendar.js"></script>
</body>
</html>
```

- [ ] **Step 4: admin/preview-templates/calendar.js を作成する**

```js
var CalendarPreview = createClass({
  render: function () {
    var entry = this.props.entry;
    var data = entry.getIn(['data']).toJS();
    var today = window.CoffeeRhythmCalendar.getTodayInJST();
    var months = window.CoffeeRhythmCalendar.getMonthsToShow(data, today);
    var html = window.CoffeeRhythmCalendarRender.renderCalendarHTML(months);
    return h('div', { dangerouslySetInnerHTML: { __html: html } });
  }
});

CMS.registerPreviewTemplate('calendar', CalendarPreview);
```

- [ ] **Step 5: ビルドして確認する**

Run: `npm run build`
Expected: `public/admin/config.yml`, `public/admin/index.html`, `public/admin/preview-templates/calendar.js` が生成される。

Run: `npm run serve` し `http://localhost:8080/admin/` を開いて、ログイン画面（GitHub でログインのボタン）が表示されることを確認する（Worker が無いためログイン自体は Task 6 まで失敗する）。

- [ ] **Step 6: commit する**

```bash
git add .eleventy.js admin
git commit -m "Decap CMSの管理画面を追加する"
```

---

## Task 6: OAuth プロキシ（Cloudflare Worker）

`worker/` に、Decap CMS の GitHub backend 用の OAuth プロキシを作る。この repo 専用（他の CMS と共有しない）。

**Files:**
- Create: `worker/wrangler.toml`
- Create: `worker/package.json`
- Create: `worker/src/index.js`
- Modify: `admin/config.yml`（`base_url` を実際の Worker の URL に差し替える。Step 6 で実施）

**Interfaces:**
- Produces: `GET /auth`（GitHub の認可画面へリダイレクト）, `GET /callback`（トークン交換後、`window.opener.postMessage` で Decap に通知するHTML）

- [ ] **Step 1: GitHub OAuth App を作成する**

GitHub の Settings → Developer settings → OAuth Apps → New OAuth App で、
- Homepage URL: `https://coffeerhythm.pages.dev`
- Authorization callback URL: `https://coffeerhythm-oauth.<あなたのsubdomain>.workers.dev/callback`
を設定し、Client ID と Client Secret を控える（この2つは repo にコミットしない）。

- [ ] **Step 2: worker/wrangler.toml を作成する**

```toml
name = "coffeerhythm-oauth"
main = "src/index.js"
compatibility_date = "2026-10-20"
```

- [ ] **Step 3: worker/package.json を作成する**

```json
{
  "name": "coffeerhythm-oauth",
  "private": true,
  "scripts": {
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 4: worker/src/index.js を実装する**

```js
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(name + '=([^;]+)'));
  return match ? match[1] : null;
}

async function handleAuth(request, env) {
  const url = new URL(request.url);
  const redirectUri = url.origin + '/callback';
  const state = crypto.randomUUID();

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'repo,user');
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Set-Cookie': 'oauth_state=' + state + '; HttpOnly; Secure; Path=/; Max-Age=600; SameSite=Lax'
    }
  });
}

function renderCallbackPage(payload) {
  return '<!doctype html><html><body><script>' +
    '(function () {' +
    'function receiveMessage(e) {' +
    'window.opener.postMessage(' + JSON.stringify(payload) + ', e.origin);' +
    'window.removeEventListener("message", receiveMessage, false);' +
    '}' +
    'window.addEventListener("message", receiveMessage, false);' +
    'window.opener.postMessage("authorizing:github", "*");' +
    '})();' +
    '</script></body></html>';
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = readCookie(request, 'oauth_state');

  if (!code || !state || state !== expectedState) {
    return new Response(renderCallbackPage('authorization:github:error:' + JSON.stringify({ message: 'invalid_state' })), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code: code
    })
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return new Response(renderCallbackPage('authorization:github:error:' + JSON.stringify({ message: tokenData.error || 'token_exchange_failed' })), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const successPayload = 'authorization:github:success:' + JSON.stringify({ token: tokenData.access_token, provider: 'github' });
  return new Response(renderCallbackPage(successPayload), {
    headers: { 'Content-Type': 'text/html' }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/auth') {
      return handleAuth(request, env);
    }
    if (url.pathname === '/callback') {
      return handleCallback(request, env);
    }
    return new Response('Not found', { status: 404 });
  }
};
```

- [ ] **Step 5: Worker をデプロイし、secret を設定する**

Run: `cd worker && npx wrangler login`（初回のみ、ブラウザでCloudflareにログイン）
Run: `npx wrangler deploy`
Run: `npx wrangler secret put GITHUB_OAUTH_CLIENT_ID`（Step 1 の Client ID を入力）
Run: `npx wrangler secret put GITHUB_OAUTH_CLIENT_SECRET`（Step 1 の Client Secret を入力）

デプロイ後に表示される実際のURL（`https://coffeerhythm-oauth.<subdomain>.workers.dev`）を控える。

- [ ] **Step 6: admin/config.yml の base_url を実際のURLに更新する**

`admin/config.yml` の `base_url: https://coffeerhythm-oauth.YOUR_SUBDOMAIN.workers.dev` を、Step 5 で確認した実際のURLに書き換える。

- [ ] **Step 7: 手動でログインを確認する（自動テスト不可：実際のGitHub OAuthとの通信が必要）**

Cloudflare Pages 側のデプロイが済んだ後、`https://coffeerhythm.pages.dev/admin/` を開き、「Login with GitHub」でログインできること、カレンダー・メニューのコレクションが表示されることを確認する。

- [ ] **Step 8: commit する**

```bash
git add worker admin/config.yml
git commit -m "Decap CMS用のOAuthプロキシ(Cloudflare Worker)を追加する"
```

---

## Task 7: ドキュメントを更新する

`spec.md` の「計画中」セクションを実装後の実際の状態に合わせて書き直し、`README.md` に新しいビルド手順と編集ワークフローを追加する。

**Files:**
- Modify: `spec.md`
- Modify: `README.md`

**Interfaces:**
- (ドキュメントのみ。コードのインターフェースは生成しない)

- [ ] **Step 1: spec.md の「制約」を更新する**

「できるだけ手をかけない。ビルドも依存関係も JavaScript も CI もなし。」の行を削除し、代わりに次の説明を追加する：

```markdown
- **営業カレンダーとメニューは Decap CMS で編集できる。** Eleventy でビルドし、
  カレンダーの判定ロジック（`src/calendar.js`）は本番ページと Decap のプレビューで
  同じファイルを共有する。詳細は下の節を参照。
```

- [ ] **Step 2: spec.md の「自動テストはない」を書き直す**

見出しを「## テスト」に変え、次の内容に置き換える：

```markdown
## テスト

`src/calendar.js` と `src/calendar-render.js` は純粋関数なので、`node --test`
（`npm test`）で決定的にテストできる。「今日」の日付は常に引数として渡し、関数内で
`Date.now()` を読まない。テストは `test/calendar.test.js` にある。

それ以外（テンプレート、CSS、Decap CMS の設定、OAuth Worker）はロジックを持たない、
または実際のGitHub/Cloudflareとの通信が前提のため、自動テストの対象にしていない。
ビルド・目視・手動でのログイン確認で確かめる。
```

- [ ] **Step 3: spec.md の「計画中」セクションを削除し、変更履歴に追記する**

「## 計画中: 編集可能な営業カレンダーとメニュー」セクション全体を削除し、「## 変更履歴」の下に新しい項目を追加する：

```markdown
### 2026-10-20: 編集可能な営業カレンダーとメニューを追加

Decap CMS（GitHub backend, editorial_workflow）で営業カレンダーとメニューを
編集可能にした。Eleventy を導入し、`public/` をビルド生成物にした。カレンダーの
状態計算は `src/calendar.js` に集約し、本番ページと Decap の管理画面プレビューで
共有している。OAuth プロキシは `worker/` サブフォルダの Cloudflare Worker（この
repo 専用）。
```

- [ ] **Step 4: README.md のローカル実行手順を更新する**

「## ローカルで見る」を次に置き換える：

```markdown
## ローカルで見る

```sh
npm install
npm run serve
```

`http://localhost:8080/` を開く。
```

- [ ] **Step 5: README.md の構成を更新する**

「## 構成」を次に置き換える：

```markdown
## 構成

```
content/            calendar.yml, menu.md（Decap CMSが編集する対象）
src/                Eleventyの入力（テンプレート、calendar.js、CSS、画像）
admin/              Decap CMS（config.yml, index.html, preview-templates/）
worker/             OAuthプロキシ（Cloudflare Worker、このrepo専用、別デプロイ）
public/             Eleventyの出力。生成物のためgit管理外
test/               calendar.jsのテスト（node --test）
logo/               画像の生成に使うロゴの元データ
```
```

- [ ] **Step 6: README.md の「お店の情報を更新する」を書き直す**

次の内容に置き換える：

```markdown
## お店の情報を更新する

技術者でない場合は `/admin/` の管理画面（Decap CMS）から、営業カレンダーとメニューを
編集できる。保存するとブランチとPRが作られ、Cloudflare Pagesのプレビュー URL で
確認した上で「公開」すると main にマージされる。

| 項目 | 場所 |
|---|---|
| 営業カレンダー | `/admin/` の「営業カレンダー」、または直接 `content/calendar.yml` |
| メニュー | `/admin/` の「メニュー」、または直接 `content/menu.md` |
| 住所 | `src/index.njk` の `.access__address` 内 |
| Instagram のリンク | `src/_includes/base.njk` と `src/index.njk` |
| 地図の位置 | `src/index.njk` の `<iframe>` の `src`。座標は直前のコメントに記載 |
| Googleマップのボタンのリンク | `src/index.njk` の「Googleマップで開く」ボタンの `href` |
```

- [ ] **Step 7: README.md に Cloudflare Pages の設定変更を追記する**

「## Cloudflare Pages の設定」の内容を次に置き換える：

```markdown
## Cloudflare Pages の設定

- **Framework preset**: `None`
- **Build command**: `npx @11ty/eleventy`
- **Build output directory**: `public`
```

- [ ] **Step 8: README.md に Worker の節を追加する**

「## Cloudflare Pages の設定」の後に追加：

```markdown
## OAuth Worker（Decap CMSのログイン用）

`worker/` は Decap CMS が GitHub にログインするための OAuth プロキシ。Cloudflare
Pages とは別に `cd worker && npx wrangler deploy` でデプロイする。`GITHUB_OAUTH_CLIENT_ID`
と `GITHUB_OAUTH_CLIENT_SECRET` は `npx wrangler secret put` で設定し、repo には
含めない。
```

- [ ] **Step 9: commit する**

```bash
git add spec.md README.md
git commit -m "spec.mdとREADME.mdを実装内容に合わせて更新する"
```

---

## 完了確認

- [ ] `npm test` が全て pass する
- [ ] `npm run build` がエラーなく完了する
- [ ] `npm run serve` でトップページとメニューページが見た目どおりに表示される
- [ ] `/admin/` が開き、Worker デプロイ後にログインできる
